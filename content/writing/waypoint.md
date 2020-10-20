---
title: "Waypointとは何か"
date: 2020-10-16T12:16:20+09:00
---

Hashicorpの2020年冬の新作 [Waypoint](https://www.waypointproject.io/) ([リリースブログ](https://www.hashicorp.com/blog/announcing-waypoint))に関してドキュメントなどをざっと眺めてみたので最初の印象をちょっと書いてみる．ちゃんとしたレビューは [@copyconstruct](https://twitter.com/copyconstruct) の記事 [Waypoint](https://copyconstruct.medium.com/waypoint-3f00b11da4a) とか読むのが良い．毎度のことながらドキュメントやガイドはかなりちゃんとしたのがあるので使い方とかはそっちを読んだ方がいい．以下に書くのはざっくりした個人の感想（ちなみにもう一つのBoundaryに関しては[Zero Touch Productionとは何か](https://deeeet.com/writing/2020/10/15/zero-touch-production/) に軽く書いた）．

# What is Waypoint

Waypointは，KubernetesやNomad，Amazon ECS，Google Cloud RunといったPlatformの上にBuild，DeployとReleaseの一貫したWorkflowを実現するツール．使ってる言語やそのパッケージ方法や，配下のPlatformへのデプロイ方法が何であろうが，共通の設定ファイル`waypoint.hcl`と`waypoint`というコマンドで同じWorkflowを提供する．PaaSというよりは配下のインフラをラップしてそれらに関係なくPaaSのUI/UXを実現しようという感じかな．

# Why Waypoint

```
Developers just want to deploy
```

Herokuを始めとするPaaSはアプリケーションのデプロイ体験としてはとても良いものを提供していた．しかし，世の中はKubernetesを始めとするCaaSが出てきたりで複雑な方向に向かった．もちろんそれで得られたメリットは多く，PaaSにはない柔軟性をもたらしたが，一方でシンプルにアプリケーションをデプロイするという体験はなくなってしまった (e.g., [Kubernetes YAMLの壁](https://deeeet.com/writing/2018/01/10/kubernetes-yaml/))．

またPackerでVMでやってたのが，DockerでKubernetesになり，また最近はCloud RunでServerlessで専用のCLIが出てきてと，インフラやアプリケーションのデプロイのトレンドはどんどん変わっていく．がその度に新しいCLIや設定ファイルが出てきてそれに合わせてWorkflowをアップデートして〜とやってく必要がある．今はKubernetesとかServerlessとか言ってるけどどうせ5年もたったら違うことを言ってるはずだしね (Kubernetes自体は残っていても抽象化されてそれ自体は見えなくなってるいるはず)．

Waypointはこの辺りの課題を解決することを目的にしてる．DockerfileやらYAMLやらを書くのではなくて必要最低限のHCLでそれらを生成して，どの基盤であっても`waypoint` CLIで同じWorkflowでってのをできるようにする．`waypoint`で統一しておけば次の時代が来ても対応できるという狙い．配下が変わってもBuild，Deploy，ReleaseというWorkflow自体は大きくは変わらないという前提があるけど（それは正しいし，それ自体も変えていける感じするし）．

# Otto

この辺のコンセプトを聞くと数年前にリリースされて死んだ[Otto](https://www.ottoproject.io/)を思い出す（懐かしい）．Ottoはまさに同じような問題を解こうとしてたから．[HNでmitchellh自身が回答してる](https://news.ycombinator.com/item?id=24790491)けど以下のような違いがある:

- Waypiontは配下のインフラ  (e.g., Kubernetes) 自体は管理しない．Ottoはその辺もTerraform使って担おうとしてた
- WaypiontはBuild，Deploy，ReleaseというWorkflowをPluginを使って拡張できるようにしている．OttoはHashicorpの生態系であるVagrant，Terraform，Vault，Consulをつなぎ合わせるという目的が強かった

# Workflow

Waypointが言ってるBuild，Deploy，ReleaseというWorkflowがそれぞれ何かというと: 

- **Build**: アプリケーションのソースコードからBuildpackなりDockerなりでデプロイ単位になるArtifactを作ること
- **Deploy**: Buildで作ったArtifactをデプロイすること
- **Release**: デプロイした環境に実際にトラフィックを流し始めること

このWorkflowで良いなあと思ったのはDeployとReleaseをちゃんと分けていること．[Deploy != Release](https://blog.turbinelabs.io/deploy-not-equal-release-part-one-4724bc1e726b) にも書かれているけど今はDeployとReleaseは分けて考えるのは当たり前になってきており，これはOttoの時代には一般的ではなかった．現状はないけど今後PluginなどでCanaryやBlue-greenといったRelease戦略が実装されていくんじゃないかと思う（Service meshを抽象化してね）．

# Next step

今後どうなりそうかに関しては[Roadmap](https://www.waypointproject.io/docs/roadmap) にいろいろ書いてある．良さそうと思ったのはService Brokerの仕組みを使ってDBやQueueなども対応していくこと，App promotionで異なる環境に対応していくことなどなど．

[Twitterで直接mitchellhにも聞いたけど](https://twitter.com/deeeet/status/1316913160411095043)Kubernetes manifestのカスタマイズをどうしてくのかは気になるところでもある．現状の方法はHelmと同じTemplate方式になっているので，変更した値に対して毎回変数を定義していく必要がある．つまりコアのPlugin自体を変更しないといけない．これはHelmでも起こったが，各社の要望に全て答えるのは無理で最終的にはForkするか，新たなPluginを自分たちで作るしかなくなる（それを期待してるとは思うが）．抽象化で一番むずかしいのはこの辺をどう対応していくかなのでその辺は引き続き要チェックではある．
