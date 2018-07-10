---
title: "KustomizeでKubernetes YAMLを管理する"
date: 2018-07-10T09:34:18+09:00
---


[Kubernetes YAMLの壁](https://deeeet.com/writing/2018/01/10/kubernetes-yaml/)で述べたようにKubernetesのYAMLをどう管理するかは悩ましい問題だ．

## Declarativeであること

Declarative ConfigurationはKubernetesの重要な機能の一つだ．KubernetesユーザはKubernetes APIに対してあるべきDesiredな状態を宣言（Declare）しKubernetesはその状態になるように動き続ける．例えばユーザが「Podを5つ動かす」という状態を宣言するとKubernetesはそれを受け「Podが5つ動いている状態」を維持するように動く．

Declarative configurationの逆のアプローチがImperative configurationだ．ユーザは一連の動作を全て指示する．例えばPodを5つ立てたいならその状態になるために必要な動作を1つ1つ指示する．Imperative configurationは理解しやすい，「これをして，これをして...」と書くだけでありDeclarativeの複雑なSyntaxを理解する必要はない．Declarative configurationが強力なのは「あるべき状態」を伝えられることだ．Kubernetesはそのあるべき状態を理解できるのでユーザのインタラクションと独立してその状態へ「自律的に」動くことができる．つまり問題や障害があっても自分でそれを直すことができる（Self-healing）．より詳しくは[Level Triggering and Reconciliation in Kubernetes](https://hackernoon.com/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d)を読むと良い．

## GitOps

Declarative Configurationの大きな利点の一つはGitでバージョン管理できるところだ．つまり変更をPull Requesでレビューし変更の履歴を残すことができる．そしてGitを「Source of truth」としてCI/CD workflowを構築することができる（もともとあったものに名前がついただけだが最近はこれを[GitOps](https://www.weave.works/blog/gitops-operations-by-pull-request)と呼ぶ）．

## kubectlの問題

既存の`kubectl`コマンド「のみ」ではこのGitOpsを実現するのは難しい．例えば`Secret`リソースをBinaryファイルから作成するには，まずBinaryファイルをBase64でエンコードしそこから`Secret`用のYAMLを作成する必要がある．この場合Source of truthはBinaryファイルでありYAMLファイルではないため別途スクリプトを準備して2つのファイルを関連させなければならない．これは`ConfigMap`リソースの管理においても同様である．

もちろん`kubectl create`コマンドとそのオプションを使うこともできるがそれはImperativeなワークフローである．

## YAML管理の問題

近年の多くのOSSツールはKubernetesにデプロイするためのYAMLファイルが一緒に提供されている．テストでそれを使う場合はそのまま利用すれば良いことが多いが会社などで利用する場合は環境に合わせたカスタマイズが必要である．例えばCPUやメモリを使いすぎないように適切なResource Limit/Requestを設定したり内部ツールのためにLabelやAnnotationを別途付与する必要がある．

また本番環境だけではなく開発環境用のYAMLファイルも準備するのも普通であるが，多くの場合それらの設定は同じにはならない．例えばResource limitは開発環境では少なめに設定するのが普通だと思う．

既存の`kubectl`コマンドのみを使うのであれば愚直に共通の設定を含んだ複数のYAMLファイルを管理するしかない．共通部分の設定変更に漏れが生じることは避けられないしUpstreamのYAMLファイルの変更の追従も難しい．

[Kubernetes YAMLの壁](https://deeeet.com/writing/2018/01/10/kubernetes-yaml/)で紹介したHelmなどを使えばこの問題をある程度解決できるが，HelmのTemplate機構だと変更したいYAMLのフィールドが変数として公開されている必要がある... 

## Kustomize

これらの問題を解決するために登場したのが[kustomize](https://github.com/kubernetes-sigs/kustomize)である．`kustomize`は[SIG-CLI](https://github.com/kubernetes/community/tree/master/sig-cli)のサブプロジェクトであり将来的には`kubectl`に統合される前提で開発されている（Goにおける`vgo`のような開発スタイル）．上で述べた問題などは[KEP](https://github.com/kubernetes/community/blob/master/keps/sig-cli/0008-kustomize.md)や[公式ブログ](https://kubernetes.io/blog/2018/05/29/introducing-kustomize-template-free-configuration-customization-for-kubernetes/)で詳細に紹介されている．

`Kustomize`はYAMLファイルのDeclarative管理を推し進めReusabilityとCustomizabilityを高めるツールである．

## Kustomizeの使い方

基本はGithubのREADMEやExampleを読むのが一番良いのでここでは簡単に概要だけをまとめる．

### kustomization ファイルを使う

まず`kustomization.yaml`を準備しapplicationをつくる．[application](https://github.com/kubernetes-sigs/kustomize/blob/v1.0.3/docs/glossary.md#application)により複数のYAMLリソースをGroupingする．例えば以下のように書ける．以下では`Deployment`と`Service`，`ConfigMap`リソースからapplicationを構成している．

![](https://raw.githubusercontent.com/kubernetes-sigs/kustomize/v1.0.3/docs/base.jpg)

これらに対して`kustomize build`コマンドを実行することで`kubectl apply`可能な1つのYAMLファイルを生成できる．

これにより上述した`Secret`リソースとBinaryファイル，`ConfigMap`リソースと設定ファイルの紐づけ問題を解決しDeclarative管理を行えるようになる．例えば`Secret`リソースは以下のように`kustomization.yaml`に記述できるため`build`時にファイルのDecryptコマンドの実行が行える．

```yaml
secretGenerator:
- name: app-tls
  commands:
    tls.crt: "cat secret/tls.cert"
    tls.key: "cat secret/tls.key"
  type: "kubernetes.io/tls"
```

`ConfigMap`リソースに関しては`build`時に設定ファイルの内容からhash値を計算しmetadataとnameのsuffixにそれを自動で付与してくれるので，設定ファイルを変更する度に名前がユニークになる．つまり設定ファイルを変えると新しくデプロイが走るようになる（+ロールバックも可能になる）．

さらに`kustomization.yaml`には共通のnamespaceや`commonLabels`を書け`build`時に各リソースにそれを差し込むこともできる．

### Overlaysを使う

さらに1つのKustomizationファイルを[base](https://github.com/kubernetes-sigs/kustomize/blob/v1.0.3/docs/glossary.md#base)として[overlay](https://github.com/kubernetes-sigs/kustomize/blob/v1.0.3/docs/glossary.md#overlay)により複数の[variant](https://github.com/kubernetes-sigs/kustomize/blob/v1.0.3/docs/glossary.md#variant)を生成することができる．つまり共通のYAMLファイルから一部の設定のみが異なるYAMLファイルを作成できる．例えばBase YAMLファイルから本番環境用のYAMLと開発環境用のYAMLを生成できる．

以下のように書ける．以下からはBaseのKustomizationファイルからReplica数とCPU limitのみを変えた本番用のYAMLファイルを生成する．

![](https://raw.githubusercontent.com/kubernetes-sigs/kustomize/v1.0.3/docs/overlay.jpg)

この機能により外部のYAMLファイルの管理問題と複数環境問題を解決できる．OSSとして提供されるYAMLファイル（[off-the-shelf configuration](https://github.com/kubernetes-sigs/kustomize/blob/v1.0.3/docs/glossary.md#off-the-shelf-configuration)）をcloneしてきてOverlayによりInternal用の環境に合わせてカスタマイズすれば良い．Template方式とは違い上書きするだけなのでBaseの設定ファイルの書き方に影響を受けない．

## まとめ

Kustomizeの登場した背景と何ができるかについて簡単にまとめた．

Helm Chartが準備されていないOSSツールのため，複数の環境用のYAMLファイルの管理のためにわざわざChartを準備するのはめんどくさいなあと感じていたし，今後`kubectl`にも統合されていくことを考えてもKustomizeは今後良い選択になっていくと感じている（実際に本番で動かしているアプリケーションも移行してみていて良さそうと感じている）．

またMercariではCDにSpinnakerを利用しているので`kustomize build`を行うPipeline stageを準備できれば良いかなーと思っている．


## 参考

- [kubernetes-sigs/kustomize](https://github.com/kubernetes-sigs/kustomize)
- [SIG CLI KEP for Kustomize subproject](https://github.com/kubernetes/community/blob/master/keps/sig-cli/0008-kustomize.md)
- [GitOps - Operations by Pull Request](https://www.weave.works/blog/gitops-operations-by-pull-request)
- [Helm vs Kapitan vs Kustomize](https://medium.com/@splisson/helm-vs-kapitan-vs-kustomize-1c14018faecc)
- [Kubernetes YAMLの壁](https://deeeet.com/writing/2018/01/10/kubernetes-yaml/)
