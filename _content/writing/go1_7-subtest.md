+++
date = "2016-08-02T09:00:00+09:00"
title = "Go1.7のSubtestsとSub-benchmarks"
+++

[Go1.7](https://tip.golang.org/doc/go1.7)では[SubtestsとSub-benchmarks](https://github.com/golang/go/wiki/TableDrivenTests)という機能が`testing`パッケージに導入される．これを使うとテスト関数/ベンチマーク関数の中にテスト/ベンチマークを定義できるようになる．テストの場合はテストに階層を持たせることができ，ベンチマークの場合は[Table Driven](https://github.com/golang/go/wiki/TableDrivenTests)的にベンチマークを記述することができるようになる．さらに一連のテスト/ベンチマークに対して共通のsetupとtear-downを持たせることもできる．

テストの場合は[Table Driven Tests](https://github.com/golang/go/wiki/TableDrivenTests)で十分なことも多く恩恵は少ないかもしれない．それよりもベンチーマークで効果を発揮することが多い．

例えば以下のように異なる設定値を使って`Foo`のベンチマークをとるとする．今までであればそれぞれ設定値ごとにベンチマーク関数を準備する必要があった．

```golang
func BenchmarkFoo1(b *testing.B)   { benchFoo(b, 1) }
func BenchmarkFoo10(b *testing.B)  { benchFoo(b, 10) }
func BenchmarkFoo100(b *testing.B) { benchFoo(b, 100) }

func benchFoo(b *testing.B, base int) {
    for i := 0; i < b.N; i++ {
        Foo(base)
    }
}
```

Go1.7のSub-benchmarkを使うと以下のように書ける．

```golang
func BenchmarkFoo(b *testing.B) {
    cases := []struct {
        Base int
    }{
        {Base: 1},
        {Base: 10},
        {Base: 100},
    }

    for _, bc := range cases {
        b.Run(fmt.Sprintf("%d", bc.Base), func(b *testing.B) { benchFoo(b, bc.Base) })
    }
}
```

まず複数の関数を一つの関数にまとめることができる．そして設定値をTable-Driven的に書くことができる．これによりシンプルになりかつ可読性も上がる．Sub-benchmark名はトップレベルの関数名（`BenchmarkFoo`）と`Run`関数に渡す文字列を`/`で繋いだものになる．例えば上の例の場合は`BenchmarkFoo/1`...となる．またforループの前後に`BenchmarkFoo`専用のsetup・tear-down処理を記述することもできる．

標準パッケージの変更を見ていてもSubtestよりもSub-benchmarkで恩恵を得ているのがわかる．例えば以下のような使われ方をしている．

- https://go-review.googlesource.com/#/c/23428/
- https://go-review.googlesource.com/#/c/23429/
- https://go-review.googlesource.com/#/c/23420/

またSubtestsはParallelテストの制御にも使える．`t.Parallel()`を使えば個々のテストは並行処理される．そして全てのサブテストが終了した時点でトップレベルの関数に戻る．これを使えば，並行でテストを走らせて全ての処理が終了したら後処理を行うといったことができる．

## まとめ

GopherCon 2016のLT ["State of Go 2016"](http://go-talks.appspot.com/github.com/freeformz/talks/20160712_gophercon/talk.slide#1) によるとベンチマークを書いてるひとは[まだ少ない](http://go-talks.appspot.com/github.com/freeformz/talks/20160712_gophercon/talk.slide#30)．この変更でもう少し増えると良い．
