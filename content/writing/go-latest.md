+++
date = "2015-04-07T00:02:56+09:00"
title = "Go言語のツールが最新バージョンであるかをユーザに伝えるためのgo-latestというパッケージをつくった"
+++

[tcnksm/go-latest](https://github.com/tcnksm/go-latest)

Webアプリケーションとは異なり，コマンドラインツールやモバイルアプリはバージョンアップがユーザに委ねられる．そのため一度リリースしてしまうとバージョンアップをしてもらうのが難しくなる（バグを含めてしまった場合にロールバックもできない cf. ["Mobile First Development at COOKPAD #deploygate"](https://speakerdeck.com/gfx/mobile-first-development-at-cookpad-number-deploygate)）．とにかくしっかりテストをしてそもそもバクを含めないというのも大切だが，完璧なソフトウェアは存在しないので，アップデートは常に必要になる．

モバイルアプリとは異なり，Go言語でツールを書いきバイナリとして配布した場合は，最新のバージョンがすでに存在していることをユーザに伝える仕組みはそもそもない．ので，最新のバージョンをリリースしたことをユーザに伝えることが難しくなる．[go-latest](https://github.com/tcnksm/go-latest)を使うと，ユーザが使っているツールが最新バージョンであるかをチェックし，古い場合にそれを伝えバージョンアップを促すということが可能になる．

## インストール

`go get`でインストールできる．

```bash
$ go get -d github.com/tcnksm/go-latest
```

## 使い方

`go-latest`には`Source`という概念がある．`Source`は最新バージョンの問い合わせ先である．デフォルトではGitHub上のタグ，HTMLのmetaタグ（もしくはオリジナルのスクレイピング），JSONレスポンスを利用することができる（`Source`はただのインターフェースなので自分で実装することもできる）．

これらの使い方を簡単に説明する．

### GithubTag

まず，GitHub上のタグを使う方法．例えば，[https://github.com/tcnksm/ghr](https://github.com/tcnksm/ghr)というツールにおいて，バージョン`0.1.0`が最新であるかをチェックするには以下のようにする．

```golang
githubTag := &latest.GithubTag{
    Owner: "tcnksm",
    Repository: "ghr",
}

res, _ := latest.Check(githubTag, "0.1.0")
if res.Outdated {
    fmt.Printf("0.1.0 is not latest, you should upgrade to %s", res.Current)
}
```

レポジトリのユーザ名とレポジトリ名を指定して`Check()`を呼ぶだけ．レスポンスの詳細は，[https://godoc.org/github.com/tcnksm/go-latest](https://godoc.org/github.com/tcnksm/go-latest)を参照．

### HTML metaタグ

次に，特定のmetaタグをHTMLに仕込む方法．例えば，`reduce-worker`というツールがあるとする．この場合は，まず，以下のようなバージョン情報を含んだmetaタグをHTMLに仕込んでおく，

```html
<meta name="go-latest" content="reduce-worker 0.1.2 New version include security update">
```

バージョン`0.1.0`が最新のバージョンであるかをチェックするには以下のようにする．

```golang
html := &latest.HTMLMeta{
    URL: "http://example.com/info",
    Name: "reduce-worker",
}

res, _ := latest.Check(html, "0.1.0")
if res.Outdated {
    fmt.Printf("0.1.0 is not latest, %s, upgrade to %s", res.Meta.Message, res.Current)
}
```

`URL`にmetaタグを含んだHTMLのURLを，`Name`にツールの名前を指定してリクエストを投げるだけ．

この方法は，GitHubが[死んでいても](http://techcrunch.com/2015/03/30/github-continues-to-face-evolving-ddos-attack/)使えるし，レスポンスにメッセージを含めることもできる．metaタグの詳しい仕様は[ここ](https://github.com/tcnksm/go-latest/blob/master/doc/html_meta.md)に定義してある．この仕様が気に食わないときは，自分でオリジナルのスクレイピング関数を定義することもできる．

なお，この手法は，[Go言語のRemote import path](https://golang.org/cmd/go/#hdr-Remote_import_paths)や[ACIのディスカバリー](http://deeeet.com/writing/2015/03/12/appc-discover/)を参考にしている．


### JSON

最後にJSON APIを使う方法．例えば，以下のようなJSONレスポンスを返すAPIがあるとする．

```json
{
    "version":"1.2.3",
    "message":"Fix crash bug when XXX",
}
```

バージョン`0.1.0`が最新のバージョンであるかをチェックするには以下のようにする．

```golang
json := &latest.JSON{
    URL: "http://example.com/version",
}

res, _ := latest.Check(json, "0.1.0")
if res.Outdated {
    fmt.Printf("0.1.0 is not latest, %s, upgrade to %s", res.Meta.Message, res.Current)
}
```

`URL`はJSONのエンドポイントを指定してリクエストを投げるだけ．

この方法は，APIクライアントを作成しているときに便利．自分でオリジナルの構造体を定義して好きなJSONレスポンスを受け取ることもできる．詳しくは，[https://godoc.org/github.com/tcnksm/go-latest](https://godoc.org/github.com/tcnksm/go-latest)を参照．


## 使い所

例えば，自分が作っているコマンドラインツールの場合は，`--version`が呼ばれたときに`go-latest`を実行し，最新版かどうかを提示するようにしている．

```bash
$ my-tool --version
my-tool version v0.3.1, build aded5ca
Your version is out of date! The latest version is v0.4.0
```

ベータ版のリリースなどで開発のサイクルが早く，どんどんアップデートを促したい場合は，コマンドが実行される度に呼び出しても良いかもしれない（今回は社内向けのツールでこれをしたくてつくった）．またデーモンとして動くツールなどでは`SIGHUP`で実行しても良さそう．

## まとめ

バグや要望はGitHubの[Issue](https://github.com/tcnksm/go-latest/issues)，もしくは[@deeeet](https://twitter.com/deeeet)までお願いします．




