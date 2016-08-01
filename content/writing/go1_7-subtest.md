+++
date = "2016-08-02T09:00:00+09:00"
title = "Go1.7のSubtestsとSub-benchmarks"
+++

[Go1.7](https://tip.golang.org/doc/go1.7)では[SubtestsとSub-benchmarks](https://github.com/golang/go/wiki/TableDrivenTests)という機能が`testing`パッケージに導入される．これを使うとテスト関数/ベンチマーク関数の中にテスト/ベンチマークを定義できるようになる．テストの場合はテストに階層を持たせることができ，ベンチマークの場合は[Table Driven](https://github.com/golang/go/wiki/TableDrivenTests)的にベンチマークを記述することができるようになる．さらに一連のテスト/ベンチマークに対して共通のsetupとtear-downを持たせることもできる．

例えば以下のように`Foo`を異なる設定値でテストする場合を考える．今まで通りであれば設定値ごとにテストをそれぞれ定義する必要があった（もちろんこれは簡略したものであり普通は[Table Driven Tests](https://github.com/golang/go/wiki/TableDrivenTests)でどうにかなるはずである．それをもってしてさらに階層を持たせたいとする）．


```golang
func TestFoo1(t *testing.T) {
    testFoo(1, t)
}

func TestFoo2(t *testing.T) {
    testFoo(2, t)
}

func TestFoo3(t *testing.T) {
    testFoo(3, t)
}

func testFoo(i int, t *testing.T) {
    out, err := Foo(i)
	if err != nil {
	    t.Fatalf("err: %s", err)
	}

    //...
}
```

Subtestsの機能を使うとこれは以下のように書ける．

```golang
func TestFoo(t *testing.T) {
    for i := 1; i < 4; i++ {
        t.Run(fmt.Sprintf("%d", i), func(t *testing.T) { testFoo(i, t) })
    }
}
```

Subtests名はトップレベルの関数名（`TestFoo`）と`Run`関数に渡す文字列を`/`で繋いだものになる．例えば上の例の場合は`TestFoo/1`，`TestFoo/2`...となる．またforループの前後に`TestFoo`専用のsetup・tear-down処理を記述することもできる．

このようにSubtestsを使うとコードの記述を減らしてよりシンプルにテストを書けるようになる．とは言えテストの場合は[Table Driven Tests](https://github.com/golang/go/wiki/TableDrivenTests)で十分なことも多く恩恵は少ないかもしれない．それよりもベンチーマークで効果を発揮することが多い．Table-Driven的なアプローチが使えるようになりさまざまなパターンの記述が容易になる．例えば標準パッケージでは以下のような使われ方をしている．

- https://go-review.googlesource.com/#/c/23428/
- https://go-review.googlesource.com/#/c/23429/
- https://go-review.googlesource.com/#/c/23420/

さらにSubtestsはParallelテストの制御にも使える．`t.Parallel()`を使えば個々のテストは並行処理される．そして全てのサブテストが終了した時点でトップレベルの関数に戻る．これを使えば，並行でテストを走らせて全ての処理が終了したら後処理を行うといったことができる．
