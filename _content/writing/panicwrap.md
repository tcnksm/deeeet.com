+++
date = "2015-04-17T00:18:38+09:00"
title = "Go言語のCLIツールのpanicをラップしてクラッシュレポートをつくる"
+++

[mitchellh/panicwrap](https://github.com/mitchellh/panicwrap)

Go言語でpanicが発生したらどうしようもない．普通はちゃんとテストをしてそもそもpanicが発生しないようにする（もしくはトップレベルで`recover`する）．しかし，クロスコンパイルして様々な環境に配布することを，もしくはユーザが作者が思ってもいない使いかたをすることを考慮すると，すべてを作者の想像力の範疇のテストでカバーし，panicをゼロにできるとは限らない．

panicが発生した場合，ユーザからすると何が起こったか分からない（Go言語を使ったことがあるユーザなら「あの表示」を見て，panicが起こったことがわかるかもしれない）．適切なエラーメッセージを表示できると良い．開発者からすると，そのpanicの詳しい発生状況を基に修正を行い，新たなテストケースを追加して二度とそのバグが発生しないようにしておきたい．

[mitchellh/panicwrap](https://github.com/mitchellh/panicwrap)を使うと，panicが発生したときにそれ（バイナリ）を再び実行し，設定したhandlerを実行することで，その標準出力/エラー出力を取得することができる．このパッケージを使えばpanicが起こったときに詳細なクラッシュレポートを作成し，ユーザにそれを報告してもらうことができる．

## 使い方

使い方は簡単でトップレベルにhandlerを登録するだけ．まず簡単に動作例を説明する．以下の例はpanicが発生したときにそのpanicの出力を`crash.log`に書き込む例．

```golang
package main

import (
    "fmt"
    "os"

    "github.com/mitchellh/panicwrap"
)

func main() {
    // (1)
    exitStatus, _ := panicwrap.BasicWrap(handler)    

    // (2)
    if exitStatus >= 0 {
        os.Exit(exitStatus)
    }

    // (3)
    panic("Panic happend here...")
}

func handler(output string) {
    f, _ := os.Create("crash.log")
    fmt.Fprintf(f, "The child panicked!\n\n%s",output)
    os.Exit(1)
}
```

以下のように動作する．

- `(1)`ではhandlerを`BasicWrap`に登録する
- `(2)`はpanicが発生した場合．この場合`exitStatus`は0以上の値になる
- `(3)`は通常の実行．ここで`panic`を発生させている．

動作としては`(2)`でpanicが発生し`(0)`で登録したhandler（ここでは`crash.log`への書き込み）を実行し，`(1)`で終了する．

## 内部の仕組み

`panicwrap`が何をしているかを簡単に見てみる．`BasicWrap`から`Wrap`が呼ばれ中で自分自身（バイナリ）を実行している．

```golang
exePath, err := osext.Executable()
....

cmd := exec.Command(exePath, os.Args[1:]...)
cmd.Env = append(os.Environ(), c.CookieKey+"="+c.CookieValue)
...

if err := cmd.Start(); err != nil {
    return 1, err
}
...    
```

実行する際には環境変数にあらかじめ決められた`Cookie`を設定し，自分が子プロセス（`Wrap`から呼ばれたプロセス）なのか親プロセス（`Wrap`を読んだプロセス）なのかを判別できるようにしている．子プロセスの場合は`Wrap`は`-1`を返すため，通常のプロセス（上記の例で言うと`(2)`）が実行される．

panicの発生は，`trackPanic`がgoroutineとして常に監視している．

```golang
func trackPanic(r io.Reader, w io.Writer, dur time.Duration, result chan<- string)
```

`r`には実行中の標準エラー出力が渡ってくるのでそれを読み込み`panic:`の文字列が含まれないかを検出する．それが検出され，かつ終了コードが0以外の場合はpanicが発生したとしてhandlerを実行する（`panic:`という文字列を標準エラーに出力してNon-Zeroで終了するとpanicとして扱われる）．

## 使いこなす

`BasicWrap`を使うだけではpanicの出力しか取得できない．クラッシュレポートにはもっと様々な情報を含めたい．例えば，実行環境は何か，どのような引数を指定して実行したか，などなど．`WrapConfig`を自分で定義することで出力などをカスタマイズすることができる．

以下は，ユーザが実行したコマンド引数をクラッシュレポートに出力する例

```golang

func main() {

    // (1)
    logTempFile, _ := ioutil.TempFile("", "tmp-log")

    var wrapConfig panicwrap.WrapConfig

    // (2)
    wrapConfig.Handler = handlerFunc(logTempFile)
    
    // (3)
    wrapConfig.Writer = logTempFile

    exitStatus, err := panicwrap.Wrap(&wrapConfig)

    if err != nil {
        panic(err)
    }

    if exitStatus >= 0 {
        os.Exit(exitStatus)
    }

    // (4)
    log.SetOutput(os.Stderr)
    log.Printf("Run command: %s\n", strings.Join(os.Args[0:], " "))

    panic("Fuck!!!")
}

func handlerFunc(logF *os.File) panicwrap.HandlerFunc {
    return func(output string) {

        file, _ := os.Create("crash.log")

        // Seek the log file to read from begining
        logF.Seek(0, 0)

        // Write to crash.log
        io.Copy(file, logF)

        // Tell user a crash occured and ask to tell us a report.
        fmt.Fprint(os.Stderr, "\n\n!!! Application crashed, please report this !!! \n\n")

        os.Exit(1)
    }
}
```

（わかりやすさのためにエラー処理や`close`処理は省略している）

以下のように動作する．

- `(1)`ではTempファイルを作成する，クラッシュレポートに出力したい内容はここに書き込む
- `(2)`ではhandlerを指定する．上のTempファイルの内容を`crash.log`にpanicの出力と共に書き込んで保存するということをする
- `(3)`では`wrapConfig.Writer`をTempファイルにする．`wrapConfig.Writer`は`Wrap`で実行したプロセスの標準エラー出力の書き込み先である（デフォルトは`os.Stderr`）
- `(4)`からは通常の実行だがlogの出力先を標準エラー出力にする．これで`Wrap`プロセスの出力はTempファイルに吐き出されることになる．あとはlogにクラッシュレポートに含めたい内容を書き込んでいくだけ．


## まとめ

現在作ってるCLIツールが複数のプラットフォームに配布する予定なのでこれを利用してpanicしたときの詳しい状況を理解できるようにしている（バグレポート用のURLを表示するということもしている）．バグを報告してくれるかは善意に依るがその障壁は下げておきたい．

Hashicorp系のツールではこれがほとんど使われているので読んでみると面白い．基本はそれらを参考にした．





