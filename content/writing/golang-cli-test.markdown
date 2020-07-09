---

title: 'Go言語でテストしやすいコマンドラインツールをつくる'
date: 2014-12-18
comments: true
categories: golang
---


本記事は[Go Advent Calendar 2014](http://qiita.com/advent-calendar/2014/go)の18日目の記事です．

Go言語は，クロスコンパイルや配布のしやすさからコマンドラインツールの作成に採用されることが多い．自分もGo言語でいくつかのコマンドラインツールを作成してきた．例えば，GitHub Releaseへのツールのアップロードを簡単に行う[ghr](https://github.com/tcnksm/ghr)というコマンドラインツールを開発をしている．

コマンドラインツールをつくるときもテストは重要である．Go言語では標準テストパッケージだけで十分なテストを書くことができる．しかし，コマンドラインツールは標準出力や標準入力といったI/O処理が多く発生する．そのテスト，例えばある引数を受けたらこの出力を返し，この終了ステータスで終了するといったテストは，ちゃんとした手法が確立されているわけではなく，迷うことが多い（少なくとも自分は結構悩んだ）．

本記事では，いくつかのOSSツール（得に[hashicorp/atlas-upload-cli](https://github.com/hashicorp/atlas-upload-cli)）を参考に，Go言語によるコマンドラインツールおいてI/O処理に関するテストを書きやすくし，すっきりとしたコードを既述する方法について解説する．

なお，特別なパッケージは使用せず，標準パッケージのみを利用する．

## TL;DR

[io.Writer](http://golang.org/pkg/io/#Writer)を入力とするメソッドをつくり，そこに実処理を書く．main関数やテストからはio.Writerを書き換えて，それを呼び出すようにする（文脈によりioの向き先を変える）．

## 実例

ここでは，簡単な例として`awesome-cli`というコマンドラインツールを作成し，その出力結果と終了コードのテストを書く．

`awesome-cli`は`-version`オプションを与えると，以下のような出力と，終了コードが得られるとする．

```bash
$ awesome-cli -version
awesome-cli version v0.1.0
```

```bash
$ echo $?
0
```

以下では，この挙動のテストをどのように書くかを，`awesome-cli`のコードそのものと共に解説する．

## コード

`awesome-cli`は以下の2つのソースで構成する．

- `cli.go` - オプション引数処理を含めた具体的な処理
- `main.go` - main関数

そして`cli_test.go`にI/Oに関わるテスト，ここでは`-version`オプション引数を与えたときの出力とその終了コードのテスト，を既述する．以下ではこれらを具体的に説明する．

### cli.go

まず，引数処理を含めた具体的な処理を行う`cli.go`は以下のように既述する．引数処理には標準の[flag](http://golang.org/pkg/flag/)パッケージを利用する．

```go
package main

import (
    "flag"
    "fmt"
    "io"
)

// 終了コード
const (
    ExitCodeOK             = 0
    ExitCodeParseFlagError = 1
)

type CLI struct
    outStream, errStream io.Writer
}

// 引数処理を含めた具体的な処理
func (c *CLI) Run(args []string) int {

    // オプション引数のパース
    var version bool
    flags := flag.NewFlagSet("awesome-cli", flag.ContinueOnError)
    flags.SetOutput(c.errStream)
    flags.BoolVar(&version, "version", false, "Print version information and quit")

    if err := flags.Parse(args[1:]); err != nil
        return ExitCodeParseFlagError
    }

    // バージョン情報の表示
    if version {
        fmt.Fprintf(c.errStream, "awesome-cli version %sn", Version)
        return ExitCodeOK
    }

    fmt.Fprint(c.outStream, "Do awesome workn")

    return ExitCodeOK
}
```

まず，[io.Writer](http://golang.org/pkg/io/#Writer)の`outStream`と`errStream`をフィールドをもつ`CLI`構造体を作る．そして`CLI`構造体をレシーバとし，コマンドライン引数をその引数としてもつ`Run()`メソッドを定義する．

`Run()`にはオプション引数のパース処理と具体的な処理を既述し，戻り値としてステータスコードを返すようにする．

オプション引数のパースには[flag.FlagSet](http://golang.org/pkg/flag/#FlagSet)を新たに作成して行う．これにより以下が可能になる．

- 出力先を変えられる
    - `flags.SetOutput(c.errStream)`
- パースするべきオプション引数を引数として渡せるようになる
    - `flags.Parse(args[1:])`

（ちなみに[flag.Parse()](http://golang.org/pkg/flag/#Parse)は`os.Args[1:]`をパースする）

具体的な処理はいつも通り既述する．ただし，I/O処理，例えばユーザに対してエラーを提示する処理などは，`outStream`と`errStream`をそれぞれ標準出力，標準エラー出力の書き出し先として利用するようにする．

`Run()`の戻り値は，`0`（正常）`1`（エラー）のように直接数値を書いても良いが，`ExitCodeOK `のように定数として定義しておくとテストときにその可読性につながる．

これらにより`Run()`，つまり引数処理を含めた具体的な処理，をメソッドとしてテストすることができるようになる．

### main.go

次にmain関数をもつ`main.go`は以下のように既述する．

```go
package main

import (
    "os"
)

const Version string = "v0.1.0"

func main() {
    cli := &CLI{outStream: os.Stdout, errStream: os.Stderr}
    os.Exit(cli.Run(os.Args))
}
```

main関数は`CLI`構造体の`outStream`と`errStream`をそれぞれ`os.Stdout`，`os.Stderr`として`cli.go`の`Run()`メソッドを呼び出すだけ．これにより，コマンドラインツール実行時の出力は標準出力と標準エラー出力に書き出されるようになる．

`Run()`の引数は`os.Args`を渡すようにする．そして`Run()`は終了ステータスを返すので，それを受け`os.Exit()`で終了するようにする．


### cli_test.go

テストは以下のように既述する．ここでは，`-version`オプション引数を与えたときの出力とその終了ステータスをテストする．

```go
package main

import (
    "bytes"
    "fmt"
    "strings"
    "testing"
)

func TestRun_versionFlag(t *testing.T) {
    outStream, errStream := new(bytes.Buffer), new(bytes.Buffer)
    cli := &CLIoutStream: outStream, errStream: errStream
    args := strings.Split("awesome-cli -version", " ")

    status := cli.Run(args)
    if status != ExitCodeOK
        t.Errorf("ExitStatus=%d, want %d", status, ExitCodeOK)
    }

    expected := fmt.Sprintf("awesome-cli version %s", Version)
    if !strings.Contains(errStream.String(), expected)
        t.Errorf("Output=%q, want %q", errStream.String(), expected)
     }
}
```

テストでは，`CLI`構造体の`outStream`と`errStream`をそれぞれ[bytes.Buffer](http://golang.org/pkg/bytes/#Buffer)として，`Run()`メソッドを呼び出す．これにより`Run()`実行後に各出力を取り出してテストに使うすることができる．

実際にテストしたい，コマンドと引数は以下のように書く．

```go
args := strings.Split("awesome-cli -version", " ")
```

そして`strings.Split()`により`os.Args`と同じものを作り出し，`Run()`への引数とする．

あとは，いつも通りの`if`によるテストを書いているだけ．終了ステータスは期待した値が返ってきているか，出力は予期するものが含まれているかを書く．

## 番外編（環境変数のテスト）

軽く番外編．コマンドラインツールでは環境変数を用いることがある．例えば，API  を叩くようなコマンドラインツールは，そのTokenを引数で与えるよりも環境変数で設定させることが多い．このように環境変数が絡んだ場合のテストの書き方についても簡単に紹介する．

以下のようなヘルパー関数を準備するとよい．

```go
func setTestEnv(key, val string) func() {
    preVal := os.Getenv(key)
    os.Setenv(key, val)
    return func()
        os.Setenv(key, preVal)
    }
}
```

この関数は，もともと環境変数に設定されていた値を一時的に退避して，実際に使いたい値を設定する．そして，退避した値を再びセットし直すための関数を戻り値として返す．

使うときは以下のようにする．テストが終わると`defer`により値のリストアが行われる．

```go
func TestAPIToken(t *testing.T) {
    reset = setTestEnv("Token","……")
    defer reset()

    // Awesome test
}
```

## まとめ

本記事では，Go言語でテストしやすいコマンドラインツールを書く方法について紹介した．[io.Writer](http://golang.org/pkg/io/#Writer)を入力とするメソッドをつくることで，テストしやすい，かつ見通しの良いコードが書けるようになった．

### 参考

- [Unit-testing programs depend on I/O in Go](https://yuya-takeyama.github.io/presentations/2014/11/30/gocon_2014_autumn/#1.0)
- [Go言語によるCLIツール開発とUNIX哲学について](http://yuuki.hatenablog.com/entry/go-cli-unix)
