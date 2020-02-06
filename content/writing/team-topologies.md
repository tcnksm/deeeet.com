---
title: "Team Topologiesを読んだ"
date: 2020-02-06T10:05:05+09:00
---

[https://teamtopologies.com/](https://teamtopologies.com/)

DevOps consultantとして技術と組織の両面からDevOpsの支援を行なってるMatthew SkeltonとManuel Paisによる本．Consultant本は大体中身が薄く感じることが多くなり手に取ることは少なくなってきたが，各所で見かけたり，2人によるDevOpsにおけるチームのあり方のパターンをまとめた[What Team Structure is Right for DevOps to Flourish?](https://web.devopstopologies.com/)が良かったので読んでみた．

本書はDevOpsの視点から高速なDeliveryを実現するためにどのようなチームや組織を作るべきかについてまとめている．個人ではなくチームをDeliveryの最も重要な単位と考え（Team first-thinking），チームが最大限にパフォーマンスを発揮するために，チームの人数やその責任の範囲のデザインの仕方（Team API）から，基本的なチームタイプ（Fundamental team topology）やそのチーム間のコミュニケーションパターン（Team interaction mode）とそれをどのようの変化させていくか（Organizational sensing・Topology evolution）が紹介されている．また理論だけではなくてCase studyとして各社の事例も各章で紹介されている．

本書は大きく3つのPartからなる．Part1ではConwayの法則を再考しつつ現実の組織がいかにアーキテクチャやコミュニケーションパターンが考慮されていないか?という本書で解こうとしている問題がまとめられている．以降のPartはその解法としてPart2は基本的なチームタイプについてPart3はそのチームのコミュニケーションのパターンとそれをいかに進化させていくかについて紹介される．以下ではこれらを簡単にまとめておく．

## Team-first Thinking

本書に限らず多くのところで述べられているように「小さく長期的に安定した」なチームを作ることは非常に大切である（例えば [How Twilio scaled its engineering structureとか](https://increment.com/teams/how-twilio-scaled-its-engineering-structure/)[How to build a startup engineering team](https://increment.com/teams/how-to-build-a-startup-engineering-team/)など）

「小さな」は本書では具体的には5-9人である．この人数の根拠として[Dunbar’s Number](https://en.m.wikipedia.org/wiki/Dunbar%27s_number)を使っている．Dunbar NumberはDunbarが提唱した人間が安定的な社会関係を維持できるとされる人数の認知的な上限である．簡単に言うと何人までは互いに信頼でき，何人までは覚えていられるか？という人数のラインを示している．これをMicroservicesの組織の形態でよく使われてるSpotifyのチームの形（[Scaling Agile @ Spotify](https://blog.crisp.se/wp-content/uploads/2012/11/SpotifyScaling.pdf)）に落とし込むとSquadが8-10人，Tribeが50-150人，Divisionが150-人となりチームの粒度はそのグルーピングの限度の指標に利用できる．またコミュニケーションのリンクの数からも「小さな」が良いことは理解できる（以下はチームの人数とそこでのコミュニケーションのパスの数 ．12人でも既に66もある．[Two-Pizza Teams: The Science Behind Jeff Bezos' Rule](https://blog.nuclino.com/two-pizza-teams-the-science-behind-jeff-bezos-rule)）

![https://blog.nuclino.com/files/227d9349-2588-4845-a420-3f4eb6c61fdc/team-members-links.png](https://blog.nuclino.com/files/227d9349-2588-4845-a420-3f4eb6c61fdc/team-members-links.png)

「長期的に安定」するべきはのは，チームとは互いに信頼し合い働き方や考え方を一致させて初めて高いパフォーマンスを出せる（[Tuckman's stages of group development](https://en.m.wikipedia.org/wiki/Tuckman%27s_stages_of_group_development)）ものであり，それには時間がかかるためである．プロジェクトの度にチームがコロコロ変わっていてはチームとしてのゲル化は進まずパフォーマンスも上がらない．逆に高いパフォーマンスのチームを分けたりするとProductivityは一気に落ちる．

「長期で安定した」チームを持つことで初めてOwnershipについて考えることができるようになる．Ownershipとは「Continuity of care」を持つことであり，チームはそれによって段階的に長期にものを考えることができるようになる．目の前の問題を解決する段階から，数ヶ月先のこと考えて実験を行う段階へ向かうことができるようになる．NetflixがどのようにOwnershipを育てているかについて語っている[Mistakes and Discoveries While Cultivating Ownership](https://youtu.be/ddOGmao_cnA)ではOwnershipのLevelを定義しており，目指すべきところ（かつLeadershipがメンバーに持たせるのは）は「Vision」であるとしている．「Vision」はまさに長期で目指すべきところを考えることに他ならない（これをさらに組織全体でTribeレベルでもできてるのがSpotify [Breaking Hierarchy - How Spotify Enables Engineer Decision Making](https://youtu.be/gTXEXcGvnKk) ）．

![https://user-images.githubusercontent.com/1256183/73893817-09957f80-48be-11ea-889b-a160fe8faaf5.png](https://user-images.githubusercontent.com/1256183/73893817-09957f80-48be-11ea-889b-a160fe8faaf5.png)

以下はStripeの[Will Larson](https://twitter.com/lethain)が[Elegant puzzle](https://www.amazon.com/dp/1732265186/)で書いているチームの4つ状態である．「長期に安定」チームによりチームはInnovativeな状態を目指すことができる．

![https://user-images.githubusercontent.com/1256183/73893894-43ff1c80-48be-11ea-874d-df8618d01e95.jpeg](https://user-images.githubusercontent.com/1256183/73893894-43ff1c80-48be-11ea-874d-df8618d01e95.jpeg)

さらにその「小さく長期的に安定した」なチームの責任が大きすぎないか，認知負荷が高すぎないか？も意識する必要がある．1つのチームが多くの責任を持ちすぎると認知負荷がチームのキャパシティを超え始める．そうなるとDeliveryのスピードは遅くなり他のチームのボトルネックになりメンバーのモチベーションや熟達（Mastery）にも影響を与え始めてしまう．組織は既存のメンバーの認知不可を超えてソフトウェアのサブシステムを増やしてはいけない．

![https://user-images.githubusercontent.com/1256183/73894016-8d4f6c00-48be-11ea-93a0-0cc4dafde782.jpeg](https://user-images.githubusercontent.com/1256183/73894016-8d4f6c00-48be-11ea-93a0-0cc4dafde782.jpeg) 

## Fundamental Team Topologies

役割の曖昧な複数のタイプのチームがあると全体像が曖昧になりどのチームがどの責任を持っているのかがわかりくくなる．そのため持つべきチームのタイプは制限するべきである．本書が提案する基礎となる4つのチームは以下．

![https://user-images.githubusercontent.com/1256183/73894183-0222a600-48bf-11ea-9c74-849f0332dca3.jpeg](https://user-images.githubusercontent.com/1256183/73894183-0222a600-48bf-11ea-9c74-849f0332dca3.jpeg)

- Stream aligned team: ビジネスドメインにAlignしその開発フローを回すチーム．例えばサービスやプロダクト，複数機能のセットや1つのUser journeyやUser personaで区切ることができる．ビジネスにとって最も重要なチームであり，それ以外のチームはこのチームの負担を減らすために存在する
- Enabling team: 機能開発で時間がないチームに対して新技術やプラクティスの導入を支援していくチーム．メルカリでいうとSolution teamがこれに近いのではないかと思う．永久にそのチームにいるわけではなくて一時的にチームに参加しそのチームが自律して動けるようになることを目標とする．SREもこれに近いと思っている（[The SRE model](https://medium.com/@rakyll/the-sre-model-6e19376ef986)）
- Complicated sub-system team: 専門知識が必要な複雑なサブシステムを開発運用するチーム．例えば画像処理やリアルタイムシステムなど．Stream alinged teamの認知不可を減らしていくのが目的．
- Platform team: Stream aligned teamが自律してSDLCを回せることを補助するためのチーム．メルカリでいうと私が所属するMicroservices Platform teamがこれに当たる（[開発者向けの基盤をつくる](https://speakerdeck.com/tcnksm/kai-fa-zhe-xiang-kefalseji-pan-wotukuru)）

これだけではなくてPlatform teamに関してはこれはフラクタル的になりPlatform team内に同様のチームを持つようになる．つまりObservabilityやDeliveryに特化したStream aligned teamがあり，それらを動かすためのPlatformのPlatformがあるようになる（まさに同じことをやろうと思っていた）．

そしてこれらのコミュニケーションパターンは以下の3つに分けられる．

- Collaboration: 他のチームと一緒に働く．
- X-as-a-Service: コラボレーションを最小にしてツールやAPIを提供する．例えばStream aligned teamとPlatform teamの関係はこれが理想．
- Facilitation: 他のチームの補助する．例えばStream aligned teamとEnabling teamの関係はこれにあたる．

どのようにチームがコラボレーションするかはソフトウェアのあり方にも直結する．例えばStream aligned teamとPlatform teamがCollaborationをするとそれが前提のツールやAPIしか作られずStream aligned teamはPlatform teamの補助なしでは動けなくなってしまう．またこれらは静的なものでもない．Stream aligned teamとComplicated sub-system teamはCollaborationをしつつベストなBoundaryを探して最終的にX-as-a-ServiceとなりStream aligned teamはAPIを通してそのsub systemを使うだけになる状態を目指していくのが理想である．チーム間のコミュニケーションのあり方は，理想の状態を定義した上で動的に進化していくべきものである．

どのTopologyを選択するべきかのベストな解はない．メンバーのスキルやLeadership，目指したいアーキテクチャやビジネスゴールを念頭においてTopologyを選択する必要がある．少なくともチームを変えすぎると生産性は崩壊するので頻度は減らしつつ局所最適するのではなく組織全体を見てどうするべきかを考えないといけない．

## Conslusion

今の自分にとってとても学びの多い本だった．本書はMicroservicesアーキテクチャが前提ではないが，書かれている内容はMicroservicesアーキテクチャの上で実現するべきチームや組織のあり方であり，現実にすぐにフィードバックできる内容だったと思う．またプロダクトチームについてだけではなく，自分が所属しているPlatform的なチームがどうあるべきかについても書かれており指針となった．
