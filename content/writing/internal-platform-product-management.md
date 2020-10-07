---
title: "社内PlatformチームのProduct Management"
date: 2020-10-07T08:43:26+09:00
---

現職においてPlatform チーム（社内基盤チーム）として働き始めて2年近くがたった．このチームにおいて自分はTech Leadをメインに努めてきたが，同時にPlatformの「どのような機能を」「どのような優先度で」作るか? を決めるProduct Manager的な役割も果たしてきた（ちなみにTech Leadに関しては[メルカリのテックリードが学んだ、HowよりWhyを重視することが大切なわけ](https://engineer-lab.findy-code.io/how-to-why) で少し話した）．これは何度も失敗しながら悪戦苦闘しつつやってきたが自分たちなりのフレームワークをつくり実際に回すことができている．

未だに試行錯誤しているのでここで書いていることが正解だとは思っていないが，今後同じようにPlatformチーム的なことを始めるひとに向けて現状自分たちがどのようにやっているのかについて簡単にまとめておく（他の会社がどのようにやってるのかも聞きたいのでもし同じようなことをやってるひとがいたら会話しましょう!）．

本来なら会社のTech Blogとかに書くべき内容だが，技術的なことであれば自信を持って書けてもProduct Managementに関しては正直自信を持って書くことができない．上手くいったこともあるけどそうじゃないことのほうが多いと思う．動き始めていたプロジェクトを止めて大きく方向転換をすることになりチームに迷惑をかけてしまったこともある．今でもこれで良いのか?を試行錯誤している．そういうこともあり個人ブログで書くことにした．

以下ではまず大まかなアイディアについて簡単に紹介しその後「何を」「どのような優先度で」を具体的にどのように決めているのか?についてまとめる．

# Platformをプロダクトとして考える

これはすでに各所で言われていることだがInternal Platformをやるにあたって一番大切なマインドセットはPaltformを単なる「ツール」としてではなくて「プロダクト」として考えることだと思う．つまりPlatformを利用する社内の開発者をCustomerとしてみて，Customerに対してPlatformという「プロダクト」を提供していると考える．そしてそのCustomerのためにより良い機能の追加や改善を行う．例えば以下の記事が参考になると思う．

- [Applying product management to internal platforms](https://www.thoughtworks.com/radar/techniques/applying-product-management-to-internal-platforms)
- [Product for Internal Platforms](https://medium.com/@skamille/product-for-internal-platforms-9205c3a08142)
- [Product management in infrastructure engineering.](https://lethain.com/product-management-infra-engineering/)
- [Code less, engineer more - Increment: Teams](https://increment.com/teams/code-less-engineer-more/)

もちろんInternal PlatformはCloud Providerのように会社として外部に提供しているプロダクトではない．会社としてはメインのビジネスがある．その場合にPlatform Teamはどのような立ち位置になるかというと，直接的に会社のCustomerに価値を提供するのではなく，自分たちにとってのCustomerである開発者に価値を提供することで，開発者がよりよいサービスを開発できるようになり，間接的に会社のCustomerに価値を提供すると考える（もちろんインフラのReliabilityといった直接的な価値もあるが）．

こう考えると一般的なProduct managementとやるべきことの差は大きくはない．社内が対象であることによるコミュニケーションの違いだったり，対象がPlatformという技術に特化した領域であるくらいの違いしかない．サービスを開発するにあたって開発者がどのような課題を抱えているのかを見つけそれらに優先度をつけて順番に実行していくというのが大まかな流れになる．

# フレームワーク

Product managementの1つのゴールは具体的なRelease Sprintとして具体的にタスクにまで落とし込むことだと思う．ここではその大まかな流れについて紹介する．以下はそれを簡単に図にしたものである．

![Screen Shot 2020-10-07 at 8 52 01](https://user-images.githubusercontent.com/1256183/95272063-634daf80-087a-11eb-9dc9-5a9037e1f136.png)

まずチームとしてのMissionを持つ．次にMissionをもとに長期的なRoadmapを作る．そしてRoadmapをもとにRelease Sprintのタスクに落とし込む．以下ではこれらを具体的に紹介する．

## Vision & Mission

まず最初はPlatformチームとしてのVisionとMissionを決める．[What is company vision? A picture of a better place](https://knowyourteam.com/blog/2017/07/25/what-is-company-vision-a-picture-of-a-better-place/) の定義に従うと，Visionとはどこへ向かうのか（Where）を示し，Missionはそこへ向かうために何をするか（What）を示す．会社の中のチームの場合はもちろん会社のVisionにアラインしつつそこに向かうためにチームとして何ができるのかを考える．特にMissionの定義は責任の範囲を明確にしたり，無限にある問題空間を限定することにもつながる．

VisionとMissionを決めるにあたっては以下が参考になった．

- [re:Work - Guide: Set and communicate a team vision](https://rework.withgoogle.com/guides/managers-set-and-communicate-a-team-vision/steps/create-a-vision-with-the-team/)
- [Writing strategies and visions.](https://lethain.com/strategies-visions/)

## Roadmap

Missionができたらその次にRoadmapを作る．Roadmapは長期的に何をいつ提供するかを示す．例えば自分たちは1年の期間で四半期ごとに何をいつやるのかを簡単に示したドキュメントを準備してる（最初は3年でやっていたがメンテナンスが大変なので1年のものを定期的に見直す運用に変えた）．会社全体としてRoadmapがある場合はそれに沿う形で作る．

Roadmapを作る意義は大きく2つある．まず開発チームからするとどのような機能がいつ頃利用可能になるのかが明確になる．最近だと[GitHub public roadmap](https://github.com/github/roadmap) がとても良い例だと思う．次にPlatformチームのメンバーからすると今後何を作るかが分かるため，実装時の意思決定の助けになる．「3カ月後にこういうことをやります」と分かって書くコードと、知らないで書くのとでは全然違う．「次にこうするから今はこういう実装をしておけばOK」といった意思決定ができるになる．

以下の優先度の話にもつながることだがRoadmapを作るといかに「やれることが少ないか」が分かる．特にPlatformのような低レベルの変更は規模が大きく一つ一つが重くなりがちというものある．1年は短い．何をやるか?より何をやらないか?が大切だと言われるけど自分はRoadmapを自分で作り始めてからそれを実感できたと思う．

Roadmapの作り方に関しては具体的な参考文献がすぐに出てこないがCloud ProviderやGitlab（例えば [https://about.gitlab.com/direction/](https://about.gitlab.com/direction/) ）から多くを学んだと思う．

## 6-week Release Cycle

Roadmapをもとに実際のRelease Sprintに落とし込む．[How We Structure Our Work At Mercari Microservices Platform Team](https://speakerdeck.com/tcnksm/how-we-structure-our-work-at-mercari-microservices-platform-team) でも話したようにProject managementはBasecampの6-week release cycleを参考にしている．具体的には[Shape Up: Stop Running in Circles and Ship Work that Matters](https://basecamp.com/shapeup)が参考になる．

以下では上述したRoadmapやRelease cycleに入れる内容をどのように決めているのかについて簡単に紹介する．

# 何をやるか?

まずは「何をやるか?」=「解決するべき問題を特定をすること」から始まる．

Platformの文脈だと開発チームに対する「Empathy」を中心にこれを考えるのが大切だと思う（DevOpsの分脈とかでもずっと言われてることでもあるけど）．開発チームが困っていることは何か? Continuous Deliveryを素早く回すために障壁になっているものは何か? Reliabilityが低い原因は何か? を特定する．

少数規模でかつ開発チームとPlatformチームの距離が近い場合はこれはそんなに難しくない．普通にコミュニケーション取れてれば良い．ただ組織の規模が大きくなり多くのメンバーとのコミュニケーションのコストが高まってくると別の方法が必要になる．例えば自分たちは以下のような取り組みをしている．

- Developer Survey
- Office Hours

Developer Surveyは簡単なフォームを使って広く開発者から要望や意見を募る方法．自分たちは以下のようにGoogle formを使ってこれを行っている．具体的な質問としては「それぞれの開発のフェーズで課題に感じていることは何か」「Platformによるトレーニングを受けるとしたら何が聞きたいか」などがある．これは年に2回のペースで実施しており，結果はスライドにまとめてチームに共有している．この方法は[Optimizing SRE Effectiveness at The New York Times](https://youtu.be/QCRe-Vo-PPo) を参考にした．

![Screen Shot 2020-10-07 at 9 02 39](https://user-images.githubusercontent.com/1256183/95272652-e4597680-087b-11eb-94c5-0766fe4e6f88.png)


Office Hours は[マイクロサービスについて何でも聞けるOffice Hoursに参加したよ！](https://mercan.mercari.com/articles/2019-03-15-203446/) でも紹介されているが，週に一度開催してるPlatformチームに何でも聞いても良い会．この会のメインの目的はその瞬間に開発者が困っていることを解決することだが，これは同時に皆がどのような課題に直面してるのかを知る機会にもなっている．Office Hours自体はBasecampの[It Doesn't Have to Be Crazy at Work](https://basecamp.com/books/calm) に書かれているPracticeを参考にしてる．

もちろんこれらだけではなくて日常的なSlack上でのコミュニケーションやGithub IssueやPRでのやりとりからも課題は多く集めることができる．

課題を集めるときにそれが「問題」なのか単に「意見」なのか?を明確に区別する必要がある．例えば「Xの技術を使いたい」とかは「意見」であり「問題」ではない．「Xの技術を使いたい」という声よりも「なぜその技術が必要か?」という「問題」自体をちゃんと聞き出す．XはHowの1つでしかなくてそれが本当に意味のあるものなのかは問題・課題からしか導き出せない．最高のHowを提供するためには最高の問題定義が必要になる．

# どのような優先度でやるか?

解くべき問題を理解したら次はそれらをどのような優先度で取り組むかを決める．

Platformに関わらず問題は無限にある．全てを同時に取り組むことは不可能なので，どのような順番でそれに取り組むかという優先度決めは非常に重要な意思決定になる．

これはとても難しく，単純に要望の多いものを上から順番にとはならない．解くべき課題は開発者からの要望だけではない．Platformを運用してる限りその運用は重要なタスクの1つであり，例えばKubernernetsのUpgradeやSecuirtyパッチを当てるといったReactiveなタスクは常に降ってくる．長く運用すればするほど一時的な意思決定による負債も貯まる．また長期的なScalabilityの確保やOperationの改善，新しい要素技術の選定などPlatformチームとしての取り組みたいことも多くある．これらを総合的に考慮して意思決定をする必要がある．

この意思決定のフレームワークとして自分はWill Larsonによる[How to invest in technical infrastructure](https://lethain.com//how-to-invest-technical-infrastructure/) を参考にしてる（Will LarsonはUberやStripeのPlatformチームのEMとDirectorを努めてきたひとで[Elegant Puzzle](https://lethain.com/elegant-puzzle/)の作者でもある．以下はStripeでの事例が元になっている）．これによるとPlatformのタスクは以下の3つに分類することができる．

![ti-many-teams](https://user-images.githubusercontent.com/1256183/95272788-46b27700-087c-11eb-8919-4e3c627a3c53.png)

このグラフの横軸はタスクの時間軸で，Short-termは短期で終わるタスクでLong-termは長期のタスクである．縦軸はそのタスクが強制的（Forced）か任意か（Discretionary）を示す．例えば左上にいくほど今すぐやらないといけない短期的なタスクで，右下にいくほど長期的かつ任意のタスク（例えば研究など）になる．大きなタスクの分類としては左から「User asks」「Platform quality」「Long term key initiatives 」が挙げられる．それぞれの意味は以下．

- User asks: 開発者の問題を解決するタスク
- Platform quality: Securityや技術的負債などPlatformの質を担保するタスク
- Long term key initiative: 長期的な投資のためのタスク

Will Larsonはこれらを40:30:30でバランスをとるのが良いとしている．自分たちは完全にこの比率に沿っているわけではないが分類を含めて参考にしている．

また以下のような観点も優先度を決める際には重要になる．

- Business
- Return on Investment（ROI）
- Service Level Objective（SLO）

まず「Business」は最も強い観点になる．ビジネスとしてある機能やサービスをリリースするために必要な機能がPlatformにないならまずはそれに取り組む必要がある．それらが達成できないならPlatformとしての価値はない．初期はこれが支配的になると思う．会社がOKRを採用してる場合はそれは最も考慮するものになる．

次に「Return on Investment（ROI）」．これはチームとかにもよく言うことだが「80%のユーザのために仕組みを作るのがPlatformである」と自分は思っている．ある問題を解くことでより多くのユーザにとって価値を提供できるならそれを取るべき．[Systems thinking](https://en.wikipedia.org/wiki/Systems_theory#Systems_thinking)も役に立つと思う．Systems thinkingはシステムの全体やパイプライン全体を見渡して一番ボトルネックになっている部分を特定することである．それが特定できば解決したときのROIは大きくなる．

最後は「Service Level Objective（SLO）」．PlatformとしてReliabilityは非常に重要．具体的には[SRE Practices in Mercari Microservices](https://speakerdeck.com/tcnksm/sre-practices-in-mercari-microservices) で話したがSLOはReleaseのタスクの意思決定に使って初めて意味を持つ指標だと思う．

# どう作るか?

![Making-sense-of-MVP-](https://user-images.githubusercontent.com/1256183/95272890-8da06c80-087c-11eb-8287-1722db245f70.jpg)

[Making sense of MVP (Minimum Viable Product) - and why I prefer Earliest Testable/Usable/Lovable - Crisp's Blog](https://blog.crisp.se/2016/01/25/henrikkniberg/making-sense-of-mvp)

問題を特定し優先度を決めたらあとはそれを作っていくだけだが「どう作るか？」もProduct management的な考え方は参考になる．Platformの機能であっても上の図のようにMVPやPoCを作り細かくイテレーションを回すということをしている．

具体的には，新しい機能は「Alpha」「Beta」「GA」というフェーズを設けて段階的にリリースするようにしている．強い要望を出してくれた開発チームにまずは機能を公開して使ってもらう．そしてフィードバックを受けて改善を行いさらに広くユーザを募る，を繰り替えす．この手法は一般的な「顧客のほしかったもの」を失わないためでもあるし，Platform的な視点だとScalabilityとかをちゃんと確保しながら進めるという観点もある．

# Slackを考える

最後に上述したような何をやるのか? の意思決定をする立場の人が持つべき観点について書いておく．

以下はWill LarsonがElegant puzzleで書いているチームの4つ状態である．

![](https://user-images.githubusercontent.com/1256183/73893894-43ff1c80-48be-11ea-874d-df8618d01e95.jpeg)

これによるとチームは左から右の状態へと進んでいく．左は初期でやるべきこと（Backlog）が大量にありその消化に追われている状態．右はBacklogの消化が安定しInnovativeなことに時間を使える状態．Platformを初めてすぐは必ず左の状態になるが，機能をちゃんとつくり採用が上手くいけばどんどん右の状態へと移行することができる．

右の状態になったときに重要なのは何かというと「Slack」=「余裕」だとWill Larsonは書いている．Backlogが消化できているからといってどんどん要望をぶっ込んでいっていいかというとそうではない．むしろメンバーには「Slack」を持たせることが大切である．それによって新しいことへの挑戦が可能になり，Innovativeな仕組みが生まれる可能性がある．テックカンパニーに必要なものは何か?と聞かれたときに自分は「Slack」だと答える．

この観点はタスクの意思決定をするときに持つべきものだと思う．

# まとめ

自分が悪戦苦闘してきた社内PlatformにおけるProduct managementについて書いた．これらは基本はPlatformチームが1チームだったときの経験をもとに書いている．[どのようにPlatformチームの組織変更をしたか](https://engineering.mercari.com/blog/entry/2020-07-16-083548/)に書いたように今は1チームではなくて複数のチームで構成されるグループになっている．この場合は複数のチームの独立性と保ちつついかに同じ方向を皆で向くかという別の課題が出てくる．これらに関してはまた知見が溜まったときに書く．

# 参考文献

以下は本文中に載せていないPlatformに関わる参考文献．

- [What I Talk About When I Talk About Platforms](https://martinfowler.com/articles/talk-about-platforms.html)
- [The Rise of Platform Engineering](https://softwareengineeringdaily.com/2020/02/13/setting-the-stage-for-platform-engineering/)
- [What it takes to be a Platform Engineer in 2020](https://ao.gl/what-it-takes-to-be-a-platform-engineer-in-2020/)
- [The process: How Twilio scaled its engineering structure - Increment: Teams](https://increment.com/teams/how-twilio-scaled-its-engineering-structure/)
- [The human scalability of "DevOps"](https://medium.com/@mattklein123/the-human-scalability-of-devops-e36c37d3db6a)
