---
title: "いかにKubernetesが自動化の考え方を変えたか?"
date: 2018-12-13T00:43:34+09:00
---

先日[Japan Container Days v18.12](https://containerdays.jp/)の基調講演で話をさせていただく機会があった．内容としては「なぜ」Mercari のMicroservices Platformの基盤としてKubernetesを選択したか？ついて現状や今後の展望を踏まえて紹介をした．

<script async class="speakerdeck-embed" data-id="5ce5dcf2ea464d0d97b41ecbc6841273" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

[Microservices Platform on Kubernetes at Mercari](https://speakerdeck.com/tcnksm/microservices-platform-on-kubernetes-at-mercari)

「なぜ」の回答としては，CRDやAdmission webhookなどを使うことで今後起こりうる様々なWorkloadに特化したPaaSや抽象化レイヤーを書いていけるExtensibilityの高さとそのBuilding BlockとしてのEcosystemの強さを挙げた．

このトークのExtensibilityの文脈で話したくて時間がなかったのが「Kubernetesがいかに我々の自動化に対する考え方を変えたか？」だ．本記事ではその話せなかった部分をは吐き出しておく．

## Preface

「Custom Controller書くぞ！」はMercari のMicroservices Platform チーム内で自動化について議論していると必ず出てくる発言だ．

Kubernetes以前の自動化ではコマンドラインツールを書くバッチスクリプトを書くもしくはAnsibleのplaybookやChefのRecipeを書くといった手法が使われてきた．Kubernetesが当たり前になってからは長らくそれらをやっていないし問題の解法として頭に浮かばなくなった（むしろ避けている）．コマンドラインツールを書くのは好きだったが最近はめっきり書かなくなった．

Kubernetesでアプリケーションを動かしその内部機構を理解してからこの考え方が変わったと思う．

## How kubernetes works

Kubernetesの大きな特徴のひとつは「Declarative Configuration」だ．KubernetesユーザはKubernetes APIに対してあるべきDesiredな状態を宣言（Declare）しKubernetesはその状態になるように「自律的に」動き続ける．例えばユーザが「Podを5つ動かす」という状態を宣言するとKubernetesはそれを受け「Podが5つ動いている状態」を維持するように動く．

これを実現しているのがReconciliation loopである．Kubernetesでは複数のControllerが動いておりそれぞれが独立したReconciliation loopを実行している．個々のControllerはシステムの一部の小さな機能を担っており他のシステムの状態に関しては感知しない．それぞれがそれぞれの問題のみを解決する．UNIX哲学的に作られた独立したControllerの集合こそがKubernetesである．

このReconciliation loopは以下の4つを繰り返しているだけである．

- Desired stateを知る
- 現在のstateをObserveする
- Desired stateとObserveされたstateの差を見つける
- Desiredな状態になるような処理を実行する

 <img src="/images/loop.png" class="image">

[Managing Kubernetes](https://www.oreilly.com/library/view/managing-kubernetes/9781492033905/)

ControllerをStableにしている重要な概念が「Level Triggering」と「Edge Triggering」である．以下の図のようにこれらはシステムがあるSignal（もしくはEvent）に対していつ反応するかに違いがある．「Edge Triggering」はSignalの変化に対して反応し，「Level Trigger」は状態を検知して反応する．

![](https://cdn-images-1.medium.com/max/1200/1*xzMwQrVwmeW8agLsS5he0A@2x.png)

[Level Triggering and Reconciliation in Kubernetes](https://hackernoon.com/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d)

抽象的にみれば結果は同じだがSampling rateを考えると結果は変わる．例えば以下の図を考える．Signalの上昇をon降下をoffとしてシステムとしてはonで1を足しoffで1を引くとする．このとき「Edge Triggering」が何らかの理由でoffのTriggerに失敗すると最終的な状態は「Edge triggering」が2になってしまい「Level Triggering」は1になる．

![](https://cdn-images-1.medium.com/max/1600/1*fv_GwEYgek9agPJvsTAc-g@2x.png)

[Level Triggering and Reconciliation in Kubernetes](https://hackernoon.com/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d)

得に失敗が前提のDistributed systemではこの違いは非常にCriticalになる．KubernetesがシステムとしてStableなのはReconciliation loopによる「Level Triggering」を採用しているからに他ならない．

## Custom Controller

さらにKubernetesで特徴的なのはそのSystemを構成するControllerもその上で動くApplicationと同様のAPIを使ってることである．つまり[Public APIしかなくSystemしか使えないという口はない](Level Triggering and Reconciliation in Kubernetes)．そして[SystemのResourceもCRDに移行する](https://speakerdeck.com/thockin/crds-arent-just-for-add-ons)という話もある．

これがもたらすのはSystem Controllerのように自分たちで自分たち専用のControlerを書いていくことができるということだ．これが冒頭の「Custom Controller書くぞ！」という発言につながる．

Container Daysの発表ではその一部の例として[certificate-expiry-monitor-controller](https://github.com/mercari/certificate-expiry-monitor-controller)を挙げたが他にも自分たちの自動化のために作っているControllerは幾つかある．

例えばOSSになっていないが（そのうち出す）PR Replication ControllerというCustom Controllerを書いている．これはGitHubでPull Requestを作ったらそのコードを使ったPodを開発環境Kubernetesに自動でつくるというものである．このControllerはまさに上で挙げたReconciliation loopを応用している．あるべき状態はGithubのPull RequestがPodとして存在していることとし，そうなるように自律的に動く．これをGithub Webhookで反応する「Edge Triggering」で実装したら失敗したときに余計なオペレーションが必要だっただろうなと思う．

これがKubernetes時代の自動化であり我々に与えた考え方の変化である．KubernetesのAnalogyとしてよくLinuxが使われる（[Open Source Summit: Kubernetes as the New Linux](https://thenewstack.io/open-source-summit-kubernetes-new-linux) ）．System Layerとしての考え方だけではなくKubernetesはLinux同様にInfraのInfraになりうる（と思ってる）．このKubernetes時代の自動化にAdaptできるかどうかは今後非常に重要になると思う．

## まとめ

大げさなタイトルと書き方をしたかもしれないがここ数年で自分の中で起こった考え方の変化として書いておいた．

