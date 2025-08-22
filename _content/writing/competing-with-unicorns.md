---
title: "Competing With Unicornsを読んだ"
date: 2020-03-05T10:53:25+09:00
---

[Competing with Unicorns: How the World’s Best Companies Ship Software and Work Differently](https://pragprog.com/book/jragile/competing-with-unicorns) 

[The Agile Samurai](https://pragprog.com/book/jtrap/the-agile-samurai)の作者でありSpotifyにおいてAgile CoachとEngineerを努めた[Jonathan Rasmusson](https://twitter.com/jrasmusson)による本．本書はUnicornもしくはTech companyがどのようにチームをつくり，組織をスケールさせ，文化を作っているのかについて書いている．タイトルにUnicornとあり複数の企業を扱ってるように見えるが，基本的には作者のSpotifyにおける体験が基になっておりSpotifyの話が中心になっている．

[なぜMicroservicesか?](https://deeeet.com/writing/2019/05/20/why-microservices/)ではMicroservicesの最終ゴールは組織にあると書いた．これは共通の見解（のはず）である一方で，Microservicesにおいてどのような組織構造・チーム構成を作っていくのが良いのかについて具体的な例を基に書かれたものはあまり見たことがない．自分は組織作りにまで関われているわけではないし，専門でもないが，これまでいくかの記事，発表を見てきた中でもSpotifyはこれを非常にうまくやっているように感じていた．

Spotifyがどのようなチームや組織を作っているかについては[Scaling Agile @ Spotify](https://blog.crisp.se/wp-content/uploads/2012/11/SpotifyScaling.pdf)という2012年に公開されたブログが一番有名であると思う．そこではメインのコンセプトであるSquadやTribe，Guildという概念が紹介されている．また2019年にはその組織やエンジニアリング文化について紹介する20分の動画も公開されており（Spotify Engineering Culture [part1](https://youtu.be/Yvfz4HGtoPc)・[part2](https://youtu.be/vOt4BbWLWQw)）2012年からのアップデートがわかる．もう一つ自分が感銘を受けたのが[Breaking Hierarchy - How Spotify Enables Engineer Decision Making](https://youtu.be/gTXEXcGvnKk)というQCon New York 2019の発表で，そこではいかに組織のヒエラルキーをぶっ壊してエンジニアやチームに意思決定を促しているかについて紹介されている．

Competing with Unicornはこれらをより詳細にまとめた本になる．SquadやTribeによる組織構造や，各SquadのAutonomous（自律性）を保ちつつCompany betsによるAlignmentの方法，Productivityへの投資やこのような組織におけるLeadershipのあり方などについて詳しく解説されている．

# Squad and Tribe

SpotifyのようなUnicornではいかに組織を拡大していくかが大きな課題になる．スケールしつつもStartupのような俊敏さを失わないようにするのはとても難しい．Spotifyはこの課題を解決するためにSquad，Tribe，Chapter，Guildという組織構造を取り入れている．

![Screen Shot 2020-03-05 at 9 49 38](https://user-images.githubusercontent.com/1256183/75936972-f8449080-5ec6-11ea-8344-c67f9fe7b722.png)

まず一番基礎となる単位がSquadである．Squadは8人以下のメンバーで構成され，Mission vs. Projectで詳しく紹介するようにそれぞれにMissionが与えられMini-startupのように動けるように設計されている．Squadは自己組織化されており，何をどのようにつくるかという意思決定や，開発からリリース，運用までなるべく自分たちで完結できるようになっている．Squadが最も重要な単位でありその他のTribeやChapterはこれを補助するためだけに存在してる（この辺は[Team topologies](https://deeeet.com/writing/2020/02/06/team-topologies/)のTeam first thinkingと同じ）．SquadはCVとかにも書かれているし結構一般的に使われているっぽい．

同様のMissionをもったSquadをまとめたのがTribeである．例えば，App Integration Squad（Facebookなどのアプリケーションとの連携を行なう）やHome Consumer Electronics Squad（家電との連携を行なう）などをまとめてPartner and Platform Eeperience Tribeを構成する．Tribeは[Dunbar’s Number](https://en.m.wikipedia.org/wiki/Dunbar%27s_number)を基に40人から150人で構成され，Squadと同様にMissionを持つ．Tribeの利点は同様の課題を持ったSquadをまとめることでアイディアやコードなどを共有しやすくなることにある．自律性を保つためにSquadは協力はし合うが依存は少なくしている，Tribe間は更に依存はなくしている．

Tribe内部において特定の技術領域などでまとまったのがChapterである．例えばQA ChapterやWeb Engineer Chapterなどがある．それぞれのChapterにはChapter leadがおり採用から給与の決定，キャリアの開発などを担う．Chapterの利点はコミュニケーションを形成して最新の技術やよりよいプラクティスなどをやり取りできるようになる部分である．

Chapterを複数Tribe間にまで拡大したのがGuildである．例えばiOS Guildなどがある．ChapterとGuildの違いはGuildが基本的には任意のコミュニティであることである．iOS Guildに入るのにiOS開発者である必要はないしGuildの集まりに毎回必ず出席する必要もない．

以上が基本的なSpotifyの組織構造である（組織変更の仕方もとても興味深かった．一般的にはマネージャーなどが裏で話し合って決められるものだがたまにSquadの一覧をオフィスに張り出して後は自分たちで決めさせるということもやるらしい）．

# Mission vs. Project

Spotifyではトップダウン的にProjectが落とされていくのではなく，各SquadにはMissionが与えられている．Projectを避ける理由としては以下を挙げている．

- 短命であること：始まりがあり，終わりがある．終わったらそこで止まってしまう．プロダクト開発では最初のバージョンのリリースは終わりではなくて始まりなのに止まってしまう
- フィードバックの機会がないこと：プロダクト開発とはフィードバックループを回すことこそに意味があるがそれができない
- 厳格すぎること：リソースとやるべきことは予め決められており別のことを挑戦する余地がまったくない
- 考えなくなること：時間や予算という制約によって直感や学びを使うことができなくなる

ではMissionとは何かというと，Missionとはハイレベルの達成するべきゴールであり，会社の究極的な目的を達成するためにSquadが向かうべき方向性を示すものである．例えばSpotifyにおけるMissionには「Make disvoerying new music easy」（新しい音楽の発見を容易にする）だったり「Make listening ot music in the car the best experiece ever」（車内の音楽体験を最高のものにする）というものがある．Missionにより各チームをEngageさせ（チームに脳を使わせる），目的を与え，長期でものを考えることによりOwnershipをもたせることができるようになる．

これらのMissionを達成するために各Squadは自分たちでやるべきことやその優先度，その方法を自分たちで決定していく．より具体的には各SquadにはProduct Managerがいる．Product managerは社全体とSquadを繋ぎ，Squadの方向性を定め，チームとともに戦略やロードマップ，機能定義などを行なう（Product managerは元エンジニアが多くとてもTechnicalである．また強いLeadershipと交渉力などが求められる）．

# Autonomous vs. Alignment

Spotifyの組織で最も重視されているのはSquadのAutonomous（自律性）だと思う．与えられたMissionに対していかに各Squadが自律して動けるようにするかで組織や仕組みが作られている．Microservicesアーキテクチャもそれを達成するための1つの方法でしかない（Squad間のアーキテクチャ的な依存を減らし独立してリリースが行えるようにすることを目的にしている）．

Autonomous（自律性）が重視されている一方でSpotifyという会社全体としてのMissionと戦略へのAligmentも行われている（この原則を「Be autonomous, but don't suboptimize」と言っている）．AutonomousとAlignmentは同時には満たせないように思えるが以下の図はそれがどのような状態かをうまく説明している．

![Screen Shot 2020-03-05 at 8 25 30](https://user-images.githubusercontent.com/1256183/75933846-4d2fd900-5ebe-11ea-936f-05bf7bfed87b.png)

まず左下はAlignmentもなくAutonomyもない状態である．これは完全にMicromanagementの文化でありハイレベルのゴールはなくただ言われたことをやれという状態．左上の状態はAligmentは高いがAutonomyがない状態である．これはリーダーのコミュニケーション力が高く組織として向かうべき状態や問題が共有されてる．しかしリーダーはそれをどのように解決するべきかまで指示してしまっており自由度がない状態．右下はAlignmentはないがAutonomyがある状態である．これはカオスでリーダーは無意味で単純に皆が好き勝手やっている状態... 右上はAlignmentとAutonomyがある状態である．これはリーダーは組織として向かうべき状態と解くべき問題を共有できており，かつそれをどのように解決するかを各チームに移譲している状態．Spotifyが目指しているのはこの状態である．

具体的に全社的なプロジェクトを回すためにはCompany betsという仕組みを使っている．Company betsはあるQに会社として達成するべき問題を優先度順で提示するものである．例えば筆者が経験したものとして以下の例が挙げられていた．

1. Sony Playstation
2. Google Chromecast
3. Japan Kaunch
4. GDPR
5. Prepare for IPO

上の例ではPlaystation上でSpotifyを使えるようにすることが最も重要なことであり，それに関わるSquadsはそれに注力する．もしそこに関連がなければ次のGoogle Chromecastに注力する..．各Squadは基本的に自分たちのMissionとRoadmapを持っているがCompany betが提示されたら優先度順に自分たちのSquadに関わるものかを精査して関わるならそれを中心に動く．もしどれにも関わりがなさそうであれば基本的に自分たちのroadmapに従って動くことになっている．以下の図がわかりやすい．全社の30%くらいがCompany betsに動いているらしい．

![IMG_C09B2573F1ED-1](https://user-images.githubusercontent.com/1256183/75933862-59b43180-5ebe-11ea-8bfe-1d92af4b0b47.jpeg)

Company betsの提示の方法としてはDIBBというフレームワークを使っている．DIBBはData，Insight，Belief，Betの頭文字をとったものである．Dataは数字による現状の状態（事実），Insightはそこから得られる学びや結論，Beliefはそこから導き出される仮説，そしてBetはそれに基づくやるべきことを示す．以下は１つの例．Spotifyはこれを意思決定と議論に使っている．

![](https://blog.crisp.se/wp-content/uploads/2016/06/DIBB.png)

面白かったのは一番最初のCompany betsを始めたときに65くらいのBetsが出てきたという話... これは自分も昔大量のBacklogを提示していたことがあるので分かる...と思って読んでいた．Noと言うのがLeadの仕事であり，やるべきことを絞り本当に集中するべきことを提示しないといけない．

# Conclusion

他にも開発者のProductivityを改善することに注力するSquadがいることや，Feature flagとRelease trainによるリリースの方法，Dataに基づく意思決定の方法，文化の重要性とその育て方などが語られており面白かった．他にもSpotifyのこの文化がスウェーデン人（Spotifyはスウェーデン発）的なコンセンサスのとり方やボトムアップの精神などからきているという話はかなり興味深かった．

とても学びがあったが以下は意識しておきたい．

<blockquote style='border-left:4px solid #eee; padding-left:2em; font-size:18px; font-style: italic; margin:2em 0'>So take these models and ideas. Use them as inspiration for how others are working. But remember to adapt, embrace, and make them your own. While the underlying principles will always hold, implementing them at your place of work will require you to tweak and adapt.</blockquote>
