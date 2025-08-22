+++
date = "2016-05-24T08:07:56+09:00"
title = "Known unknowns"
+++

["Systems Performance: Enterprise and the Cloud"](https://www.amazon.co.jp/Systems-Performance-Enterprise-Brendan-Gregg-ebook/dp/B00FLYU9T2) をずっと読んでいる．この本はNetflixの[Brendan Gregg](http://www.brendangregg.com/)氏がJoyent時代に書いた本である．その名の通りLinux（とSolaris）のシステムのパフォーマンスの本である（とにかく一つ一つが丁寧かつ深く解説されておりページをめくるごとに学びしかないのでパフォーマンスに関わるひとは今すぐ読むと良い）．

この本で一貫して現れてくる，通底するのが，known-knowns，known-unknownsそしてunknown-unknownsという概念である．元ネタは[Donald Rumsfeld](https://en.wikipedia.org/wiki/Donald_Rumsfeld) 氏の会見でのコメントだが（cf. [There are known knowns](https://en.wikipedia.org/wiki/There_are_known_knowns)），複雑なシステムのパフォーマンスの重要な原則を集約している．良い概念なので簡単に紹介する．

それぞれをパフォーマンスの観点から説明すると以下のようになる．

- **known-knowns** - 知っていること．そのパフォーマンスのメトリクスをチェックするべきことを知っているし，現在の値も知っている．例えば，CPUの利用率をチェックするべきことを知っているし，その平均的な値が10%であることも知っている
- **known-unknowns** - 「知らないこと」を知っていること．そのパフォーマンスのメトリクスをチェックできること，そのようなサブシステムが存在してることを知っているが，まだそれらを観測したことがない（知らない）．例えば，profilingによって何がCPUを使いまくっているのかチェックできるのを知っているけどまだそれを実施してない．
- **unknown-unknowns** - 「知らないこと」を知らないこと．例えば，デバイス割り込みがCPUを多く消費することを知らず，そのためチェックしてないかもしれない．

パフォーマンスというのは「知れば知るほど知らないことが増える」という分野である．システムについて学べば学ぶほど，unknown-unknownsに気づき，それはknown-unknownになり，次回からはそれをチェックできるようになる．

そしてこれはパフォーマンスに限った話ではない．
