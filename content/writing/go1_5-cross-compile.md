+++
date = "2015-07-22T09:54:57+09:00"
title = "Go1.5はクロスコンパイルがより簡単"
+++

- [Cross compilation just got a whole lot better in Go 1.5 | Dave Cheney](http://dave.cheney.net/2015/03/03/cross-compilation-just-got-a-whole-lot-better-in-go-1-5)
- [Go 1.5: Cross compilation — Medium](https://medium.com/@rakyll/go-1-5-cross-compilation-488092ba44ec)

Go言語の良さの一つにあらゆるOS/Archに対するクロスコンパイルがとても簡単に行えることが挙げられる．今まで（Go1.4以前）も十分に便利だったが[Go 1.5](http://tip.golang.org/doc/go1.5)ではさらに良くなる．

今までの問題を敢えて挙げるとターゲットとするプラットフォーム向けのビルドtoolchain準備する必要があった（cf. [Go のクロスコンパイル環境構築 - Qiita](http://qiita.com/Jxck_/items/02185f51162e92759ebe)）

```bash
$ cd $(go env GOROOT)/src
$ GOOS=${TARGET_OS} GOARCH=${TARGET_ARCH} ./make.bash --no-clean 
```

```bash
$ gox -build-toolchain 
```

この作業は1つの環境で一度行えばよいのでそれほど煩雑な問題ではない．しかし，例えばDockerなどでクロスコンパイル環境を提供すると（e.g., [tcnksm/dockerfile-gox](https://github.com/tcnksm/dockerfile-gox)，ちなみにこれは[Wercker](http://wercker.com/)の公式ドキュメントに[紹介](http://devcenter.wercker.com/docs/languages/golang.html)されている），ビルドに時間がかかったりイメージが無駄に重くなったりという問題がおこる．初心者もつまづいてしまうポイントだと思う．

Go1.5ではコンパイラがGoで書き直された（cf. [Go in Go](http://talks.golang.org/2015/gogo.slide#1)）ため，この準備作業が不要になる．

## 使ってみる

Go1.5を準備する．Go1.5のビルドにはGo1.4が必要．

```bash
$ git clone https://go.googlesource.com/go $HOME/go1.5
$ cd $HOME/go1.5 && git checkout -b 1.5 refs/tags/go1.5beta2
$ cd $HOME/go1.5/src && GOROOT_BOOTSTRAP=$HOME/go1.4/ ./make.bash
```

```bash
$ export PATH=$HOME/go1.5/bin:$PATH
```

[mitchellh/gox](https://github.com/mitchellh/gox)を使ってみる．toolchainの準備なしにすぐに使える．

```bash
$ go get github.com/mitchellh/gox
```

```bash
$ cd $GOPATH/src/github.com/tcnksm/hello
$ gox
Number of parallel builds: 4

-->       linux/arm: github.com/tcnksm/hello
-->      darwin/386: github.com/tcnksm/hello
-->       linux/386: github.com/tcnksm/hello
-->       plan9/386: github.com/tcnksm/hello
-->     freebsd/386: github.com/tcnksm/hello
-->   freebsd/amd64: github.com/tcnksm/hello
-->     openbsd/386: github.com/tcnksm/hello
-->   openbsd/amd64: github.com/tcnksm/hello
-->     windows/386: github.com/tcnksm/hello
-->   windows/amd64: github.com/tcnksm/hello
-->     freebsd/arm: github.com/tcnksm/hello
-->      netbsd/386: github.com/tcnksm/hello
-->    netbsd/amd64: github.com/tcnksm/hello
-->      netbsd/arm: github.com/tcnksm/hello
-->     linux/amd64: github.com/tcnksm/hello
-->    darwin/amd64: github.com/tcnksm/hello
```

最高．`go`はコンパイル前に必要な標準パッケージを検出しそれをターゲットのプラットフォーム向けにビルドしてくれる．

ちなみに上の例はcgoが必要ない場合，cgoが必要な場合は`CC`と`CXX`環境変数でCとC++のコンパイラを指定することができる（cf. [Go 1.5: Cross compilation](https://medium.com/@rakyll/go-1-5-cross-compilation-488092ba44ec)）．

```bash
$ CGO_ENABLED=1 CC=android-armeabi-gcc CXX=android-armeabi-g++ GOOS=android GOARCH=arm GOARM=7 go build .
```
