---

title: 'Martini(+Ginkgo)をWerckerでCIしてHerokuにデプロイ'
date: 2014-04-23
comments: true
categories: golang
---

<div class="vc"><iframe src="http://player.vimeo.com/video/79487342" width="500" height="270" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div> <p><a href="http://vimeo.com/79487342">Martini Demo</a> from <a href="http://vimeo.com/user22705255">Martini</a> on <a href="https://vimeo.com">Vimeo</a>.</p>

[#117: Go, Martini and Gophercasts with Jeremy Saenz - The Changelog](http://thechangelog.com/117/)

を聴いていて，Sinatra風のGoの軽量Webフレームワークである[Martini](http://martini.codegangsta.io/)というのを知った．上に貼ったデモを見るとほとんどSinatraで良い感じ．Goはしばらく触ってなかったし，最近のGo事情を知るためにMartiniを触りつついろいろ試してみた．

あとCIサービスの[Wercker](http://wercker.com/)も良さそうだなと思いつつ触ってなかったので，この機会に使ってみた．

やってみたのは，

- [Martini]()で簡単なGo Web Applicationの作成
- [Ginkgo](http://onsi.github.io/ginkgo/)を使ってBDDテスト
- [Wercker]()でCI
- [Go Heroku buildpack](https://github.com/kr/heroku-buildpack-go)でHerokuにデプロイ

今回のソースコードは全て以下にある

[tcnksm/sample-martini](https://github.com/tcnksm/sample-martini)

## Martini

パッケージをインストールしておく

```bash
$ go get github.com/go-martini/martini
```

例えば，以下のように書ける．ものすごくシンプル．

```go
// server.go
package main

import "github.com/go-martini/martini"

func main() {
    m := martini.Classic()
    m.Get("/", top)
    m.Run()
}

func top(params martini.Params) (int, string) {
    return 200, "Hello!"
}

```

以下で起動する．

```bash
$ go run server.go
$ curl http://localhost:3000
Hello !
```

[codegangsta/gin](https://github.com/codegangsta/gin)を使うと更新の度に自動でビルドしなおしてくれるため，ブラウザを更新するだけでよくなる．

```bash
$ go get github.com/codegangsta/gin
$ gin run server.go
```

RackのMiddleware的な書き方もできる．OAuthやセッション機能などのMiddlewareは[Martini Contrib](https://github.com/martini-contrib)で別パッケージとして管理されている．

## Go Heroku Buildpack

Go用のHerokuのBuildpackは既にある．

[kr/heroku-buildpack-go](https://github.com/kr/heroku-buildpack-go)

Herokuアプリを作成する際にこれを指定する．

```bash
$ heroku create -b https://github.com/kr/heroku-buildpack-go.git
```

HerokuでGo Web Applicationを動かすには，`Procfile`と依存パッケージの管理が必要になる．

### Procfile

Herokuに`web`プロセスがどのコマンドを叩くかを知らせるために`Procfile`を準備する必要がある．

```bash
$ echo "web: $(basename `pwd`)" > Procfile
```

### Godep

[tools/godep](https://github.com/tools/godep)を使うとパッケージの依存関係を管理できる．

```bash
$ go get github.com/kr/godep
$ godep save
```

これで依存関係のリストが`Godeps/Godeps.json`に書き込まれ，`Godeps/_workspace`以下にソースコードがぶっ込まれる．

### デプロイ

あとはいつも通りにデプロイするだけ．

```bash
$ git push heroku master
```

HeokuへのGo Web Applicationのデプロイは["Getting Started with Go on Heroku"](http://mmcgrana.github.io/2012/09/getting-started-with-go-on-heroku.html)が詳しい．


## Ginkgo

[Ginkgo](http://onsi.github.io/ginkgo/)は，Go用のBDD Testingフレームワーク．Matcherライブラリには[Gomega](http://onsi.github.io/gomega/)を使う．

```bash
$ go get github.com/onsi/ginkgo/ginkgo
$ go get github.com/onsi/gomega
```

初期化する．

```bash
$ ginkgo bootstrap
```

例えば，上のMartiniのテストは以下のように書ける．

```go
package main

import (
    . "github.com/onsi/ginkgo"
    . "github.com/onsi/gomega"
)

var _ = Describe("Sample", func() {
    Context("top()", func() {
        It("return 200 Status", func() {
            RequestToRoot("GET", top)
            Expect(recorder.Code).To(Equal(200))
            Expect(recorder.Body).To(ContainSubstring("Hello"))
         })
     })
})
```

ほとんどRSpecのように書ける．RSpecほどではないが，Matcherも基本的なものは揃っている．

MartiniとGinkgoとの連携は["Getting started with RethinkDB, Ginkgo and Martini on wercker"](http://blog.wercker.com/2014/02/06/RethinkDB-Gingko-Martini-Golang.html)が詳しい．

## Wercker

Werckerの使い方は，["Githubのプライベートリポジトリでも無料で使えるCI、Werckerを使ってrails newからHerokuのデプロイまでやってみる"](http://blog.mah-lab.com/2014/01/08/rails-wercker-heroku-deploy/)が詳しい．基本はこの通りにやれば連携可能．

`wercker.yml`はレポジトリを登録すると，自動でGo専用のものが生成され，そのまま使える．

テストが通ったらHerokuにデプロイするようにするには，HerokuのApp keyとApplicationを登録し，以下を`wercker.yml`に追記するだけ．

```ruby
...
deploy:
  steps:
      - heroku-deploy
```

ものすごく簡単．


## まとめ

とりあえず，ざっとやりたいことをやってみた．いろいろな言語にあるツールがどんどんGoに移植されてるなーと感じた．また，あらゆる言語のバックグラウンドをもった開発者がGoを触っていて，各言語の良い部分が集約されそうで期待が高まってきた．

さっとつくるときはSinatra使うだろうけど，MartiniでWeb Applicationを書いてみるのは楽しかった．Martiniの作者も話してたけど，バグレポートの際にいろいろ言われつつも良いコメントをもらってるみたいで，多分そういうことなんだろうと思う．

DockerやSerfとかを触っていると，やっぱコードレベルで中身を理解したいので，これを機にもっとGoを書いていこうと思う．

### 参考

- [#117: Go, Martini and Gophercasts with Jeremy Saenz - The Changelog](http://thechangelog.com/117/)
- [Announcing Ginkgo and Gomega: BDD-Style Testing for Golang - Pivotal Labs](http://pivotallabs.com/announcing-ginkgo-and-gomega-bdd-style-testing-for-golang/)
- [Getting started with RethinkDB, Ginkgo and Martini on wercker](http://blog.wercker.com/2014/02/06/RethinkDB-Gingko-Martini-Golang.html)
- [Githubのプライベートリポジトリでも無料で使えるCI、Werckerを使ってrails newからHerokuのデプロイまでやってみる | mah365](http://blog.mah-lab.com/2014/01/08/rails-wercker-heroku-deploy/)















