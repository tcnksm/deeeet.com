---
title: "Zero Touch Productionとは何か"
date: 2020-10-15T09:14:25+09:00
---

GoogleのSREとSecurityによる[Building Secure Reliable Systems](https://landing.google.com/sre/resources/foundationsandprinciples/srs-book/) という本の中で「Zero Touch Production (ZTP) 」という考え方が紹介されていた．これはインフラの権限管理やインフラの構築そのものの指針となる概念であり，自分がそうあるべきだとずっと思ってきた考え方でもある．これはどのような考え方なのか?をこれまでの歴史を踏まえて具体的なツールや事例とともにまとめておく．

# Zero Touch Production

[Building Secure Reliable Systems](https://landing.google.com/sre/resources/foundationsandprinciples/srs-book/) においてZero Touch Production (ZTP) は以下のように定義されている．

    The SRE organization at Google is working to build upon the concept of least privilege through automation, with the goal of moving to what we call Zero Touch interfaces. The specific goal of these interfaces—like Zero Touch Production (ZTP), described in Chapter 3, and Zero Touch Networking (ZTN)—is to make Google safer and reduce outages by removing direct human access to production roles. Instead, humans have indirect access to production through tooling and automation that make predictable and controlled changes to production infrastructure. This approach requires extensive automation, new safe APIs, and resilient multi-party approval systems.

簡単に要約すると「Zero Touch Production (ZTP) 」は自動化による[Least Privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege)の到達するべきゴールの1つで，SRE含む人間が本番環境を直接触ることを避けることで障害やセキュリティリスクを減らすことを目的とする．直接的に触るのではなくて自動化やツールによる間接的なアクセスのみに制限することで，本番への変更を予期できるもの，かつコントロール (例えば，[Multi-party authorization](https://en.wikipedia.org/wiki/Multi-party_authorization)を入れたり，Auditを取れるようにしたり，適切なRate limitをかけたり) できるものにする．

以下ではここまでの歴史を踏まえつつ，なぜZTPか? どのようにZTPを実現するか? について書く．

# Before ZTP

ここではまずZero Touch Production以前の権限管理や本番環境へのアクセスがどう変化してきたかについて簡単にまとめる．

## Ops Team

この業界には古くから開発チームと運用チームという組織パターンが存在している．これは開発チームはサービスの開発のみを担い，運用チームがサービスインフラの構築からサービスの運用を担うというパターン．このパターンでは基本的に本番環境へのアクセス権限を持っていた (=責任を持つ) のは運用チームのみだった．

## You Build It, You Run It

クラウド化といったインフラの抽象化やマネージドサービス化といったオペレーションの自動化が進むことにより，インフラの管理は運用チームだけのものではなくなった．そして[Lean](https://en.wikipedia.org/wiki/Lean_software_development)やAgileを始めとする新しい開発スタイルの登場によりこの開発と運用のチームの分離はアンチパターンとみなされるようになってきた．

これはスピードの低下のみではなく，例えば，[Amazon's approach to building resilient services](https://youtu.be/KLxwhsJuZ44) では本番環境で発生した障害とその解消の学びが運用チームのみで閉じてしまい，それらが適切に開発チームにフィードバックされないことでReliabilityやResiliencyの改善が進まないことを課題として挙げてる．また [Team Topologies](https://deeeet.com/writing/2020/02/06/team-topologies/) では本番ユーザからのフィードバックさえも失われてしまう可能性があることを問題点として挙げている．

このような課題を解決するためMicroservicesを始めとした新しい組織パターンではCross-functionalなチーム，つまり開発からテスト，デプロイ，運用まで全てを１つのチームで担うこと，が好まれるようになった．これは，例えば，Amazonだと「You Build It, You Run It」，Netflixだと[Full Cycle Developer](https://netflixtechblog.com/full-cycle-developers-at-netflix-a08c31f83249)などと表現される（自分はFull Cycle Developerという言葉を昔はよく使っていたけど最近は避けている．これは各エンジニアが皆全てのフェーズをできないといけないと捉えられてしまったため．例えば，Reliabilityの改善のタスクなどはサービスが複雑かつクリティカルだと片手間ではできなくなり[Embedded SRE](https://landing.google.com/sre/sre-book/chapters/operational-overload/)を始めとして専属的にやるひとというのが必要になってくる．なので1チームのなかである程度専門的な役割分担は生まれることはある．あくまで目指すべきは「個人」ではなくて「チーム」が全フェーズを責任をもつこと）．

このパターンでは本番環境へのアクセスは特定のチームが持っているのではなく，サービスのインフラの変更権限はオーナーである各チームがそれぞれ持つという形になる．

## Infrastructure as Code

[Infrastructure as Dataとは何か](https://deeeet.com/writing/2020/05/11/infrastructure-as-data/) という記事の中で詳しく書いたが，上述したインフラの抽象化により，インフラをコードで管理し，そしてその実行（構築）をCI/CDによる自動化によって行う[Infastructure as Code](https://learning.oreilly.com/library/view/infrastructure-as-code/9781491924334/)も当たり前のプラクティスになってきた．

かつては開発チームが運用チームに依頼を出し，運用チームは直接マシンにログインするなどしてインフラの構築や構成変更を行っていたがInfrastructure as Codeの時代ではそれは少なくなった．むしろCross-functionalなサービスチームが自分たちでコードを書いてインフラを構築するという光景も珍しくはなくなった．

ちなみに自分はInfrastructure as Codeをしない理由はないと思っている．もちろんPoCなど実験段階であれば手動でそれらを構築することはスピードを出すために必要だし，わざわざコードで管理する必要はない．しかし本番にリリースする段階になれば多少のコストを払ってでもコード化とCI/CDの設定はするべきだと思う．この段階においてもやらない理由としてもスピードを挙げられることがあるが，リリースした後の長い運用やチームでそれを回していくこと考えると余裕で払ったほうが良いコストだと思う．

これらを考えると本番環境の直接的なアクセスが必要なことは実はかなり少ない．例えば，自分は今はKubernetesをメインに使っている．`kubectl`は新しいSSHと言われたりもするが，それでも変更を伴うコマンドを直接本番で叩くことは少ない．あるとすれば障害時の対応がメインとなる．Infrastructure as Code時代においては本番環境への直接的なアクセスはそもそも限定的だ．

## Risk vs. Reliability

Infrastructure as Code時代の隙間にある本番環境へのアクセスは，リスクの許容とReliabilityのバランスをどう取るかによって変わる．[Building Secure Reliable Systems](https://landing.google.com/sre/resources/foundationsandprinciples/srs-book/) においても大きな主題の1つでもあるが，それらは片方と取ると片方に影響がでる．ガチガチにセキュリティを固めて誰もアクセスできないような環境を作ってしまうと問題が起こったときの復旧に時間がかかりReliabilityは下がる．逆に誰でもアクセスできるような環境を作ってしまうとオペレーションミスや乗っ取りによる障害のリスクは高まる．今の本番アクセスはMTTR (Mean Time To Repair) を短くするのために残っている．

昔は[Linux Performance Analysis in 60,000 Milliseconds](https://netflixtechblog.com/linux-performance-analysis-in-60-000-milliseconds-accc10403c55) のようなコマンドとかを頑張って覚えていたけどこれも少なくなってきた，というか忘れてしまった... Observabilityという言葉が登場し，Metrics, Tracing, Loggingをしっかりと収集して一箇所に集めて可視化するのが当たり前になってきた．コマンドを覚えるよりも皆が使えるグラフを作る力の方が今は求められているだろう．

# Why ZTP?

ではなぜZero Touch Production (ZTP) か?という話に戻ると想定されるリスクを下げることに他ならない．

GoogleにおけるZTPの初期衝動は，[Building Secure Reliable Systems](https://landing.google.com/sre/resources/foundationsandprinciples/srs-book/) に加えてSREcon19 Europe/Middle East/AfricaにおけるGoogleのBorg SREによる[Zero Touch Prod: Towards Safer and More Secure Production Environments](https://www.usenix.org/conference/srecon19emea/presentation/czapinski) が分かりやすい．

人間が本番に直接触ることで発生するリスクはいくつか挙げられる．まず人間は必ずミスをする生き物なのでオペレーションミスとそれに伴う障害は起こりうる．次にSecurityを考えると本番権限を持った人間のアカウントがCompromiseされてしまった場合多くの攻撃が可能になってしまう．他にもオペレーションのためのAd-hoc scriptがRate limitやレビューなしで実行されることで本番アプリケーションのパフォーマンスに影響が出てしまうこともある．SREやインフラをやってるひとなら他にも似た障害を挙げられると思う．

発表によるとGoogleの過去の障害を分析した結果，全ての障害のうち13%がここで挙げた直接的な本番アクセスに起因するものだったという．障害のコストから計算するとZTPへの移行は十分に価値があった．

# How ZTP?

ではどのようにZTPを実現するのか?についてGoogleとLyftの例，そしてHashicorpの出したBoundaryを紹介する．

## Google Tool Proxy

GoogleではZTPをProxyという形で実現している．このモデルではターゲットとなるシステムと直接話すのではなくProxyを介して話すようにする．このProxyはConfigurationによって，どのクライアントがそのPRCを実行しても良いかというACLを管理し，他にもMulti-factor authorizationやAuditログの取得，リクエストのRate limitなどを実現する．

Google社内には多くのCLIツール (例えば`kubectl`のようなBorg用のコマンド）あるが，ツールによっては危険なオペレーションが可能になる．全てのCLIの開発を追ってProxyパターンに対応させていくのは難しいので，Tool proxyというものを開発している．これはCLIツールのラッパーコマンドで，これを使ってコマンドを実行することで上述したProxyモデルを実現することができる．例えばBorgのJobを殺すための`borg kill`コマンドは以下のように実行する．

```bash
$ tool-proxy-cli --proxy_address admin-proxy borg kill ...
```

これにより例えば`borg kill`の実行にチームによる承認をフローを挟むことが可能になる．

## Lyft Clutch

直接的にはZTPとう言葉は使っていないが最近LyftがOSSにした[Clutch](https://clutch.sh/)はまさにZTPを目指すためのツールになってると思う．Clutchは簡単に言うといろいろな本番オペレーションをUI化していくためのツールである．具体的な利用例は[LyftにおけるCase study](https://clutch.sh/docs/about/lyft-case-study/) が分かりやすい．

LyftはAWSをメインに使っており，インフラの構成管理は上述したInfrastructure as Codeによって行われている (本文ではGitOpsと書かれているがまあ同じ)．Clutchの開発を始めたLyftでのアラートは，新しいコードのデプロイや設定変更に起因するHigh CPUが全体の20%を占めていたらしい．このアラートによる対応は，変な動きをしているインスタンスを落とす，スケールアウトする，もしくはLoad shedingをするなどがある．Clutch以前は以下のような対応方法があった:

- Infrastructure as Codeのコードを変更するPRを送る
- AWSのCLIを叩いて変更を行う
- AWSのコンソールを触って変更を行う

まず1つ目の方法は一番理想的な方法だがCI/CDパイプラインを通す必要があり，障害時には時間がかかりすぎMTTRに影響が出る．2つ目と3つ目はCI/CDによる時間の問題はないが，UI/UXの悪さやオペレーションミス，まさにZTPの初期衝動で挙げたリスク，が避けられない．

これらの課題を解決するために開発されたのがClutchである．Clutchにより，例えば，「AWSのClusterのインスタンスをスケールアウトする」というオペレーションをシンプルなUIにすることができる．単純にシンプルなUIを提供するだけではなくて，危険な値が入力されていないか? という設定のチェックを行ったり (Guardrailを提供する)， 実行のAuditを取るといったことが可能になる．

ClutchはUIとその実行はフロントはReact，バックエンドはGo，フロントとバックエンドの通信はProtoで，とフレームワーク化されている．そのため自分たちの組織にあったオペレーションをどんどんUI化していくことができる．

## Hashicorp Boundary 

ちょうどこの記事を書いたあとにHashicorpが[Boundary](https://www.hashicorp.com/blog/hashicorp-boundary)というOSSツールを出した．これはまさに本番環境へのアクセスを管理するためのツール．

HashicorpがBoundaryで解決しようとしているのは伝統的なPerimeterベースのアクセスモデル．このモデルではユーザがどのネットワークにいるか?でリソースにアクセスできるかが決まってしまうモデル．例えばDCのPrivate Networkに入れるひとはその中のリソースに何でもアクセスできてしまう．現代のようなダイナミックなインフラや，分散システムのように複数のサービスが動き，複数のチームがアクセスするような環境ではワークしない．このモデルに対して主流になってるのがPrivate Networkであってもインターネットに公開しているように扱う[Zero Trust Network](https://tailscale.com/blog/zero-trust-networks/)モデルである．Boundaryはこの構成要素になる．

Boundaryはユーザと本番環境のリソースの間にGatewayを置き，GatewayがPolicyに基づきAuthN/AuthZを行う．Vaultとも連携し，Gateway経由でリソースアクセスに必要なTokenなどをPolicyに基づき動的に取得する．ローカル環境のツールとGatewayとのやりとりはローカルのProxyを経由することで行われるため対応できるツールに制限はなさそう．これによりユーザはIDPが提供するIdentityによってのみ適切な本番リソースへのアクセスを行うことができる．

BoundaryはまさにZero Touch Production的なツールになっていくのではないかと思う．Boundaryのモデルは上述したGoogle Tool Proxyにとても似ている．現状はAuthN/AuthZ的な要素が強いが例えばMulti-factor authorizationやRate-limit，もしくは実行可能なコマンドの制限なども実装できそう．

上でInfrastructure as Codeの狭間に本番アクセスという領域があると書いたが，Terraformでそれを実現してきたHashicorpがそこを突いてきたのはさすがという感じがする…

# Breakglass

同じく[Building Secure Reliable Systems](https://landing.google.com/sre/resources/foundationsandprinciples/srs-book/)の中でもBest Practicesとして紹介されているが，全く予期しない障害に備えてあらゆるチェックを通過して直接本番を触ることができる「Breakglass」の仕組みをもつもの大切．具体的な例としてはSpoitfyの[gimme](https://github.com/spotify/gimme)だったり，Merpayの[qray](https://engineering.mercari.com/blog/entry/sre-qray/)などが挙げられる．

まとめると，まず普段はDebugなどに必要な最小限のViewer権限のみを持つ．変更が必要な場合はInfrastructure as Codeを管理するレポジトリにPRを送る（そして裏で動くCI/CDにより変更を実行する）．これはBackend EngineerだろうがSREだろうが変わらない．障害などが発生した場合はまずは上で紹介したClutchやBoundaryを経由した解消を試みる．それでもだめな場合は「Breakglass」の仕組みにより本番の権限を一時的に取得してオペレーションを行う．これが自分としては現状最も理想なZTPの形だと思う．

# Conclusion

本記事ではZero Touch Productionとは何か?についてまとめた．この記事を通して言いたかったことは，まずInfrastructure as CodeやObservabilityの発展によりそもそも本番環境への直接的なアクセスというのは限定的になっているということ．もしそれができていないならZTP以前にそれを目指すこと．次に，その上でも発生する本番環境へのアクセスのリスクを減らしていくためにZTPやその手法は良い指針になること．

今はまさにClutchを実験的に導入したり，権限管理の方法を見直すことでZero Touch Productionをゴールにしたプロジェクトをやっている．実際に現職でどのようなことが実現できたかはそのうち会社のテックブログとかに出てくると思う．
