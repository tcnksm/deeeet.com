---
title: "Kubernetesがいかに自動化の考え方を変えたか?"
date: 2018-12-13T00:43:34+09:00
---

先日[Japan Container Days v18.12](https://containerdays.jp/)の基調講演で話をさせていただく機会があった．内容としてはMercari のMicroservices Platformの基盤として「なぜ」Kubernetesを選択したか？ついて現状や今後の展望を踏まえて紹介をした．

<script async class="speakerdeck-embed" data-id="5ce5dcf2ea464d0d97b41ecbc6841273" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

[Microservices Platform on Kubernetes at Mercari](https://speakerdeck.com/tcnksm/microservices-platform-on-kubernetes-at-mercari)

「なぜ」の回答としては，[CRD](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)や[Admission webhook](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)といった拡張機構を使うことで今後起こりうる様々なWorkloadに特化したPaaSや抽象化レイヤーを書いていけるExtensibilityの高さとそのBuilding BlockとしてのEcosystemの強さを挙げた．

このトークのExtensibilityの文脈で話したくて時間がなかったのが「Kubernetesがいかに我々の自動化に対する考え方を変えたか？」だ．本記事ではその話せなかった部分をは吐き出しておく．

## Preface

「Custom Controller書くぞ！」はMercari のMicroservices Platform チーム内で自動化について議論していると必ず出てくる発言だ．

Kubernetes以前の自動化ではコマンドラインツールを書くバッチスクリプトを書くもしくはAnsibleのplaybookやChefのRecipeを書くといった手法が使われてきた．Kubernetesが当たり前になってからは長らくそれらをやっていないし問題の解法として頭に浮かばなくなった（むしろ避けている）．コマンドラインツールを書くのは好きだったが最近はめっきり書かなくなった．

Kubernetesを使ってるから当然だと思われるかも知れないがもっと深い部分で考え方が変わった．つまりKubernetesでなくてもこの考え方は通用する．「Custom Controller書くぞ！」という発言はKubernetesの思想や内部機構がもたらした新しい自動化の考え方の１つだ．

## How Kubernetes works

Kubernetesの大きな特徴のひとつは「Declarative Configuration」だ．KubernetesユーザはKubernetes APIに対してあるべきDesiredな状態を宣言（Declare）しKubernetesはその状態になるように「自律的に」動き続ける．例えばユーザが「Podを5つ動かす」という状態を宣言するとKubernetesはそれを受け「Podが5つ動いている状態」を維持するように動く．

これを実現しているのがReconciliation loopである．Kubernetesでは大量のControllerが動いておりそれぞれが独立したReconciliation loopを実行している．個々のControllerはシステムの一部の小さな機能を担っており他のシステムの状態に関しては感知しない．それぞれがそれぞれの問題のみを解決する．UNIX哲学的に作られた独立したControllerの集合こそがKubernetesである．

このReconciliation loopは以下の4つを繰り返しているだけである．

- Desired stateを知る
- 現在のstateをObserveする
- Desired stateとObserveされたstateの差を見つける
- Desiredな状態になるような処理を実行する

 <img src="/images/loop.png" class="image">

[Managing Kubernetes](https://www.oreilly.com/library/view/managing-kubernetes/9781492033905/)

Controllerの根底にある重要な概念が「Level Triggering」と「Edge Triggering」である．以下の図のようにこれらはシステムがあるSignal（もしくはEvent）に対していつ反応するかに違いがある．「Edge Triggering」はSignalの変化に対して反応し，「Level Trigger」は状態を検知して反応する．

![](https://cdn-images-1.medium.com/max/1200/1*xzMwQrVwmeW8agLsS5he0A@2x.png)

[Level Triggering and Reconciliation in Kubernetes](https://hackernoon.com/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d)

抽象的にみれば結果は同じだがSampling Rateを考えると結果は変わる．例えば以下の図を考える．Signalの上昇を「on」降下を「off」としてシステムとしては「on」で1を足し「off」で1を引くとする．このとき「Edge Triggering」が何らかの理由で「off」のTriggerに失敗するもしくは逃すと最終的な状態は「Edge triggering」は2になり「Level Triggering」は1になる．

![](https://cdn-images-1.medium.com/max/1600/1*fv_GwEYgek9agPJvsTAc-g@2x.png)

[Level Triggering and Reconciliation in Kubernetes](https://hackernoon.com/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d)

「Edge Triggering」は障害に弱い．人手によるオペレーションが前提になる．失敗が前提のDistributed systemではこれは非常にCriticalになる．Kubernetesがシステムとしてもしくはその上で動くアプリケーションがStableなのはReconciliation loopによる「Level Triggering」を採用しているからに他ならない（もちろんシステムそのものが複雑であるという対価は払っている）．

## Custom Controller

さらにKubernetesで特徴的なのはそのSystemを構成するControllerもその上で動くApplicationと同様のAPIを使ってることである．つまり[Public APIしかなくSystem Componentしか使えないという口はない](Level Triggering and Reconciliation in Kubernetes)．さらに[System ResourceもCRDに移行する](https://speakerdeck.com/thockin/crds-arent-just-for-add-ons)という話もある．

これがもたらすのはSystem Controllerと同じように自分たちで自分たち専用のControlerを書いていけるということだ．これが冒頭の「Custom Controller書くぞ！」という発言につながる．バッチを動かすのではなくコマンドを人間が実行するのではなく「Reconciliation Loop」で解決することを考える．

Container Daysの発表ではその一部の例として[certificate-expiry-monitor-controller](https://github.com/mercari/certificate-expiry-monitor-controller)を挙げたが他にも自分たちの自動化のために作っているControllerは幾つかある．

例えばOSSになっていないが（そのうち出す）[PR Replication Controller](https://www.slideshare.net/VishalBanthia1/kubernetes-controller-for-pull-request-based-environment)というCustom Controllerを書いている．これはGitHubでPull Request（PR）を作ったらそのコードを使ったPodを開発環境Kubernetesに自動でつくるというものである．

このControllerはまさに上で挙げたReconciliation loopを応用している．あるべき状態はGithubのPull RequestがPodとして存在していることとし，そうなるように自律的に動く．これをGithub Webhookで反応する「Edge Triggering」で実装したら失敗したときに余計なオペレーションが発生していただろう．

これがKubernetes時代の自動化であり我々に与えた考え方の変化である．

## まとめ

大げさなタイトルと書き方をしたかもしれないがここ数年で自分の中で起こった考え方の変化として書いておいた．

