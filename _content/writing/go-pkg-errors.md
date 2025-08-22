+++
date = "2016-04-25T09:00:22+09:00"
title = "Golangのエラー処理とpkg/errors"
+++

GoConでは毎回エラー処理について面白い知見が得られる．[Go Conference 2014 autumn](http://gocon.connpass.com/event/9748/) においては（実際のトークではないが）居酒屋にて[@Jxck](https://twitter.com/jxck_)さんがRob Pike氏から以下のようなテクニックを紹介してもらっていた．

- [Errors are values - The Go Blog](https://blog.golang.org/errors-are-values)
- [Golang Error Handling lesson by Rob Pike](http://jxck.hatenablog.com/entry/golang-error-handling-lesson-by-rob-pike)

これはWrite（やRead）のエラー処理が複数続く場合に`errWriter` を定義して複数のエラー処理を一箇所にまとめてコードをすっきりとさせるテクニックであった．

そして今回の [Go Conference 2016 spring](http://gocon.connpass.com/event/27521/) のkeynoteにおいてもDave Cheney氏から（僕にとっては）新たなエラー処理テクニックが紹介された．

- [Gocon Spring 2016](http://dave.cheney.net/paste/gocon-spring-2016.pdf)

実際に使ってみて/コードを読んでみて（飲み会でもコードとともにいろいろ教えてもらった）自分の抱えている問題を解決できそうで使ってみたいと思えた．

本記事では現在のエラー処理の問題と発表で紹介された[pkg/errors](https://godoc.org/github.com/pkg/errors)についてまとめる．なお上記のスライドにはトークノートも書かれているので具体的な内容はそちらを見るのが良い．

## 問題

[@Jxck](https://twitter.com/jxck_)さんのケースは1つの関数において複数のエラーハンドリングが煩雑になる，言わば縦方向のエラー処理の問題であった．Dave氏のトークで語られているのは深さ方向のエラー処理の問題である．大きく分けて2つの問題がある．

- 最終的に表示されるエラーメッセージ
- 特定のエラーに対する分岐処理

以下ではそれらを具体的に説明する．


### エラーメッセージ

まずはエラーメッセージについて．以下は基本的なGoのエラー処理である．

```golang
func Foo() error {
    conf, err := ReadConf()
    if err != nil {
        return err
    }
    ...
    return nil
}
```

`Foo()`が`ReadConf()`を呼び，`ReadConf()`がエラーを返せばそれを`err`として返し，そうでなければ`conf`をつかった処理を続行し問題がなければ`nil`を返す．

大きなパッケージやツールになるとこの定型的な処理はどんどん連なり深くなる．例えばこの例の場合は`ReadConf()`がさらに`Write()`といった標準パッケージの関数を呼びそのエラーを返すかもしれないし，`Foo()`は別の関数から呼ばれその中でエラーが処理されるかもしれない．

これらの一連のエラーは最終的にどうなるか? コマンドラインツールやWebサーバーの`main()`に戻り以下のように`fmt.Printf()`（や`log`）を使って適切なエラーメッセージとしてユーザに表示する（"べき"である）．

```golang
fmt.Printf("Failed Foo: %s",err)
```

この単純な`return err`の連鎖は問題を起こす．最終的にユーザに表示されるエラーメッセージにはその後のデバッグに対してなんの情報も提示できないことがある．つまりどの関数のどこでエラーが発生したのか追えなくなる．例えば発表でも触れられていたように`no such file or directory`のみ表示されるケースに出会った人は多いと思う．他にもGoのツールだとTLSに関わるエラーなどで困ったひとは多いと思う（これはググるとDockerのGithub Issueが最初に現れるw）．

この問題に対してできることは`fmt.Errorf()`を使って具体的なエラーの状況を付加することである．

```golang
func Foo() error {
    conf, err := ReadConf()
    if err != nil {
        return fmt.Errorf("failed to read configuration file: %s")
    }
    ...
    return nil
}
```

これはよくPR reviewで指摘することだと思う．これで最終的に提示されるエラーはよりデバッグのしやすいものになる．

しかし`fmt.Errorf()`は`error`を別の`string`に結合して別の`error`をつくり出す．原因となったエラーが特定の型を持っていた場合にそれを隠蔽してしまう．これにより`fmt.Errorf()`は次に説明する呼び出し元での分岐処理を難しくする．

### 分岐処理

次に特定のエラーに対する呼び出し元での分岐処理の問題について説明する．関数の呼び元において特定のエラーが返ってきたときに単純にそれを返す，もしくはユーザに表示するのではなく，別の処理をしたいという場合がある．例えばリトライ処理を行うなど．

これは様々な方法がある．が，以下は避けるべきである．

- `error.Error()`して中身をみて`string`として使う
- Sentinel error（`io.EOF`など）を使う
- 自分でError typeを定義してType assertionする

1つ目は初心者がやりがちだが最も避けるべき方法である．他の2つを避ける理由は呼び出しに別の依存をもたらすことになるのが大きな理由（スライドにはもっと詳しい例があるのでそちらを見るとよい）．無駄なCouplingは避ける．基本的には単純な`error`を返すというパッケージ間のContractを破るべきではない．

ではどうするのが良いか? 型ではなくインターフェースを考える（Assert errors for behaviour, not type）．以下のようにする．

```golang
type temporary interface {
    Temporary() bool 
}

func IsTemporary(err error) bool { 
   te, ok := err.(temporary) 
   return ok && te.Temporary() 
}
```

`err`が`temporary`インターフェースを実装していれば`Temporary()`関数で特別な分岐処理をするべきか（例えばリトライするべきか）どうかを判別して返す．していなければ無関係なエラーとして単純に`false`を返し特別な処理分岐をスキップする．これは無駄な依存やCouplingを避けることができる．

しかしこの方法と上述した`fmt.Errorf()`によるエラーメッセージ問題を同時に解決することはできない．`fmt.Errorf()`がエラーを作り直してしまうからである（元のエラーがインターフェースを持っていたか追えなくなる）．

## errorsを使う

[errors](https://godoc.org/github.com/pkg/errors)

`errors`は上記で説明したエラーメッセージ問題を良い感じに解決しつつ処理分岐にも対応する．`errors` パッケージは以下のような関数を持つ．

```golang
func Wrap(cause error, message string) error
```

```golang
func Cause(err error) error
```

### Wrap()

まず`Wrap()`はオリジナルの`error`を具体的なエラーの状況（`message`）とともにラップした新たな`error`を返す．

```golang
conf, err := ReadConf()
if err != nil {
    return errors.Wrap(err, "failed to read configuration file")
}
```

この`Error()`の結果は以下の`error`と同じである．

```golang
fmt.Errorf("failed to read configuration file: %s")
```

関数のインターフェースとしてそのエラーのコンテキスト（annotation）を要求するのがよい．最終的に出力されるエラーメッセージは`fmt.Errorf()`と同じ結果になりエラー処理の方法も変わらない．

これだけではなく`Wrap()`は呼ばれたファイルとその行数も同時に内部に記録する．同パッケージの`Print`（`Fprint`）を使うと以下のような詳細なエラーメッセージを表示することができる．

```golang
err := fn()
errors.Fprint(os.Stderr, err)
```

```bash
read.go:3: A.conf is not exist
conf.go:35: failed to read configuration
main.go:100: Failed to run fn()
```

これは単純に`fmt.Errorf`を使うより便利なので移行の理由になる．

### Cause()

次に`Cause()`は元となったエラーをそのまま取り出す．`fmt.Errorf`はコンテキストを付与できる一方で新しいエラーを返してしまうために呼び出し元での処理の分岐がやりにくくなってしまった．`Cause()`は以下のインターフェースを`error`に持たせることで元となった`error`を取り出す関数である．

```golang
type Causer interface {
    Cause() error
}
```

これを使うと上記の`temporary`インターフェースの例は以下のように書ける．


```golang
func IsTemporary(err error) bool { 
    te, ok := errors.Cause(err).(temporary)
    return ok && te.Temporary() 
}    
```

もちろん`Wrap()`はデフォルトで元の`error`を保持し，かつ`Causer`インターフェースを満たすので`Cause()`をそのまま使える．


## まとめ

[errors](https://godoc.org/github.com/pkg/errors)を使うとエラーにコンテキストを付与しつつ，オリジナルのエラーを保持し呼び出し元において処理の分岐を行うことができる．かつ`error`を介すので標準的なContractから外れることもない．

Canonicalのいくつかのツールでも使われている（`juju`も似たパッケージ[juju/errors](https://github.com/juju/errors)を使っている）らしい．そして[errors](https://godoc.org/github.com/pkg/errors)はそれらのシンプル版とのこと．

こういう標準パッケージに則した薄いライブラリはとても好きなので使っていきたい．














