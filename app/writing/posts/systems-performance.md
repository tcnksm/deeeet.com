+++
date = "2016-11-07T09:25:18+09:00"
title = "Systems Performanceを読んだ"
+++

[Brendan Gregg](http://www.brendangregg.com/)による["Systems Performance: Enterprise and the Cloud"](https://www.amazon.co.jp/Systems-Performance-Enterprise-Brendan-Gregg-ebook/dp/B00FLYU9T2)を読んだ．

Linux（Solaris）のパフォーマンスの分野でBrendan Greggという名前を聞いたことがあるひとは多いと思う．名前を知らなくてもが書いている[ブログ](http://www.brendangregg.com/blog/index.html)やカンファレンスでの[発表資料](http://www.slideshare.net/brendangregg)を見かけたことはあると思う．また彼が開発した[Flame Graph](http://www.brendangregg.com/flamegraphs.html)にお世話になってるひともいるのではないか（ref. [GolangでFlame Graphを描く](http://deeeet.com/writing/2016/05/29/go-flame-graph/)）．とにかくパフォーマンスに関して常に先端にいるひとである．

そんな彼がSystems（ここでいうSystemsとはCPUやメモリといったハードウェアとKernelやOSといったソフトウェアを指す）のパフォーマンスについて内部のアーキテクチャーを含め徹底的に解説したのが本書である．面白いに決まってる．

本書の根底にある考え方は前書きに書かれているknown-knowns，known-unknownsそしてunknown-unknownsという考え方である（詳しくは[Known unknowns](http://deeeet.com/writing/2016/05/24/known-unknowns/)に書いた）．パフォーマンスのチューニングやボトルネックについて考えるとき僕らは何がknownで何がunknownであるかに意識的にならないといけない．このような前提があり本書は各コンポーネントやソフトウェアを低位なレベルから詳細に紐解いていく．

詳細であるから良いというわけではない．僕はLinuxについてより深い理解を得たいと思ったときにO'Reillyの[Linuxシステムプログラミング](https://www.amazon.co.jp/dp/4873113628)や[詳解Linuxカーネル](https://www.amazon.co.jp/dp/487311313X)といった本に助けを求めた．これらは学びはたくさんあったが淡々と事実が並べられるだけで素直に面白いとは思えなかった（特に詳解...は全てを読むことはやめてリファレンス的にしか使っていない．それゆえ辞書と呼ばれるのだろう）．

本書が面白いのは「パフォーマンス」という明確なゴールをもった上で低位な部分を解説しているところだと思う．例えばCPUについてアーキテクチャーはこうでスケジューラーはこうなっていてと説明をしながらここがパフォーマンスで問題になるといった説明をする．なぜこれが良いか？を考えた時に結局そこが日々の業務に直結するからだろうと思った．闇雲に深いレベルことを学んでも知識にはなっても業務には生かせない（もちろん大切なことだと思う）．

目次は以下のようになっている．

1. Intro
2. Methodology
3. Operating Systems
4. Observability Tools
5. Applications
6. CPUs
7. Memory
8. File Systems
9. Disks
10. Network
11. Cloud Computing
12. Benchmarking
13. Case Study

本書はまずMethodology（方法論）から始まる．これが良い．パフォーマンスの何が難しいって「どこから始めるか？」である．もちろん熟練したひとたちにはそれなりのスタイルなどはあると思う．例えばNetflix（これはBrendanが書いてるが）の [Linux Performance Analysis in 60,000 Milliseconds](http://techblog.netflix.com/2015/11/linux-performance-analysis-in-60s.html)や[@y_uuk1](https://twitter.com/y_uuk1)くんの[Linuxサーバにログインしたらいつもやっているオペレーション](http://blog.yuuk.io/entry/linux-server-operations)がある（これは本書だとTool Methodになるかな）．これらは会社ごとに特化したものであって，よりGeneralなものは明確に言語化されてるとは言いがたいのではないかと思う．だから適当にググってヒットしたコマンドをとりあえず試してみる，といったことになる．方法論は僕のようにパフォーマンスに苦手意識を持っている人間に道筋を与えてくれるものだった．例えば[USE Method](http://www.brendangregg.com/usemethod.html)はすぐに役に立っている．

それ以降はOSやCPU，メモリそしてネットワークに関しての詳細な説明が続く．各章の枠組みは一致していて基本的な用語の解説から始まり，コンセプト，アーキテクチャー，そしてそのコンポーネントで使える方法論（具体的なコマンドなど）が説明される．どのコンポーネントも徹底的に解説され非常に勉強になる．本書で特徴的なのはLinuxだけではなくSolarisについても言及されるところだろう．別のOSについての理解/比較は今自分が使っているOSへの深い理解にもつながる（Solarisについては流す程度で読んだけどあのTracabilityは良いなあと思ってしまったよ！）．

そしてCloud Computingの解説もある．これは近年避けられないテーマだ．OS virtualizationとHardware virtulizationそれぞれについて解説し比較が行われる．ホスト側とゲスト側の両方の視点がある．もちろんパフォーマスに関して留意するべきことも紹介される．

Benchmarkingの章は「There are lies, damn lies and then there are performance measures」という言葉から始まる．ベンチマークを行う側，そして読む側が何に気をつければ良いかについて理解できる．「ベンチマークの結果についてその結果の分析に1週間かけていなければそれはきっと間違っている」とまで言い切っている．

最後のCase Studyもとても面白かった．この章は前章で解説してきたことの集大成的な章になっている．ここではBrendannが実際に対応したパフォーマンスの問題について，彼が何を考え，どのような方法論でそれに立ち向かい，誤り，そしてそこからどのように解決に向かったが語られる．ここは結構彼の人となりが出ていて笑いながら読んだ（どんなけDtrace使いたくなってるんだとかね）．熟練のひとが何を考えているのか知れるのは方法論とは違った道筋を与えてくれる．また初心者はこの章を先に読んでも良いと勧められている．本書で解説されるものごとの意義がより伝わりやすくなるからだろう．

## まとめ

紙の本で700ページ以上もあり他の本に浮気しつつ読むのに半年以上もかかってしまった．それでも上でべた褒めしたようにどのページをめくっても学びしかなかった．僕はこの本を何度も読み直すと思うし多くのひとに勧めたいと思う．少し高いがそれ以上の価値はあると思う．今後インフラ界隈（DevOpsやSRE）の必読書になっていくでしょう．オススメです．

もともとは[@y_uuk1](https://twitter.com/y_uuk1)が読んでいたのを見て読み始めた．本当に良い本を紹介してくれてありがとう
