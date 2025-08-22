+++
date = "2016-05-29T14:22:17+09:00"
title = "GolangでFlame Graphを描く"
+++

アプリケーションのパフォーマンス問題の解決やチューニングで大切なのは問題のコアやボトルネックに最短パスで到達することである．

基本的なパフォーマンス分析の入り口はアプリケーションのスレッドがon-CPUで時間を消費しているかoff-CPUで時間を消費しているかを理解するところから始まる．on-CPUの場合はそれがuserモードかkernelモードかを特定し，さらにCPUプロファイリングによってどのcode pathがCPUを消費しているのかの分析に向かう．off-CPUの場合はI/OやLock，pagingといった問題の分析に向かう．

[Flame Graph](http://www.brendangregg.com/flamegraphs.html)はon-CPUでのパフォーマンスの問題が発覚した時に行うCPUプロファイリングを助ける．どのcode pathがボトルネックになっているのかを1つのグラフ上で理解できる．本記事ではFlame Graphとは何か? なぜ必要なのか? を解説しGoのアプリケーションでそれを用いるために方法を解説する．

## Flame Graphとは何か?

[Flame Graph](http://www.brendangregg.com/flamegraphs.html)はCPUプロファイリング結果をvisualizeしたグラフである．元Joyent，現Netflixの[Brendan Gregg](http://www.brendangregg.com/index.html)氏によって開発された．例えば以下はMySQLのCPUプロファイリング結果をFlame Graphで描画したものである．

![](http://www.brendangregg.com/FlameGraphs/cpu-mysql-filt.svg)

### CPU プロファイリング

CPUプロファイリングの共通のテクニックはStack traceのサンプリングである．Stack traceというのは関数コールのリストで，code pathの先祖を追うことができる．例えば，以下はGolangのstack traceで子から親へStackと辿ることができる．

```bash
syscall.Syscall
syscall.write
syscall.Write
os.(*File).write
os.(*File).Write
log.(*Logger).Output
log.Printf
```

### Flame Graphの初期衝動

CPUプロファイリングの出力は往々にしてverboseである．例えば，Brendan Gregg氏がFlame GraphをつくるきっかけとなったプロダクションのMySQLのプロファイリングの出力は500,000行近くもあったという（[参考画像](http://www.slideshare.net/brendangregg/blazing-performance-with-flame-graphs/16)...やばいw）．

Flame Graphはそのような膨大なCPUプロファイリングを一つのグラフ上で直感的かつ簡単に理解するために開発された．

### Flame Graphの読み方

以下はFlame Graphを単純化したものである．

![](http://deliveryimages.acm.org/10.1145/2930000/2927301/gregg6.png)

- Stack traceは長方形のボックスの列で表現される．1つ1つのボックスは関数（Stack frame）を示す
- y軸はStackの深さを示す．一番上のボックスはStack traceが収集された時にon-CPUであった関数であり，その下にあるボックスはすべて先祖になる．あるボックスの下にあるボックスはその関数の親である（高いほど悪いわけではない）
- x軸はその関数のSampleの割合を示す．**時間ではない**．それぞれの関数はアルファベット順にソートされているだけ
- それぞれのボックスの幅はその関数の出現頻度を示す（長いほどStack trace中に多く登場したこと意味する）
- 色には特に意味はない

ではこのFlame Graphからどのようなことがわかるか?

- Q. 最もon-CPUだったのはどの関数か? 
    - A. `g()`（グラフの一番上を見れば良い）
- Q. なぜ`g()`はon-CPUなのか?
    - A. `a()` -> `b()` -> `c()` -> `e()` -> `f()` -> `g()`（y軸を見る）
- Q. `b()`と`h()`を比べると?
    - A. `b()`は`h()`より多く登場した（およそ5倍）（ボックスの幅を比較する）
- Q. なぜ`g()`を実行しているのか
    - A. `a()`が`b()`を選択し，`d()`が`f()`を選択したため

## GoでFlame Graphを描く

GoでFlame Graphを描くにはUberの[go-torch](https://github.com/uber/go-torch)を使えば良い．Gopherfest Sprint 2016の[Parashant](https://github.com/prashantv)氏の発表["Profiling and Optimizing Go"](https://www.youtube.com/watch?v=N3PWzBeLX2M)でこの`go-torch`を使ってパフォーマンスをチューニングする様子が観れる．ライブデモが華麗すぎて感動するので今すぐ観ると良い．

### Goのプロファイリングの基礎

Goにはプロファイリングのためのパッケージが標準で準備されている．Webサーバーであれば`net/http/pprof`，通常のツールであれば`runtime/pprof`を使う．`runtime/pprof`についてはRuss Coss氏の["Profiling Go Programs"](http://blog.golang.org/profiling-go-programs)を読むと良い．ここでは`net/http/pprof`を使って解説をする．

`net/http/pprof`を使ってプロファイリングを有効にするのは非常に簡単である．以下をコードに追加すればよい．

```golang
import _ net/http/pprof 
```

これだけで`/debug/pprof`というエンドポイントが新たに追加される．ここでは現在動いているgoroutineのStackやHeapの状態，GCの実行状況などを確認することができる．

このエンドポイントを`go tool pprof`で解析するには以下のようあコマンドを叩けば良い（`go-wrk`などである程度ロードを与えておくと良い）．

```bash
$ go tool pprof -seconds 5 http://localhost:9090/debug/pprof/profile
```

するとインタラクティブなモードが始まり，以下のような専用のコマンドでプロファイリング結果を確認できるようになる．

```bash
$ (pprof) top10
3400ms of 3770ms total (90.19%)
Dropped 60 nodes (cum <= 18.85ms)
Showing top 10 nodes out of 98 (cum >= 30ms)
flat  flat%   sum%        cum   cum%
1680ms 44.56% 44.56%     1680ms 44.56%  syscall.Syscall
1030ms 27.32% 71.88%     1040ms 27.59%  syscall.Syscall6
190ms  5.04% 76.92%      190ms  5.04%  runtime.kevent
140ms  3.71% 80.64%      140ms  3.71%  runtime.indexbytebody
120ms  3.18% 83.82%      120ms  3.18%  runtime.usleep
70ms  1.86% 85.68%       70ms  1.86%  runtime.mach_semaphore_signal
70ms  1.86% 87.53%       70ms  1.86%  runtime.mach_semaphore_wait
50ms  1.33% 88.86%       50ms  1.33%  runtime.memclr
30ms   0.8% 89.66%       30ms   0.8%  net/http.(*ServeMux).match
20ms  0.53% 90.19%       30ms   0.8%  fmt.(*pp).doPrintf
```

テキストだけではなく，以下のコマンドでグラフ（`svg`形式）でプロファイリング結果を表示することもできる．

```bash
(pprof) web
```

<img src="/images/pprof.png" class="image">

コードベースが小さければこれだけでも十分強力だが，コードが増えるほどグラフは複雑になり結果を直感的に理解するのが難しくなる．

### go-torchを使う

`go-torch`を使うには`net/http/pprof`によるエンドポイントを有効にしておくだけで良い．そして`go tool pprof`を使うのと同じように以下のようなコマンドを叩くだけで`.svg`形式のFlame Graphが出力される（`go-torch`に加えてBrendan Gregg氏のPerlスクリプト[brendangregg/FlameGraph](https://github.com/brendangregg/FlameGraph)をダウンロードして`PATH`を通しておく必要がある）．

```bash
$ go-torch --time 5 --url http://localhost:9090/debug/pprof/profile
```

結果は以下．

<img src="/images/torch.svg" class="image">

（例えば上は単純なWebサーバーの場合である．`logRequest`という関数の`os.Hostname()`が怪しいのがすぐわかる）

## まとめ

グラフの生成はとても簡単なので読み方さえわかればFlame Graphはとても強力である．Flame Graphで問題の原因の大まかなあたりを付け`go tool pprof`で詳細な解析をするという流れが良いと思う．

Flame GraphはJavaやNode，RubyといったVM言語でも使うことができる．またCPUだけではなくてMemoryやIOのプロファイルにも利用することができる．気になる人はいろいろ漁ってみると良さそう．

## 参考文献

- ["Systems Performance: Enterprise and the Cloud"](https://www.amazon.co.jp/Systems-Performance-Enterprise-Brendan-Gregg-ebook/dp/B00FLYU9T2)
- [The Flame Graph - ACM Queue](http://queue.acm.org/detail.cfm?id=2927301)
- [Blazing Performance with Flame Graphs](http://www.slideshare.net/brendangregg/blazing-performance-with-flame-graphs) 
