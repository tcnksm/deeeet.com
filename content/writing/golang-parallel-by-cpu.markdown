---

title: 'Go言語でCPU数に応じて並列処理数を制限する'
date: 2014-07-30
comments: true
categories: golang
---

負荷のかかる処理を制限なしに並列化しても意味ない．処理の並列数を予測可能な場合は，当たりをつけて最適化するのもよいが，不明確な場合は，CPU数による制限が単純な1つの解になる．

## TL;DR

CPU数に応じたバッファ長のChannelを使って[セマフォ](http://ja.wikipedia.org/wiki/%E3%82%BB%E3%83%9E%E3%83%95%E3%82%A9)を実装する．

## 実例

- [mitchellh/gox](https://github.com/mitchellh/gox)

`gox`はGo言語製のツールを並列コンパイルするツール．コンパイルの処理は重いため，デフォルトで並列処理数をCPU数で制限している．

## 簡単な例

例えば，以下のような単純な並列処理を考える．`heavy()`（重い処理）を並列で実行する．

```go
package main

import (
        "fmt"
        "sync"
        "time"
)

func heavy(i int) {
        fmt.Println(i)
        time.Sleep(5 * time.Second)
}

func main() {
        var wg sync.WaitGroup    
        for i := 0; i <= 100; i++ {
            wg.Add(1)
            go func(i int) {
                defer wg.Done()
                heavy(i)
            }(i)
        }
        wg.Wait()
}
```

この並列処理の同時実行数をCPU数で制限する．

まず，利用可能なCPUのコア数は，[runtime](http://golang.org/pkg/runtime/)パッケージの`NumCPU()`で取得できる．

```go
func NumCPU() int
```

次に，CPU数をバッファ長としたChannelを作成する．

```go
cpus := runtime.NumCPU()
semaphore := make(chan int, cpus)
```

後は，`heavy()`をChannelへの送受信で囲む．これで，CPU数だけバッファが溜まると，Channelへの送信がブロックされ，新しい並列処理の開始もブロックされる．

最終的な実装は以下のようになる．

```go
package main

import (
        "fmt"
        "sync"
        "time"
        "runtime"
)

func heavy(i int) {
        fmt.Println(i)
        time.Sleep(5 * time.Second)
}

func main() {
        var wg sync.WaitGroup
        cpus := runtime.NumCPU()
        semaphore := make(chan int, cpus)
        for i := 0; i <= 100; i++ {
            wg.Add(1)
            go func(i int) {
                defer wg.Done()
                semaphore <- 1
                heavy(i)
                <-semaphore
            }(i)
        }
        wg.Wait()
}
```

## マルチコアで実行する

最後にちょっとCPU関連で別の話題．現状，goroutineのスケジューラはマルチコアを最適に使うようになっていないらしい（["Why does using GOMAXPROCS > 1 sometimes make my program slower?"](http://golang.org/doc/faq#Why_GOMAXPROCS)）．そのため，デフォルトの設定では使用するCPUのコア数は1になっている．

これを変更するには，runtimeパッケージの`GOMAXPROCS()`を使う，もしくは環境変数 (`GOMAXPROCS`) を設定する．

```go
func GOMAXPROCS(n int) int
```

利用可能なCPUを全て使って処理を実行するには，以下のようにする．

```go
cpus := runtime.NumCPU()
runtime.GOMAXPROCS(cpus)
```

将来的には，スケジューラがいい感じにしてくれるっぽい．

### 参考

- [Go の並行処理 - Block Rockin’ Code](http://jxck.hatenablog.com/entry/20130414/1365960707)
- [GOMAXPROCS でマルチコアCPUを有効に使う - 酒日記 はてな支店](http://d.hatena.ne.jp/sfujiwara/20091201/1259681707)
- [Going Go Programming: Concurrency, Goroutines and GOMAXPROCS](http://www.goinggo.net/2014/01/concurrency-goroutines-and-gomaxprocs.html)
- [runtime - what is the GOMAXPROCS default value - Stack Overflow](http://stackoverflow.com/questions/17853831/what-is-the-gomaxprocs-default-value)
- [高速に自作パッケージをGithubにリリースするghrというツールをつくった](http://deeeet.com/writing/2014/07/29/ghr/)


