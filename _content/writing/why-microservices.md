---
title: "なぜMicroservicesか?"
date: 2019-05-20T13:10:19+09:00
---

現職においてMonolithアーキテクチャからMicroservicesアーキテクチャへの移行とその基盤の構築に関わって2年近くが経った．未だ道半ばであるがこれまでの経験や日々のインプットをもとにいろいろ書いておこうという気持ちになった．本記事ではそもそもMicroservicesアーキテクチャとは何かを整理し，なぜやるべきか?・なぜ避けるべきかを整理する．

# Microservices?

Microservicesアーキテクチャとは「Single purpose，High cohesion，そしてLoosly Couploedなサービスを組み合わせてシステムを構築する」アーキテクチャ手法である．それぞれの原則をまとめると以下のようになる．

- Single purpose: 一つのことに集中しておりそれをうまくやること
- Loose coupling: サービスは依存するサービスについて最小限のことを知っていること．あるサービスの変更に他のサービスの変更が必要でないこと．
- High cohesion: それぞれのサービスが関連する振る舞いやデータをカプセル化していること. ある機能を作るときに全ての変更が一つのサービスにまとまっていること．

![](https://cdn-images-1.medium.com/max/2400/1*f5yQlyPApGNPfauFBe0pTA.png)

[Microservice Architecture at Medium](https://medium.engineering/microservice-architecture-at-medium-9c33805eb74f)

Microservicesアーキテクチャをモデル化するときはこれら3つを「全て」満たす必要がある．これによってMicroservicesアーキテクチャの利点を最大限に活かすことができる．一つでも欠けると崩壊する．

- Single purposeを満たさないとそれぞれのサービスは多くのことをやることになる．つまり複数のMonolithが存在することになる
- Loose couplingを満たさないと一つのサービスの変更が他のサービスに影響を与えることになる．そのため（Microservices化のメリットである）素早く安全にリリースをすることができなくなる．密結合するとデータの不整合やデータロストなどが起こる
- High cohesionを満たさないと分散Monolithになる．つまり一つの機能の開発のために複数のサービスを変更しないといけなくなる

コードの行数が少ないから・細かなタスクを扱うからMicroserviceではない．Microservicesアーキテクチャのゴールはできる限り多くの小さなサービスを持たないことである．また新しいテクノロジーを使っているからMicroserviceではない．Kubernetes上のコンテナとして動いているからMicroserviceではない．

# Why Microservices?

「Microservicesは組織論」と言われるようにMicroservicesアーキテクチャの究極的な成果物は新たな組織図である．新たなアーキテクチャに基づく新たなチームの編成，組織の再構成を狙うのが大きな目的である（逆コンウェイの戦略，[Inverse Conway Maneuver](https://www.thoughtworks.com/radar/techniques/inverse-conway-maneuver)などと呼ばれる）．

![](/images/org.png)

[What We Got Wrong: Lessons from the Birth of Microservices](https://youtu.be/-pDyNsB9Zr0)

組織を再編する大きなモチベーションはサービス成長に伴う組織の拡大（エンジニアの増加）に起因することが多い．組織の拡大はそのパフォーマンスの低下を引き起こす可能性がある．[Accelerate](https://itrevolution.com/book/accelerate/)は2013年から2017年の4年間を通してスタートアップを含む2000以上の企業から「いかに組織のパフォーマンスを加速させるか」という視点で聞き取り調査を行った本である．この調査結果の一つに以下のグラフがある．

![](/images/accelerate.png)

このグラフはエンジニアの数とそのパフォーマンスを組織の違いによってマッピングしたものである．グラフの縦軸はここではパフォーマンスの指標として一日あたりのエンジニアあたりのデプロイ数を示している．この調査結果から，組織を拡大しても（エンジニアが増えても）パフォーマンスは必ずしも高まるわけではなくむしろその低下をもたらすことがあることがわかる．一方で指数関数的にそのパフォーマンスが高まった組織があることもわかる．パフォーマンスに起因する要素は様々だがアーキテクチャとチーム編成が与える影響は大きい．このアーキテクチャとして近年デファクトになりつつあるのがMicroservicesアーキテクチャである．

以下はMicroservicesアーキテクチャが可能にすることを端的に表した図である．

![](https://blogdoteventuatedotio.files.wordpress.com/2017/01/successtriangle.png)

[The microservice architecture is a means to an end: enabling continuous delivery/deployment](https://blog.eventuate.io/2017/01/04/the-microservice-architecture-is-a-means-to-an-end-enabling-continuous-deliverydeployment/)

Microservicesアーキテクチャによって可能になるのは小さく自立・独立したCross functionalなチームを各サービスに配置することである．そしてそのチームに対して適切な権限を与えて構成する「組織」とMicroservices「アーキテクチャ」が可能にするのはContinuous Deliveryという「プロセス」である．この「プロセス」が「組織としてのパフォーマンスを最大化すること」を可能にする．以下のAirbnbのKubeCon 2018 North AmericaでのKeynote [Developing Kubernetes Services at Airbnb Scale](https://youtu.be/ytu3aUCwlSg)のスライドがとてもシンプルにこれを伝えていた．

![](/images/airbnb-cd.png)

https://github.com/warmchang/KubeCon-North-America-2018

（例えば1時間あたり1回デプロイできるとする．Monolithアーキテクチャの場合は業務時間内にリリースできる回数は1日8回が限度になる．これが10つのサービスに分割されたMicroservicesアーキテクチャなり各チームが「独立して」リリースを行える場合その回数は単純計算で10倍の80回になる）

まとめるとMicroservicesアーキテクチャに移行する最大の理由は「組織の拡大においても小さな自立独立したチームによる組織を編成し組織としてのパフォーマンスを最大化する」ことである（2000年初頭においてGoogleはComputer Scienceの問題を解決するために今でいうMicroservicesアーキテクチャへ移行したという話 [What We Got Wrong: Lessons from the Birth of Microservices](https://youtu.be/-pDyNsB9Zr0)があるが現在ではこの理由でMicroservicesをやる理由は少ないと思う）．

他にも利点として「サービスごとに独立したScalabilityを確保すること」「障害の局所化によりAvailabilityを向上すること」「小さなコンテキストで開発することによる生産性の向上・On-boardingコストを減少させること」などの利点が挙げられるが「パフォーマンスの最大化」が最も大きなモチベーションであるべきだと思う（現職では[更に先を考えている](https://speakerdeck.com/mercari/mercari-tech-conf-2018-keynote-suguru-namura-4d5253ac-b6b0-453f-87da-049307e01054?slide=13)ところに自分はやりがいを感じている）．

Microservicesアーキテクチャのプラクティスには「サービスごとにデータを持つこと」「データの非正規化を許容すること」「セルフサービス化」などMonolithアーキテクチャでは考えられないプラクティスが多く存在するがこれらはすべてこの「組織のパフォーマンスの最大化」につながる．Microservicesアーキテクチャを進める上で多くの意思決定を行う必要があるがこの初期衝動は常に頭においておきブレてはならない．

# Why NOT Microservices?

Microservicesアーキテクチャには「いつ採用するべきか?」について正確なアルゴリズムが存在しないという大きな問題がある．私的な意見を言えば，運用まで含めて各サービスに十分な人員を当てられない・将来的に当てられる予定がない，専用の基盤を構築する余裕がないならMicroservicesはやるべきではないと思う．むしろ負担・オーバーヘッドになってしまう．要するに規模は重要なファクターである．

Microservicesは上述したメリットに対するデメリットが多い．Microservicesエコシステムはそのデメリットを補うものに過ぎない．例えばService meshなどという複雑なシステムはMicroservicesをやらない限りほとんど必要ない．以下にデメリットと難しさ（とそれを補うエコシステム）をいくつか挙げる．

- Observabilityの難しさ．Monolithアーキテクチャに対して複数のサービスが関わるMicroservicesアーキテクチャにおいてはObservabilityの確保がとても難しい．個々のサービスのObservabilityを整備するのは当然のこと，サービスにまたがったPerformance問題を検出するためにDistributed tracingを整備し，サービス間でのDebuggabilityを高めるために統一的なログフォーマットを準備したり...を行う必要がある
- ネットワークの難しさ．Monolithのプロセス通信とは異なりMicroservicesではネットワーク越しの通信が当たり前になる．ネットワーク越しのリクエストが前提となるMicroservicesは分散システムである．[Fallacies of distributed computing](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing)（分散コンピューティングの落とし穴）にあるように「ネットワークは信頼できる」と思ってはいけない．リクエストが失敗したときにBack-offつきでRetryを行うこと，Timeoutを設定すること，適切なRate-limitをつけ異常なリクエストをブロックすること，対象のサービスが何らかの障害で死んでしまってもCircuit breakingでそれを回避することといったプラクティスの整備が求められる．これらを各サービスが整備しないといけない．これらの問題を解決しようとしているのがIstioを代表とするService  meshである．詳しくは["Service meshとは何か"](https://deeeet.com/writing/2018/05/22/service-mesh) に書いた
- セルフサービス化の難しさ．Microservicesの利点を最大限に活かすには各チームが独立して開発からリリース・運用を行える，つまりセルフサービス化が必須である．セルフサービス化を補助するツールは多く存在しているが，それらは「Operational maturity」の問題を解決しない．サービスチームが自分たちで運用を行えるようにするようには，IncidentのTrainingを実施したり，Production readiness checkのようなドキュメントを準備したり，DiRTやGamedayを実施したり...を行う必要がある．これらに関しては[The human scalability of "DevOps"](https://medium.com/@mattklein123/the-human-scalability-of-devops-e36c37d3db6a)や[Service Ownership @Slack](https://youtu.be/mwsfNio2Dho)，[Optimizing SRE Effectiveness at The New York Times](https://cloud.withgoogle.com/next/sf/my-schedule?session=OPS200)が詳しい．自分がやっていることは[Microservices Platform at Mercari](https://speakerdeck.com/mercari/mtc2018-microservices-platform-at-mercari)で話した．各社がこの問題に取り組んでいる．
- データの一貫性の確保の難しさ．各チームが独立して開発からリリース・運用を行うために各サービスごとに自分たちのデータストアを持つことになるが，それはサービスの特性にあったデータベースが選択される．Heterogeneousなデータベース界では分散トランザクションは実質不可能になる．このような状態での一貫性の確保ではOnline Event Prcessingのような仕組みが必要になる．また考え方も更新する必要がある．詳しくは ACM Queueの[Online Event Processing: Achieving consistency where distributed transactions have failed](https://queue.acm.org/detail.cfm?id=3321612)が詳しい
- サービス分割の難しさ．上述したMicroservicesの原則を満たすサービスのモデル化は容易ではない．特に既存のシステムからの移行はもとのデータ構造に引きずられることも多くそれらを丁寧に分解していく必要がある
- セキュリティの担保の難しさ．各チームが独立して開発からリリース・運用を行う一方で各サービスごとにセキュリティレベルを統一的に担保しないといけない（もちろん高いレベルが求められるサービスもあれば最低限を満たしておけば良いサービスもある）．そのために統一的なAuditをする，CI/CDパイプラインにおいてセキュリティのチェックを強制するといった仕組みが必要になる．コンテナ界隈でのエコシステムとしては Grafeasや Kritisがこれらの問題を解決しようとしている．

これらの問題を理解しつつそのコストを払ってでもMicroservicesアーキテクチャによる「組織のパフォーマンスの最大化」に利点を感じないといけない．

# Misconception

Microservicesではそれぞれのチームが自分たちのRequirementsやWorkloadに最も適した技術や言語（やフレームワーク）を自由に選択できるという利点がある，と言われる．しかしこれは完全なる自由を意味しない．完全な自由は逆に生産性の低下を引き起こす．そうではなく，共通レイヤー（基盤）の上にExtensibilityを許可するといったことが必要になる．ObservabilityやMonitoring，セキュリティや認証・認可，CI/CDといった直接ビジネス的な価値を出さないCross-cutting concernには統一的な方法があるべきである．そしてこれらはそれぞれの開発チームではなく専用の基盤チームが取り組むべきである．開発チームはビジネス的な価値に注力し，基盤チームはその開発チームのProductivityに注力する（[Design Microservice Architectures the Right Way](https://youtu.be/j6ow-UemzBc)，[10 Tips for failing badly at Microservices](https://youtu.be/X0tjziAQfNQ)）

「MicroservicesでPolygrotは避けるべき」なのはこの共通レイヤー（基盤）の構築のコストに直結するからである．専用のライブラリやツールの提供やドキュメントの整備やサポートなど1つの言語のエコシステムを作るには多大なコストがかかる．特にMicroservicesの初期は統一化のための模索が必要だが複数の言語やフレームの乱立は障壁になる．これはGoogleやNetflixなどを見てみてもわかると思う．あの組織規模でもメインで使われる言語は限定されている．利用する言語は組織の大きさ（基盤にさけるリソース）やMicroservicesの成熟度によって増やしていくのが良いと思う．

## References

- [Building Microservices](http://shop.oreilly.com/product/0636920033158.do)
- [Production-Ready Microservices](http://shop.oreilly.com/product/0636920053675.do)
- [A Philosophy of Software Design](https://www.amazon.com/dp/1732102201)
- [Monolith First by Martin Fowler](https://martinfowler.com/bliki/MonolithFirst.html)
- [Microservice Architecture at Medium](https://medium.engineering/microservice-architecture-at-medium-9c33805eb74f)
- [Microservices at Spotify](https://www.slideshare.net/kevingoldsmith/microservices-at-spotify)
- [Adopting Microservices at Netflix](https://www.nginx.com/blog/microservices-at-netflix-architectural-best-practices/)
- [Microservices at Netflix Scale](https://gotocon.com/dl/goto-amsterdam-2016/slides/RuslanMeshenberg_MicroservicesAtNetflixScaleFirstPrinciplesTradeoffsLessonsLearned.pdf)
- [Lessons Learned on Uber's Journey into Microservices](https://www.slideshare.net/InfoQ/lessons-learned-on-ubers-journey-into-microservices)
- [How we ended up with microservices at SoundCloud](http://philcalcado.com/2015/09/08/how_we_ended_up_with_microservices.html)
- [From Monorail to Monorepo at Airbnb](https://youtu.be/H7CiGAUNXHk?t=9271)
- [Design patterns for microservices](https://azure.microsoft.com/en-us/blog/design-patterns-for-microservices/)
- [Microservices on AWS](https://d0.awsstatic.com/whitepapers/microservices-on-aws.pdf)
- [Go + microservices = Go kit](https://speakerdeck.com/peterbourgon/go-plus-microservices-equals-go-kit)
- [Testing in Production, the safe way](https://medium.com/@copyconstruct/testing-in-production-the-safe-way-18ca102d0ef1)
- [Design Microservice Architectures the Right Way](https://youtu.be/j6ow-UemzBc)
- [10 Tips for failing badly at Microservices](https://youtu.be/X0tjziAQfNQ)
