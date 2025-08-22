+++
date = "2016-10-12T09:36:20+09:00"
title = "sync.ErrGroupで複数のgoroutineを制御する"
+++

Golangの並行処理は強力である一方で同期処理を慎重に実装する必要がある．["Go 言語における並行処理の構築部材"](http://motemen.hatenablog.com/entry/2016/05/go-concurrent-building-blocks)にまとめられているようにGolangは様々な方法でそれを実装することができる．実現したいタスクに合わせてこれらを適切に選択する必要がある．

この同期処理の機構として新たに[golang.org/x/sync/errgroup](https://godoc.org/golang.org/x/sync/errgroup)というパッケージが登場した．実際に自分のツールで使ってみて便利だったので簡単に紹介する．

## 使いどころ

時間のかかる1つのタスクを複数のサブタスクとして並行実行しそれらが全て終了するのを待ち合わせる処理（Latch）を書きたい場合に`errgroup`は使える．その中でも「1つでもサブタスクでエラーが発生した場合に他のサブタスクを全てを終了しエラーを返したい」（複数のサブタスクが全て正常に終了して初めて1つの処理として完結する）場合が主な使いどころである．

## 実例

ここでは例として複数の`worker`サブタスクをgoroutineで並行実行しそれらすべての終了を待ち合わせるという処理を考える．最初に今までのやりかたとして`sync.WaitGroup`を使った実装を，次に`errgroup`を使った実装を紹介する．

### sync.WaitGroup

goroutineの待機処理としてよく使われるのが`sync.WaitGroup`である．その名前の通り指定した数の処理（goroutine）の実行の待ち合わせに利用する．例えば以下のように書くことができる．

```golang
var wg sync.WaitGroup
errCh := make(chan error, 1)
for i := 0; i < 10; i++ {
    wg.Add(1)
    go func(i int) {
        defer wg.Done()
        worker(i)
    }(i)
}

wg.Wait()
```

新たなgoroutineを生成する度に`Add`でWaitGroupをインクリメントし処理が終了したときに`Done`を呼ぶ．そして全ての`worker`の処理が終了するまで`Wait`で処理をブロックする．これはchannelを使っても実装できるが`sync.WaitGroup`を使ったほうが読みやすいことも多い．

では`worker`でのエラーを処理をしたい場合にはどうするのが良いだろうか? sliceでエラーをため終了後にそれを取り出す，`error`のchannelを作り外部でそれを受け取るといったパターンが考えられる．何にせよ別途自分で処理を実装する必要がある．

### sync.ErrGroup

[errgroup](https://godoc.org/golang.org/x/sync/errgroup)パッケージを使う以下のように書くことができる．

```golang
eg := errgroup.Group{}
for i := 0; i < 10; i++ {
    i := i
    eg.Go(func() error {
        return worker(i)
    })
}

if err := eg.Wait(); err != nil {
    log.Fatal(err)
}
```

`errgroup`では`Go`メソッドを使いサブタスクを実行する．ここに与えられた処理は新たなgoroutineで実行される．`Wait`は`sync.WaitGroup`と同様に`Go`メソッドで実行された全てのサブタスクが終了するまで処理をブロックする．そして（もしあれば）`Go`メソッド内で最初に返されたnon-nilの`error`を返す．

`errgroup`が強力なのは`context`パッケージを使い，1つのサブタスクでエラーが発生したときに他の全てのサブタスクをキャンセルできるところである．例えば以下のように書くことができる．

```golang
eg, ctx := errgroup.WithContext(context.TODO())
for i := 0; i < 10; i++ {
    i := i
    eg.Go(func() error {
        return workerContext(ctx, i)
    })
}

if err := eg.Wait(); err != nil {
    log.Println(err)
}
```

違いは新たなGroupを`WithContext`で生成し，かつ同時に新たな`Context`も生成している部分である．また`worker`を`workerContext`とし`Context`を渡せるようにしている．これにより1つのサブタスクでエラーが発生した場合に生成した`Context`をキャンセルすることができる．つまり（`workerContext`をちゃんと実装すれば）適切なリソース解放を行い処理を終了させることができる．


## まとめ

これだけでなく[GoDoc](https://godoc.org/golang.org/x/sync/errgroup)のExampleにも挙げられているようにpipeline処理にも使うことができる．これらの処理はGolangではよく実装するパターンでありもしかしたら標準に仲間入りするかもしれない．

とりあえずサブタスクを全て実行してしまいたい，発生したエラーは全て取り出したい，といった場合は別のパターンを実装するのが良い．


## 参考

- [Run strikingly fast parallel file searches in Go with sync.ErrGroup](https://www.oreilly.com/learning/run-strikingly-fast-parallel-file-searches-in-go-with-sync-errgroup)
- [context パッケージの紹介](http://go-talks.appspot.com/github.com/matope/talks/2016/context/context.slide#1)
- [Go1.7のcontextパッケージ](http://deeeet.com/writing/2016/07/22/context/)
