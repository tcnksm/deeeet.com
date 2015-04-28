+++
date = "2015-04-28T13:18:07+09:00"
title = "Go言語でプラグイン機構をつくる"
+++

[dullgiulio/pingo](https://github.com/dullgiulio/pingo)

Go言語でプラグイン機構を提供するかは実装者の好みによると思う（cf. [fluentd の go 実装におけるプラグイン構想](http://togetter.com/li/618378)）．Go言語はクロスコンパイルも含めビルドは楽なのでプラグインを含めて再ビルドでも良いと思う．が，使う人がみなGo言語の環境を準備しているとも限らないし，使い始めてもらう障壁はなるべく下げたい．プラグインのバイナリだけを持ってこればすぐに使えるという機構は魅力的だと思う．

Go言語によるプラグイン機構はHashicorpの一連のプロダクトや[CloudFoundryのCLI](https://github.com/cloudfoundry/cli)などが既に提供していてかっこいい．[net/rpc](http://golang.org/pkg/net/rpc/)を使っているのは見ていてこれを自分で1から実装するのは面倒だなと思っていた．

[dullgiulio/pingo](https://github.com/dullgiulio/pingo)を使うと実装の面倒な部分を受け持ってくれて気軽にプラグイン機構を作れる．

## 使い方

サンプルに従ってプラグインを呼び出す本体とプラグインを実装してみる．

まず，プラグイン側の実装（`plugins/hello-world/main.go`）は以下．

```golang
package main

import (
    "github.com/dullgiulio/pingo"
)
    
type HelloPlugin struct{}

func (p *HelloPlugin) Say(name string, msg *string) error {
    *msg = "Hello, " + name
    return nil
}

func main() {
    plugin := &HelloPlugin{}
    pingo.Register(plugin)
    pingo.Run()
}
```

`struct`としてプラグインを定義し，メソッドを定義する．メイン関数はそれを登録（`Register`）して起動（`Run`）するだけ．

プラグインはあらかじめビルドしておく．

```bash
$ cd plugins/hello-world
$ go build
```

次にプラグインを呼び出す本体の実装は以下．上のプラグインで実装した`Say()`を呼び出す．

```golang
package main

import (
    "fmt"
    "github.com/dullgiulio/pingo"
)

func main() {

    p := pingo.NewPlugin("tcp", "plugins/hello-world/hello-world")
    p.Start()
    defer p.Stop()

    var res string
    err := p.Call("HelloPlugin.Say", "deeeet", &res)
    if err != nil {
        panic(err)
    }

    fmt.Println(res)

}
```

バイナリのパスを指定しプラグインを読み込み（`NewPlugin`），それを起動（`Start`）する．あとは`Call`でプラグインに定義したメソッドを呼び出して結果を受け取る．

プラグインとのやりとりのプロトコルとしては`tcp`とUNIXドメインソケット（`unix`）を利用することができる．

## 内部の仕組み

`pingo`が何をしているのかを簡単に見てみる．

単に[net/rpc](http://golang.org/pkg/net/rpc/)をラップしているだけ．プラグインがサーバーで本体がクライアントとなりサーバーにコマンドを発行するようになっている．`pingo`はサーバーの起動とクライアントへのそのアドレスの通知を受け持つ．


まず，プラグイン本体は`NewPlugin`でバイナリを読み込み，`Start()`でプラグインをサーバーとして起動する（普通に`exec.Command()`を使う）．この時に以下のようなオプション引数を渡している．

```golang
flag.StringVar(&c.proto, "pingo:proto", "unix", "Protocol to use: unix or tcp")
flag.StringVar(&c.prefix, "pingo:prefix", "pingo", "Prefix to output lines")
```

1つ目はプロトコルの指定．2つ目はプラグインと本体がメッセージをやりとりするための`prefix`を指定する．本体は`prefix`により予期するプラグインからのメッセージであることを認識する．

`Start()`を実行すると，プラグイン側でサーバーが起動する（`Run()`）．例えば`tcp`だと`127.0.0.1:1024`からport番号を1つずつ増やしながら最初にListenできたもので起動する．起動できたら以下のような内容を標準出力に出力する．

```golang
h.output("ready", fmt.Sprintf("proto=%s addr=%s", r.conf.proto, r.conf.addr))
```

プラグイン本体側では，以下のようにプラグインの出力を常にチェックしている．

```golang
func (c *ctrl) readOutput(r io.Reader) {
    scanner := bufio.NewScanner(r)

    for scanner.Scan() {
        c.linesCh <- scanner.Text()
    }
}
```

そして`"ready"`という文字列をkeyとしてサーバーが立ち上がったことを認識し，その出力をパースしてリクエストを投げるべきサーバーアドレスを認識する．文字列をパースするというゴリゴリの実装は他でも（例えば`terraform`など）やられていることなのでこれが最適解なのではないかと思う．

あとは，プラグイン本体からプラグインに対して`*rpc.Client.Call()`を呼び出すだけ．単純．

## 方針

実際にプラグイン機構をもったツールをつくるにはどうするのが良いか考えてみた．例えば以下のような方針にすると思う．

- ビルドするバイナリ名のルールを決める．あるディレクトリのこの名前のバイナリはプラグインとして読み込まれて有効になるようにする
- プラグインの返り値（型）を実装側であらかじめ準備しそれを返させる

あとはプラグイン側が本体からの呼び出しでしか起動しないようにできると良さそう（例えば環境変数にある特定のクッキー値をセットされているときのみ本体からの呼び出しであると認識するなど）

## まとめ

プラグインの数だけサーバープロセスが立つことになるのでデーモンとして常駐する系ではなく，単発系のCLIなどで使う良さそう．次に何か作るときにプラグイン機構を提供したければこれを使うか，参考にしたいと思う．

## 参考

- [Writing Custom Terraform Providers](https://www.hashicorp.com/blog/terraform-custom-providers.html)
- [Big Sky :: Go言語でDLLの読み込み](http://mattn.kaoriya.net/software/lang/go/20130805173059.htm)
