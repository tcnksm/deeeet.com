---

title: '高速にGo言語のCLIツールをつくるcli-initというツールをつくった'
date: 2014-06-22
comments: true
categories: golang
---

[tcnkms/cli-init・GitHub](https://github.com/tcnksm/cli-init)

`cli-init`を使えば，Go言語コマンドラインツール作成時のお決まりパターンをテンプレートとして自動生成し，コア機能の記述に集中することができる．

## デモ

以下は簡単な動作例．

<img src="/images/cli-init.gif" class="image">

上のデモでは，`add`と`list`，`delete`というサブコマンドをもつ`todo`アプリケーションを生成している．生成結果は，[tcnksm/sample-cli-init](https://github.com/tcnksm/sample-cli-init)にある．


## 背景

Go言語で作られたコマンドラインツールを見ていると，[codegangsta/cli](https://github.com/codegangsta/cli)というパッケージがよく使われている．

これは，コマンドラインツールのインターフェースを定義するためのライブラリで，これを使えば，サブコマンドをもつコマンドラインツールを簡単につくることができる（Usageを自動で生成してくれたり，bash補完関数をつくれたりするという便利機能もある）．

これを使って，自分もGo言語でコマンドラインツールをいくか作ってみた（e.g., [Dockerとtmuxを連携するdmuxというツールをつくった](http://deeeet.com/writing/2014/06/15/dmux/)）．で，自分で書いたり，他のプロジェクトを参考にしたりすると，codegangsta/cliを使ったプロジェクトは同様のパターンで記述されていることに気づいた．

このパターンを毎回記述するのはダルいので，それを自動生成することにした．

## 使い方

使い方は以下．

```bash
$ cli-init [options] application
```

例えば上のデモの場合は以下のようにしている．

```bash
$ cli-init -s add,list,delete todo
```

`-s`でサブコマンドを指定し，最後に作りたいコマンドラインアプケーションの名前を指定するだけ．

## 生成されるファイル

例えば，上記のコマンドでは以下のファイルが生成される．

- todo.go
- commands.go
- version.go
- README.md
- CHANGELOG.md

まず，**todo.go**の中身は以下．

```go
func main() {
    app := cli.NewApp()
    app.Name = "todo"
    app.Version = Version
    app.Usage = ""
    app.Author = "tcnksm"
    app.Email = "nsd22843@gmail.com"
    app.Commands = Commands
    app.Run(os.Args)
}
```

ここには，`main()`関数が生成され，その中でアプリケーションの基本的な情報が記述される．`Author`や`Email`は`.gitconfig`，`Version`は**version.go**の値が使われる．`Usage`の中身だけ自分で記述する．

次に，**commands.go**には，サブコマンドの定義が記述される．例えば，サブコマンド`list`に対しては，以下が生成される．

```go
var commandList = cli.Command{
    Name:  "list",
    Usage: "",
    Description: `
`,
    Action: doList,
}

func doList(c *cli.Context) {
}

```

`Usage`と`Description`，そして，`doList()`関数（`list`の実際の挙動）だけ自分で記述する．他のオプションなどは，[codegangsta/cliのREADME](https://github.com/codegangsta/cli#cligo)を参照．

あとは，**README.md**と**CHANGELOG.md**のテンプレートも生成される．

## インストール

Go言語がインストールされていることを前提にしている．

```bash
$ go get -d github.com/tcnksm/cli-init
$ cd $GOPATH/src/github.com/tcnksm/cli-init
$ make install
```

## まとめ

たいしたことはしていない．基本は，[codegangsta/cli](https://github.com/codegangsta/cli)で記述するべきこと，パターンに沿ってファイルを生成しているだけ．それだけだが，かなり記述量を減らすことができる．

バグや意見は，GitHubの[Issue](https://github.com/tcnksm/cli-init/issues)もしくは，[@deeeet](https://twitter.com/deeeet)までお願いします．


### あわせて読みたい

- ["複数プラットフォームにGoアプリケーションを配布する"](http://deeeet.com/writing/2014/05/19/gox/)
- ["HomeBrewで自作ツールを配布する"](http://deeeet.com/writing/2014/05/20/brew-tap/)
