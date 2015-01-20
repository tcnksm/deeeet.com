---

title: 'CI-as-a-ServiceでGo言語プロジェクトの最新ビルドを継続的に提供する'
date: 2014-10-16
comments: true
categories: golang
---

Go言語で作成したツールのリリース方法について，最近実践していることを書く．

リリースは，ローカルから人手で行っている．具体的には，自分のローカル環境でクロスコンパイルし，[セマンティック バージョニング](http://shijimiii.info/technical-memo/semver/)によるタグをつけ，`CHANGELOG.md`を丁寧に書いた上でリリースをしている．クロスコンパイルには[mitchellh/gox](https://github.com/mitchellh/gox)，リリースには自分で作成した[tcnksm/ghr](https://github.com/tcnksm/ghr)を使っている（`ghr`については，["高速に自作パッケージをGithubにリリースするghrというツールをつくった"](http://deeeet.com/writing/2014/07/29/ghr/)を参考）．

その一方で，開発中の最新のビルドも提供するようにしている．例えば，[こんな感じ](https://github.com/tcnksm/ghr/releases/tag/pre-release)で，Pre-Releaseとして提供している．Go言語での開発なので，`go get`してくださいと言える．しかし，環境によってビルドが失敗することもあるし，そもそもGo言語を使っていないユーザもいる．新機能をいち早く使うことにはワクワク感がある（少なくとも自分にはある）．ユーザに負担なくそれを提供したい．

頻繁に開発を行っているときに，これを上記のように人手で毎回やるのは厳しい．WebアプリケーションのようにGit pushを契機にCI-as-a-Serviceでテストが通ったものを自動でリリースするのが美しい．

しかし，今ままでこれをやるのは意外と面倒だった．毎回違った名前でリリースするとリリースだらけになるし，リリースを消すにも新たなシェルスクリプトを頑張って書くしかなかった．

`ghr`の最新バージョンでは，`--replace`オプションをサポートしている．このオプションを使うと，一度リリースしたものを入れ替えてリリースすることができるようになる．もともとは誤ってリリースしてしまったものを入れ替えたいという要望から作ったが，上記のようなCI-as-a-Serviceとの連携でも威力を発揮する．

人によって好みのCI-as-a-Serviceは違う．無料かつ知名度のある[Wercker](http://wercker.com/)，[TravisCI](https://travis-ci.org/)，[drone.io](https://drone.io/)を使い，上記のようにGo言語プロジェクトの最新のビルドを継続的にリリースする方法について書く．

## Wercker

Werckerには専用のステップを準備した（[tcnksm/wercker-step-ghr](https://github.com/tcnksm/wercker-step-ghr)）．以下のような`wercker.yml`を準備すればよい．これで，テストが通ったあとに，goxによりクロスコンパイルが行われ，zipで圧縮，Githubへのリリースが行われる．リリースはPre-Releaseとして行われる．実際に動いているサンプルは，[tcnksm-sample/wercker-golang](https://github.com/tcnksm-sample/wercker-golang)で確認できる．

```yaml
box: tcnksm/gox
build:
  steps:
    - setup-go-workspace
    - script:
      name: go get
      code: |
        go get -t ./...
    - tcnksm/goveralls:
      token: $COVERALLS_TOKEN
    - tcnksm/gox
    - tcnksm/zip:
      input: $WERCKER_OUTPUT_DIR/pkg
      output: $WERCKER_OUTPUT_DIR/dist
deploy:
  steps:
    - tcnksm/ghr:
      token: $GITHUB_TOKEN
      input: dist
      replace: true
```

ちなみに自分はWerckerを採用している．Werckerの仕組みや，stepの自作の方法は別に記事を書いたので参考にしてください．

- [Werckerの仕組み，独自のboxとstepのつくりかた | SOTA](http://deeeet.com/writing/2014/10/16/wercker/)

## TravisCI

TravisCIの場合は，以下のような`.travis.yml`を準備すればよい．テスト，ビルド，リリースが行われる．実際に動いているサンプルは，[tcnksm-sample/travis-golang](https://github.com/tcnksm-sample/travis-golang)で確認できる．

```yaml
language: go
go:
  - 1.3
env:
  - "PATH=/home/travis/gopath/bin:$PATH"
before_install:
  - go get github.com/mitchellh/gox
  - gox -build-toolchain
  - go get github.com/tcnksm/ghr
  - go get github.com/axw/gocov/gocov
  - go get github.com/mattn/goveralls
  - go get code.google.com/p/go.tools/cmd/cover
script:
  - go test -v -covermode=count -coverprofile=coverage.out ./...
  - goveralls -coverprofile=coverage.out -service travis-ci -repotoken $COVERALLS_TOKEN
after_success:
  - gox -output "dist/{.OS}_{.Arch}_{.Dir}"
  - ghr --username tcnksm-sample --token $GITHUB_TOKEN --replace --prerelease --debug pre-release dist/
```

## Drone.io

Drone.ioの場合は，TraviCIやWerckerのような設定ファイルはない．以下をビルドスクリプトとしてDrone.ioに登録する．Goの最新版をインストールするところから始める必要がある．実際に動いているサンプルは，[tcnksm-sample/drone-golang](https://github.com/tcnksm-sample/drone-golang)で確認できる．

```bash
# Install go 1.3.1
pushd /
curl -s -o go.tar.gz https://storage.googleapis.com/golang/go1.3.1.linux-amd64.tar.gz
tar xzf go.tar.gz
export GOROOT=/go
export PATH=$GOROOT/bin:$PATH
go version
popd

# Get source code
go get -t -d ./...

go get github.com/axw/gocov/gocov
go get github.com/mattn/goveralls

go test -v -covermode=count -coverprofile=coverage.out ./...
goveralls -coverprofile=coverage.out -service drone.io -repotoken $COVERALLS_TOKEN

# Install gox
go get github.com/mitchellh/gox
gox -build-toolchain
gox -output "pkg/{.OS}_{.Arch}_{.Dir}"

# Release by ghr
go get github.com/tcnksm/ghr
ghr --username tcnksm-sample \
    --token $GITHUB_TOKEN \
    --replace \
    --prerelease \
    --debug \
    pre-release pkg/
```

## まとめ

各種CI-as-a-Serviceと`ghr`を連携して継続的にGo言語プロジェクトの最新ビルドを提供する方法について書いた．ツールの宣伝になってしまったが，気に入った場合は，是非使ってみてください．

CI-as-a-Serviceの比較にもなった．結論から言うと自由度の高いWerckerが一番良い．クロスコンパイルをするためには別途ツールビルドが必要になる(`gox -build-toolchain`)．これは時間がかかるため，毎回やるにはコストがかかる．Werckerを使えば，あらかじめboxとしてそれを準備しておけるし，stepをつくることで複雑なコマンドも隠蔽できる．

`ghr`に関して要望やバグは，Githubの[Issue](https://github.com/tcnksm/ghr/issues)もしくは，[@deeeet](https://twitter.com/deeeet)までお願いします．

### 参考

- [Wercker で Go のプロジェクトをクロスコンパイルし，GitHub にリリースする - 詩と創作・思索のひろば (Poetry, Writing and Contemplation)](http://motemen.hatenablog.com/entry/2014/06/27/xcompile-go-and-release-to-github-with-wercker)
- [Integrate ghr with CI as a Service · tcnksm/ghr Wiki · GitHub](https://github.com/tcnksm/ghr/wiki/Integrate-ghr-with-CI-as-a-Service)

