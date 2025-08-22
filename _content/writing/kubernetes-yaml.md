---
title: "Kubernetes YAMLの壁"
date: 2018-01-10T11:42:29+09:00
---

Kubernetes に入門しようする人を躊躇させる原因のひとつは間違いなくYAMLによる設定ファイルだろう．Kubernetesにアプリケーションをデプロイするとき，例えそれがシンプルなサーバーアプリケーションであっても，多くのYAMLファイルを手で記述する必要がある．初心者を慄かせるその大量のYAMLはよくwall of YAML（YAMLの壁）などと揶揄される．

初心者でなくてもKubernetesのYAMLは煩わしい．YAML自体は単なるKubernetes APIへのリクエストボディであり慣れてしまえば実はそんなに難しくない．しかし記述する内容のほとんどがBoilerplateであり何度も書いていると飽き飽きする（実際にはほとんどがコピペだが）．あるアプリケーションの開発環境と本番環境のYAMLファイルをいかに効率的に管理するかについて決定的な方法もない．

そもそもKubernetesの開発者はこのYAMLを利用者に書かせるつもりはなかったらしい（[参考](https://blog.heptio.com/ksonnet-intro-43f6183a97a6)）．しかしKubernetesの誕生から3年が経ち未だにYAMLで設定ファイルを記述するスタイルは変わらない．今後もおそらく簡単には変わらないだろう．

ただこの状況を改善しようとするプロジェクトは多く存在する．それらのプロジェクトは煩雑なYAMLの記述を避けKubernetesへのアプリケーションのデプロイの敷居を下げることを目標としている．そして今どのプロジェクトがデファクトになっていくかが注目されている．

本記事では現時点（2018年1月）においてどのようなプロジェクトがあるのかその状況および問題を簡単にまとめる．私見や自分がどのように使っているかは書くがあくまで現状の整理を行う．

## Helm

[https://helm.sh](https://helm.sh/)

まず現時点で一番有名なのはHelmだろう．Helmは Kubernetes Package Managerである．

Kubernetes Package Managerとは何か? KubernetesをKernelとみなすと複数のNodeインスタンスを束ねたClusterを１つのコンピューター，その上で動くコンテナはプロセスとみなすことができる．このような視点になるとHelmはCentOSにおけるYUM，DebianにおけるAPTと同様の役割を果たす．例えば[Grafana](https://grafana.com/)をインストールしたい場合は以下のようにできる．

```
$ helm install stable/grafana
```

このようにHelmはKubernetes上で動くアプリケーション（コンテナ）のパッケージング及び配布の機構を提供する．

Helmのパッケージングのフォーマットは[Chart](https://github.com/kubernetes/helm/blob/master/docs/charts.md)と呼ばれる．Chartの中身は単純にYAMLのTemplateである（より具体的には[Go Template](https://godoc.org/text/template)である）．デプロイ時にこのTemplateの変数に対して具体的な値を渡すことでYAMLを作りそれをクラスタに実行する．例えばDockerイメージのバージョンだけを切り替えたい場合はTemplateは以下のようになる．

```
containers:
    - name: example
       image: gcr.io/deeeetlab/example:{{ .Values.version }}
        ....
```

HelmはWall of YAMLに対するシンプルな解法だ．Boilerplateを共通Templateとしてしまい変更が必要な部分のみを外部から与えられるようにする．Helmはコミュニティにも受け入れられており既に多くのChartが[公式のレポジトリ](https://github.com/kubernetes/charts)に存在する．

メルカリでもHelmは使っている．具体的にはSREが提供する共通のツールはHelmでパッケージングしている．[chartmuseum](https://github.com/kubernetes-helm/chartmuseum)を使ってインターナル向けのレポジトリも準備しているところだ．

### Helmの課題

Helmが完璧かと言われるとそうでもない．特にセキュリティに関しては[Exploring The Security Of Helm](https://engineering.bitnami.com/articles/helm-security.html)で指摘されているように少しザルすぎるように思える．

はっきり言ってHelmでmicroservicesのパッケージングはやりたくはない．HelmのTemplateは結局YAMLでありChartを書くには結局YAMLを書く必要がある．さらにGo templateを駆使した方法はスマートには見えないところが多い．YUMやAPTでAPIアプリケーションの配布をしたいか?と言われたら答えは「No」だろう．Helmはあくまで共通系のツールの配布にしか向いていないと感じている．

共通系のツールの配布としても完璧とは言えない．公式で提供されているChartに対するカスタマイズは公開されている一部の変数のみにしか許されない．カスタマイズ性は著しく低くその作者の力量にも大きく依存する．ツールの設定ファイルなどをYAMLの中に直接書いてあったり気持ち悪い部分も多い．

Helmでインストールしたパッケージの設定ファイルをいかに宣言的に管理するか？に対する解も存在しない．APTやYUMに対してChefやAnsibleが登場したようにHelmに対してももう一段ハイレベルな管理ツールが求められるだろう．

とはいえHelmは広く使われておりデファクトになりつつある．今年3.0もリリースされる予定になっている．今後の進展は要チェックである．

## ksonnet

[https://ksonnet.io](https://ksonnet.io/)

Helmの後発として2017年に登場したのがksonnetである．まだ登場したばかりだが既に[kubeflow](https://github.com/google/kubeflow)などでの採用実績がある．

ksonnetはKubernetesの設定ファイルの記述に[jsonnet](http://jsonnet.org/docs/index.html)を採用している．jsonnetはGoogleで開発されたJSONを定義するためのDSLである．変数やオブジェクトの連結などが可能なJSONのサブセットだと思えば良い．またKubernetesのAPIオブジェクトは予め[ksonnet-lib](https://github.com/ksonnet/ksonnet-lib)として共通化して提供されているためBoilerplateを避けることができる．例えばNginxコンテナのDeploymentの記述は以下のようになる．

![](https://ksonnet.io/images/tutorial-img-5.png)

これによりYAML問題は避けられている．

ksonnetはさらにもう一段進んだ機能を持つ．まずPrototypeというコンセプトを持つ．これはjsonnetによるTemplateである．デフォルトでいくつかの共通パターンが提供されている．例えばDeployment resourceとService resourceを使ったアプリケーションのデプロイはよく使うパターンだがこれは`deployed-service`という名前のprototypeで提供されている．ユーザーはこのprototypeに具体的な値を与えて実際のデプロイの構成する．Helmと同様にPrototypeを自分で書き配布することもできる．

次にksonnetはEnvironmentというコンセプトを持つ．これはkubernetes本家にもHelmにもない概念だ．ksonnetはどの環境，つまりどのクラスタに，設定ファイルを適用するかを強制する．各環境ごとの設定値の変更もスマートに行える．これにより間違ったクラスタに設定ファイルを適用してしまった...という問題を避けることができる．

ksonnetのコンセプトと全体像は以下の図でまとめられる．

![](https://ksonnet.io/images/tutorial-img-12.png)

### ksonnetは流行るか

コンセプト自体はとても好きだが何とも言えない．自分の中ではjsonnetがどこまで書けるようになるかが懐疑的だ．皆がこれを普通に扱えるようになるようになるのかもわからない．VS Codeの[Extension](https://ksonnet.io/docs/vs-code)が提供されていたりするのでIDE前提にはなりそうだが...

[kubeflow](https://github.com/google/kubeflow)による採用事例はあるがまだ少ない．生態系が整っていくと未来はあるかもしれない．Helmでサポートも考えられているらしいので（[参考](https://blog.heptio.com/ksonnet-intro-43f6183a97a6)）より広く使われる機運はありそうと感じている．

興味がある人は[Tutorial](https://ksonnet.io/docs/tutorial)と[Tour](https://ksonnet.io/tour/welcome)をひと通り見てみると良い．

## kubecfg

[https://github.com/ksonnet/kubecfg](https://github.com/ksonnet/kubecfg)

ksonnetはかなりopinionatedなプロジェクトだ．jsonnetの採用だけでなくPrototypeやEnvironmentなど独自の概念も多い．ksonnetからopinionをなくしたのがkubecfgである（開発者にも[言われた](https://twitter.com/bryanl/status/950817365863878657)）．

kubecfgはシンプルにKubernetesの設定ファイルをjsonnetで記述可能にするプロジェクトだ．シンプルにYAMLによる手書きを避けることを目的としている．まだ採用事例は見ないがこれはこれでシンプルに良い解になりそうだなあと感じている．

## まとめ

本記事ではKubernetes YAML問題を解決しようとするいくつかのプロジェクトを紹介した．他にも[kompose](https://github.com/kubernetes/kompose)や[kedge](https://github.com/kedgeproject/kedge)などもあるが全てを見れてはいない．Helmが広く認知されている一方で問題も多い，ksonnetのコンセプト自体は良いがまだ認知は少なく流行るかわからないというのが現状だ．

しかしだからと言ってKubernetesへの入門は待つべきではない．上述したようにぱっと見ると膨大なYAMLに見えるが実際の内容はとてもシンプルで分かりやすい．とりあえず入門するならコピペでも良いのでYAMLを書いてみるのが良い（Kubernetesの開発者も結局コピペして書いてると思う）．その上で自分たちの環境に最も適した管理ツールを考えてみれば良い．何でも良いと思うが少なくともKubernetesのEcosystemで議論されているものをピックアップするのが良い．

## 参考

- [Exploring The Security Of Helm](https://engineering.bitnami.com/articles/helm-security.html)
- [ksonnet: Simplify working with Kubernetes configurations](https://blog.heptio.com/ksonnet-intro-43f6183a97a6)
- [The Next Chapter for ksonnet](https://blog.heptio.com/the-next-chapter-for-ksonnet-1dcbbad30cb)

