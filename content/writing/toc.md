+++
date = "2016-06-29T10:31:00+09:00"
title = "Golangの新しいGCアルゴリズム Transaction Oriented Collector（TOC）"
+++

[http://golang.org/s/gctoc](http://golang.org/s/gctoc)

Goの新しいGCのProposalが出た．まだProposal段階であり具体的な実装はないが簡単にどのようなものであるかをまとめておく．

GoのGCはGo1.5において単純なStop The World（STW）からConcurrent Mark & Sweepへと変更され大きな改善があった（詳しくは["GolangのGCを追う"](http://deeeet.com/writing/2016/05/08/gogc-2016/)に書いた）．先の記事に書いたようにGo1.5におけるGCの改善は主にレイテンシ（最大停止時間）に重きが置かれいた．数値目標として10msが掲げられGo1.6においては大きなヒープサイズ（500GB）においてそれを達成していた．

GCの評価項目はレイテンシのみではない．スループットやヒープの使用効率（断片化の対処）なども重要である．Go1.6までのGCではそれらについて大きく言及されていなかった（と思う）．例えばスループットに関してはハードウェアの進化がそれを改善するはずであるという前提が置かれていた（["Go GC: Prioritizing low latency and simplicity"](https://blog.golang.org/go15gc)）．

今回提案されたTransaction Oriented Collector（TOC）アルゴリズムはGCのスループットを改善するものである．

## TOCアルゴリズムの経験則

Transaction Oriented Collector（TOC）アルゴリズムは「あるTransactionで生成されたオブジェクトはTransactionが終了すると同時にすぐ死ぬことが多い」という経験則に基づくアルゴリズムである．ここでいうTransactionとはいわゆる[ACID](https://en.wikipedia.org/wiki/ACID)における不可分な処理単位ではなく，Webサービスなどでリクエスト受けてレスポンスを返すまでの一連の処理を示す．

この仮定はGenerational GC（世代別GC）が利用している「多くのオブジェクトは生成されてすぐにゴミとなりわずかなオブジェクトだけが長く生き残る」という経験則に似ている．TOCアルゴリズムはこの経験則のGoなりの再解釈のようにも見える．

このTOCアルゴリズムの経験則はどこから来たか? Goが多くサポートしているCloudアプリケーションである．このようなアプリーションは，他のネットワークや他のGoroutineからメッセージを受け，それをUnmarshalし，それを使い計算をし，結果をMarshalし，それを他のネットワークやGoroutineに投げる．そしてそのGoroutineは死ぬか他のリクエストを受けるために停止状態になる．

リクエスト中での計算では大きなヒープからデータを読み込むことはあるかもしれないが典型的には書き込みは滅多に起きずヒープはTransaction間で一定になる．そしてGoroutine内で新たにアロケートしたオブジェクトは他のGoroutineに共有される（publish）かもしれないし共有されない（local）かもしれない．TOCアルゴリズムはこの共有されない場合の観測結果を使う，つまり「もしGoroutineがその中でアロケートしたオブジェクトを共有しない場合，そのオブジェクトはGC時に到達不可能になり関連するメモリ領域はすぐにアロケートできる」である．

TOCアルゴリズムの恩恵を受けるのは`net/http#Server`や`net/rpc#Server`を使ったアプリケーションであると想像できる．

## TOCアルゴリズムの実装の提案

TOCアルゴリズムの実装はProposalの[Examples](https://docs.google.com/document/d/1gCsFxXamW8RRvOe5hECz98Ftk-tcRRJcDFANj2VwCB0/edit#heading=h.aqj7hn20fsaw)をみるとわかりやすい．

（まず前提としてGoのGCのMarkはBitmapで管理されている．BitmapはオブジェクトのヘッダにMarkbitを持たせるのではなく関連するメモリ領域をBitのテーブルとして別で集中管理する手法である．これはCopy-On-Writeとの相性が良いなどがある）．

TOCアルゴリズムでは各Goroutineは2つのPointerをもつ．1つはCurrent Sweep Pointerである．このPointerはどこまでSweepを行ったか（Allocateしたか）を示す．もう1つはInitial Sweep Pointerである．これはそのGoroutine開始時のSweep Pointerを示す．この2つのPointerの間のオブジェクトはMarkされていようがMarkされていまいが「そのGoroutineで新たにアロケートされたオブジェクト」となる．そしてMarkされていないオブジェクトは共有されていない（Publishされていない）オブジェクトであるとする．

これをどのように実現するか? ライトバリア（Write barrier）を使う．このライトバリアはそのGoroutine内で新たにアロケートされたオブジェクトがInvariantであることを保証する．つまりそのオブジェクトが他に共有されればMarkをつける．

```bash
10011110010100101010100001001011010010110100101001011101010111101
　　　　^                 <- before  ^  after ->
　　　　Initial Sweep Pointer        Current Sweep Pointer     
```

（Proposalの図を拝借させてもらった．1は前回のGCで到達可能であったオブジェクト，もしくはGoroutineで新たにアロケートされそしてPublishされたオブジェクトである．BeforeとInitialの間にある0はアロケートされたがPublishされていないオブジェクトである．Afterにある0はまだアロケートされていないオブジェクトである）

あとはGoroutine終了時にCurrent Sweep PointerをInitial Sweep Pointerへと戻せば良い．新たにオブジェクトが生成されていようとそれが共有されていなければMarkは立っていないので，次回のGCサイクルを待たずに次回のSweepにおいてアロケートの対象になる．

## まとめ

簡単にGoの新たなGCのProposalを追ってみた．今後の実装とそれによる効果がどうなるかが楽しみである．



