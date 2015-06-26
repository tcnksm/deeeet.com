+++
date = "2015-06-26T12:15:03+09:00"
title = "Go言語のDependency/Vendoringの問題と今後．gbあるいはGo1.5"
+++

Go言語のDependency/Vendoringは長く批判の的になってきた（cf. ["0x74696d | go get considered harmful"](http://0x74696d.com/posts/go-get-considered-harmful/), [HN](https://news.ycombinator.com/item?id=9508022)）．Go1.5からは実験的にVendoringの機能が入り，サードパーティからは[Dave Chaney](https://twitter.com/davecheney)氏を中心として[gb](http://getgb.io/)というプロジェクベースのビルドツールが登場している．なぜこれらのリリースやツールが登場したのか?それらはどのように問題を解決しようとしているのか?をつらつらと書いてみる．

## Dependencyの問題

最初にGo言語におけるDependecy（依存解決）の問題．Go言語のDependencyで問題なのはビルドの再現性が保証できないこと．この原因は`import`文にある．

Go言語では外部パッケージを利用したいときにそれを`import`文を使ってソースコード内に記述する．この`import`文は2通りの解釈のされ方をする．`go get`はリモートレポジトリのfetch URLとして解釈し，コンパイラはローカルディスク上のソースのPathとして解釈する．例えばコマンドラインツールを作るときに外部パッケージとして[mitchellh/cli](https://github.com/mitchellh/cli)を使いたい場合は以下のように記述する．

```go
import "github.com/mitchellh/cli"
```

これが書かれたコードを`go get`すると，ローカルディスクに[mitchellh/cli](https://github.com/mitchellh/cli)がなければ`$GOPATH/src`以下にそれをfetchする．ビルド時はそのPathに存在するコードを利用する．

`import`が問題なのは，そこにバージョン（もしくはタグ，Revision）を指定できないこと．そのため独立した2つの`go get`が異なるコードをfetchしてしまう可能性がある．そのコードが互換をぶっ壊していたらビルドは失敗するかもしれない．つまり現状何もしないとビルドの再現性は保証できない．

では以下のようにタグやバージョンを書けるようにすれば?となる．が，これは言語の互換を壊すことになる．

```go
import "github.com/pkg/term" "{hash,tag,version}"
```

以下のようにディレクトリ名にバージョン番号を埋め込むという方法もよく見る．が，これも結局異なるRevisionのコードをFetchしてまうことに変わりはなくビルドに再現性があるとは言えない．

```go
import "github.com/project/v7/library"
```

## Vendoring

再現性の問題を解決する方法として，依存するレポジトリを自分のレポジトリにそのまま含めてしまう（vendoringと呼ばれる）方法がある．こうしておくと依存レポジトリのupstreamの変更に影響を受けず，いつでもどのマシンでもビルドを再現できる．

しかし何もしないとコンパイラがそのレポジトリのPathを探せなくなりビルドができなくなる．ビルドするには以下のどちらかを行う必要がある．

- `$GOPATH`の書き換え
- `import`の書き換え

### `$GOPATH`の書き換え

まずは`$GOPATH`を書き換える方法．この場合はそもそもコードをvendoringするときに`$GOPATH/src/github.com...`と同じディレクトリ構成を作らなければならない．その上でそのディレクトリを`$GOPATH`に追加してビルドを実行する．

例えば外部パッケージ[mitchellh/cli](https://github.com/mitchellh/cli)をレポジトリ内の`ext`ディレクトリにvendoringしたい場合は，まず以下のようなディレクトリ構成でそれをvendoringをする．

```go
$ tree ext
ext
└── src
    └── github.com
        └── mitchellh
            └── cli
```

そしてビルド時は以下のように`$GOPATH`に`ext`ディレクトリを含めるようにする．

```bash
$ GOPATH=$(pwd)/ext:$GOPATH go build 
```

このやり方が微妙なのは毎回自分で`$GOPATH`の変更を意識しないといけないこと（Fork先でも意識してもらわないといけない）．

### importの書き換え

次に`import`を書き換える方法．レポジトリ内のvendoringしたディレクトリへと書き換えてしまう．例えば`github.com/tcnksm/r`というレポジトリの`ext`ディレクトリに外部パッケージ[mitchellh/cli](https://github.com/mitchellh/cli)をvendoringしたとする．この場合は以下のように`import`を書き換える．

```go
import "github.com/mitchellh/cli" // Before
```

```go
import "github.com/tcnksm/r/ext/cli" // After
```

これはあまり見ない．そもそもソースを書き換えるのが好まれないし，upstreamを見失うかもしれない．また多くの場合`import`文が異常に長く複雑になる．


### Godep

`$GOPATH`の書き換えやそれに合ったディレクトリの作成，`import`の書き換えを自分で管理するのは煩雑なのでこれらを簡単にするツールは多く登場している．その中で多く使われているのが[godep](https://github.com/tools/godep)というツール．

`godep`は使い始めるのも簡単で，例えば現在のレポジトリの依存をすべてvendoringするには以下を実行するだけで良い．

```bash
$ godep save
```

`godep`はレポジトリ内に`Godep/_workspace`を作成しその中に`$GOPATH`の流儀に従い依存をvendoringする．そして同時に`Godep.json`ファイルを作成し依存のバージョンも管理してくれる．

`go`コマンドを実行する場合は，以下のようにそれを`godep`でラップすれば`$GOAPTH`の書き換えもしてくれる．

```bash
$ godep go build
```

`godep save -r`とすると`import`を書き換えになる．そうすると以後`$GOPATH`の書き換えは不要になり`godep`コマンドは不要になる．

### Godep?

`Godep`は多く使われているが以下のような問題がある

- `Godep.json`は決定版の依存管理ファイルではない
- そもそも依存管理ファイル（`Godep.json`）を持つのが鬱陶しい
- `$GOAPATH`書き換え方式だと`go get`が使えない

`import`の書き換え（`godep save -r`）をすると`go get`は使えるが問題が起こる．例えば`r`というレポジトリがあり，mainパッケージ`r/c`とmainパッケージではない`r/p`があるとする．`r/c`は`r/p`をimportしており，`r/p`は外部パッケージの`d`に依存しているとする．このとき`d`を`r/Godeps/_workspace`にvendoringして`import`を`d`から`r/Godeps/_workspace/.../d`に書き換えるとする．

これだけなら問題ないが，別のパッケージ`u`が登場して`r/p`と`d`に依存していると問題が起こる．`r/p`はもはや`d`に依存しておらず`r/Godeps/_workspace/.../d`をimportする．`d`と`r/Godeps/_workspace/.../d`は異なるパッケージなのでtype assertionなどで死ぬ

```bash
cannot use d (type "github.com/tcnksm/r/Godeps/_workspace/src/github.com/dep/d".D) as type "github.com/tcnksm/d".D in argument to ...
```

こういうわけでvendoringはまだ最高の解が存在するとは言えない．

## gb

- [gb, a project based build tool for the Go programming language](http://dave.cheney.net/2015/06/09/gb-a-project-based-build-tool-for-the-go-programming-language)
- [gb · Design rationale](http://getgb.io/rationale/)

そんな中`gb`というツールも登場している．`gb`はプロジェクトベースのビルドツール．プロジェクトごとに必要なコード/その依存をすべてvendoringし同じビルドを再現する．なぜプロジェクトベースが良いのか．

- 自分で書いたコードとそれが依存する他人が書いたコードを明確に分けて（ディレクトリを分けて）管理することができる
- ビルドのたびに外部にfetchする必要がなくいつでもビルドができる．外的要因（e.g., GitHubがダウンしている）の影響を受けない
- 逆に依存はすべてプロジェクトに含まれているので依存ライブラリのアップデートはatomicになり，チームメンバーすべてに影響する（`go get -u`は不要になる）

そして`gb`には以下の特徴がある．

- `go` toolのWrapperではない（すべて書き直されている）
- `$GOPATH`の書き換えをしない
- `import`の書き換えをしない
- 依存管理ファイルが必要ない（`gb-vendor`プラグインを使うと必要）

使い心地は[本人による記事](http://dave.cheney.net/2015/06/09/gb-a-project-based-build-tool-for-the-go-programming-language)を見るのが良い．プロジェクトとしてすべてのコードを管理することになるのでシンプルかつ明確になるなと思う．vendoringと自分のソースの境界も明確なので，vendoringしたパッケージのアップデートもそこまで苦ではない（`gb-vendor`を使う，もしくは`git`や`hg`を使う）．

`Godep`のようなハックではないのも良い．特に複数人のチームで大規模な開発をしていくときに便利なのではと思う（そういう場合がちゃんと考えられてる）．「`go`toolの書き直し」て！と思うかもしれないがDave Chaney氏なので信頼できる．

## Go1.5

- [Go 1.5+ "External" Packages](https://docs.google.com/document/d/1CJnU6ZKvsp21B0lQwbJlKFt8Zz4EWscaCRy_EwK8ja8)
- [proposal: external packages](https://groups.google.com/forum/#!msg/golang-dev/74zjMON9glU/4lWCRDCRZg0J)

Go本家もちゃんとこの問題には取り組んでいて2015年8月にリリースされる予定になっているGo1.5にvendoringの機能が実験的に入りそう．まだちゃんとしたProposalではなさそうだが以下のようになりそう．

- `r`というレポジトリのパッケージ`r/p`がパッケージ`d`に依存しているとする
- パッケージ`d`を`r/vendor/d`にvendoringし`r`内でビルドすると`d`は`r/vendor/d`と解釈される
- `r/vendor/p`が存在しない（vendoringしていない）場合は`p`と解釈する
- 複数の解釈がありえる場合はもっとも長いspecificなものを選択する

例えば`github.com/tcnksm/r`というレポジトリに[mitchellh/cli](https://github.com/mitchellh/cli)をvendoringしたい場合は，`vendor`ディレクトリに以下のようにvendoringする．

```go
$ tree vendor
vendor
└── github.com
    └── mitchellh
        └── cli
```

この時vendoring機能を有効にしてビルドすると`vendor`が存在するので

```go
import "github.com/mitchellh/cli"
```

は，以下のように解釈される．

```go
import "github.com/tcnksm/r/vendor/github.com/mitchellh/cli"
```

この機能はすでに試すことができる．Go1.5をビルドして以下の環境変数を有効にすればよい．

```bash
$ export GO15VENDOREXPERIMENT=1
```

これは`import`文のResolution（解像度）を考慮しないといけなくなるが，普通に良さそう．`import`を書き換える必要もないし`vendor`を使うか使わないかをプロジェクトごとにわけることができる．まだ確定ではないので静観するが`go` toolだけでなんとかできるならそれに越したことはない．

## まとめ

とりあえず社内でチーム開発するもの，かつ大規模になりそう（外部の依存が多そう）なものには`gb`を考えてみても良いのではと思っている．個人的に開発してるものはそこまで外部パッケージに依存してないので困ってない．もし必要になればGo本家が確定するまでは`Makefile`と`Godep`で頑張る．

### 参考

- [Reproducible Builds](http://go-talks.appspot.com/github.com/davecheney/presentations/reproducible-builds.slide#1)
- [Building Go projects with gb - Supermighty](https://walledcity.com/supermighty/building-go-projects-with-gb)
- [how to rewrite import paths #127](https://github.com/tools/godep/issues/127)
- [The State of Go](http://talks.golang.org/2015/state-of-go-may.slide#1)
- [Go in Go](http://talks.golang.org/2015/gogo.slide#1)
