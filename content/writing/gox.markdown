---

title: '複数プラットフォームにGoアプリケーションを配布する'
date: 2014-05-19
comments: true
categories: golang
---

[tcnksm/jj](https://github.com/tcnksm/jj_)

最近試しにGo言語でCLIアプリケーションを作成した．[joelthelion/autojump](https://github.com/joelthelion/autojump)をシンプルにしただけのツールで，ディレクトリを保存して，どこからでもその保存したディレクトリへの移動を可能にする．

Goの環境さえあれば，このようなGo言語のアプリケーションの配布はとても簡単で，インストールは以下のようにするだけでよい．

```bash
$ go get github.com/tcnksm/jj_
```

これだけではなく，[Goはクロスコンパイルが簡単](http://unknownplace.org/archives/golang-cross-compiling.html)で，様々なプラットフォーム向けにバイナリを生成することができる．つまり，Goがインストールされていない環境に対しても簡単にツールを配布することができる．

[Packer](http://www.packer.io)などの最近のHashicorp制のツールは，Go言語で書かれており，OSX，Linux，Windows，FreeBSDなど様々なプラットフォーム向けにそれらを配布している．レポジトリを見てると，その辺をいい感じに自動化している．それらを参考にして，今回作成したツールを複数プラットフォーム向けに配布してみた．

## TL;DR

以下のようにOXSとLinux，そしてWindowsのそれぞれ386とamd64に対してツールを配布する（まだ不安定なので使わないでください）．

[Download](https://bintray.com/tcnksm/jj/jj/0.1.0/view/files)

やったことは，

- [gox](https://github.com/mitchellh/gox)でクロスコンパイル
- [bintray](https://bintray.com/)からバイナリの配布
- スクリプトによる自動化

ソースは全て，[tcnksm/jj](https://github.com/tcnksm/jj_)のscripts以下にある．

## なぜGoを使い始めたか

まず，簡単になぜGoを使い始めたか．理由は下のエントリと同じ．

- [On Distributing Command line Applications: Why I switched from Ruby to Go - Code Gangsta](http://codegangsta.io/blog/2013/07/21/creating-cli-applications-in-go/)
- [Abandoning RubyGems | Mitchell Hashimoto](http://mitchellh.com/abandoning-rubygems)

今まで簡単な便利コマンドラインツールは，Rubyを使ってさらっとつくってきた．他のひとも使えそうなものはRubyGemsで配布するようにつくった．しかし，いざチームの人に使ってもらう段階になると，そもそも自分の周りがジャバなので，`gem`って何？となり，Rubyのインストールから初めてもらうということが起こった．

自分なら`ruby-build`や`ruby-install`でさらっと入れるが，Ruby使ったことないひとにとってはインストールさえも障壁が高い．その壁を超えてまで使ってくれるひとは実は少ない．

それはもったいない．たいしたツールしか作れないのであれば，せめて導入の障壁だけでも下げたい．使い手の環境にあったバイナリをつくって，はいどうぞ！としたい．Go言語の良さは，`goroutine`とかいろいろあるだろうが，自分の中では，このクロスコンパイルのやりやすさが一番大きい．

## クロスコンパイル

GO言語のクロスコンパイルはとても簡単で，以下のようにするだけでOSXでlinuxのamd64向けのバイナリをつくることができる．

```bash
$ GOOS=linux GOARCH=amd64 go build hello.go
```


複数プラットフォーム向けにクロスコンパイルする場合は，[mitchellh/gox](https://github.com/mitchellh/gox)を使うともっと簡単にできる．Goxを使う利点は以下が挙げられる．

- シンプル
- 複数プラットフォームの並列ビルド
- 複数パッケージの並列ビルド

### 準備

まず，goxをインストールする．

```
$ go get github.com/mitchellh/gox
```

次にクロスコンパイル用のツールをインストールする．

```
$ gox -build-toolchain
```

### 使い方

使い方は，`go build`と同じで，コンパイルしたいパッケージのディレクトリで以下を実行するだけ．

```bash
$ gox
-->      darwin/386: github.com/mitchellh/gox
-->    darwin/amd64: github.com/mitchellh/gox
-->       linux/386: github.com/mitchellh/gox
...
```

何も指定しなければ，OSX，Linux，Windows，FreeBSD，そしてOpenBSDのそれぞれ386とamd64のバイナリが作成される．

今回は，OXSとLinux，Windowsの386とamd64に対してクロスコンパイルを実行する．これらを`-os`，`-arch`で指定するだけ．

自動化するために以下のようなスクリプトを書いておく．

```bash
#!/bin/bash

XC_ARCH=${XC_ARCH:-386 amd64}
XC_OS=${XC_OS:-linux darwin windows}

rm -rf pkg/
gox \
    -os="${XC_OS}" \
    -arch="${XC_ARCH}" \
    -output "{%raw%} pkg/{{.OS}}_{{.Arch}}/{{.Dir}} {%endraw%}"
```

出力先は，`-output`で指定できる．フォーマットは，go templateに従う．

## バイナリ配布

バイナリの置き場には，最近よくみる[bintray](https://bintray.com/)を使う．レポジトリ単位での複数パッケージ，バージョニングによる配置が可能．バイナリだけでなく，debやrpmパッケージ，mavenなどに対応している．もちろん無料．

{%img https://bintray.com/docs/help/repository_diagram.png %}

bintrayが良いと感じたのは，REST APIで操作できるところ．自動化がしやすい．例えばアップロードはcURLを使って以下のようにできる．

```bash
$ curl -T <FILE.EXT> -utcnksm:<API_KEY> https://api.bintray.com/content/tcnksm/jj/jj/<VERSION_NAME>/<FILE_TARGET_PATH>
```

### 準備

binaryにバイナリをアップロードするには以下の設定が必要．

- レポジトリの作成
- API Keyの取得

Githubとの連携も可能なので，READMEやCHANGELOGを紐づけておくと親切．

### アップロード

これも自動化する．事前に複数のバイナリやその他のファイルをzipで固めて`pkg/dist`以下に配置しておく．

```bash
VERSION=0.1.0
for ARCHIVE in ./pkg/dist/*; do
    ARCHIVE_NAME=$(basename ${ARCHIVE})

    echo Uploading: ${ARCHIVE_NAME}
    curl \
        -T ${ARCHIVE} \
        -utcnksm:${BINTRAY_API_KEY} \
        "https://api.bintray.com/content/tcnksm/jj/jj/${VERSION}/${ARCHIVE_NAME}"
done
```

これだけで，適切なバージョニングをしつつバイナリをホストしてくれる．バージョンに関しては，Packerとかだと`version.go`を準備してそれから読み取るなどしている．

クロスコンパイル用の`compile.sh`，zipで固める`dist.sh`，アップロードするための`upload.sh`を準備して，それらを一気に実行するようにしておけば便利．

### 参考

- [Bintray REST API](https://bintray.com/docs/api.html)
