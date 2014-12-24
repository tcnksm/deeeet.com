---

title: 'DockerHub公式の言語Stack'
date: 2014-09-25
comments: true
categories: docker
---

[DockerHub Official Repos: Announcing Language Stacks | Docker Blog](https://blog.docker.com/2014/09/docker-hub-official-repos-announcing-language-stacks/)

DockerHubには[公式のレポジトリ](https://registry.hub.docker.com/search?q=library&f=official)がある．そこにはUbuntuやCentos，MySQLやPostgres，MongoといったDockerイメージがコミュニティーベースで，つまりより汎用的に使える形で開発され集められており，ベースイメージとして簡単に使えるようになっている．

今までは，OSのディストリビューションや，Webサーバ，DBなどがメインだったが，公式として各種プログラミング言語のベースイメージも公開された．現状（2014年9月時点）では，[c/c++(gcc)](https://registry.hub.docker.com/_/gcc/)，[clojure](https://registry.hub.docker.com/_/clojure/)，[golang](https://registry.hub.docker.com/_/golang/)，[hylang](https://registry.hub.docker.com/_/hylang/)，[java](https://registry.hub.docker.com/_/java/)，[node](https://registry.hub.docker.com/_/node/)，[perl](https://registry.hub.docker.com/_/perl/)，[PHP](https://registry.hub.docker.com/_/php/)，[python](https://registry.hub.docker.com/_/python/)，[rails](https://registry.hub.docker.com/_/rails/)，[ruby](https://registry.hub.docker.com/_/ruby/)がある．

## 特徴

この公式の言語stackには以下の3つの特徴がある．

- [buildpack-depsイメージ](https://registry.hub.docker.com/_/buildpack-deps/)をベースにしている
- 各Versionをサポートしている
- [ONBUILD](http://docs.docker.com/reference/builder/#onbuild)をイメージもサポートしている

これらを簡単に説明する．

### Buildpack-deps

[buildpack-depsイメージ](https://registry.hub.docker.com/_/buildpack-deps/)というのは，[HerokuのStack](https://github.com/heroku/stack-images/blob/master/bin/cedar.sh)のようなイメージで，各言語を動かすために必要な基本的な依存関係等がインストールされている．

Dockerfileは以下．

```bash
FROM debian:wheezy

RUN apt-get update && apt-get install -y \
    autoconf \
    build-essential \
    imagemagick \
    libbz2-dev \
    libcurl4-openssl-dev \
    libevent-dev \
    libffi-dev \
    libglib2.0-dev \
    libjpeg-dev \
    libmagickcore-dev \
    libmagickwand-dev \
    libmysqlclient-dev \
    libncurses-dev \
    libpq-dev \
    libpq-dev \
    libreadline-dev \
    libsqlite3-dev \
    libssl-dev \
    libxml2-dev \
    libxslt-dev \
    libyaml-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y \
    bzr \
    cvs \
    git \
    mercurial \
    subversion \
    && rm -rf /var/lib/apt/lists/*
```

よく言語をインストールする際に依存で入れるべきものが揃っている．これを元に各言語スタックは作成されるので，これらの依存のインストールし忘れなどを防ぐことができる．

### Version

各言語スタックは適切にバージョンがタグとして付加されているため，使いたいバージョンを選んで使うことができる．例えば，rubyのv2.1.3を使いたければ[ruby:2.1.3イメージ](https://github.com/docker-library/ruby/blob/50295f3a139273601b5f2df29060ee2788f067d3/2.1/Dockerfile)を，pythonの3.4.1を使いたければ[python:3.4.1イメージ](https://github.com/docker-library/python/blob/a30ed3056ee58ca3df4fd5b51e3d30849dcb7e32/3.4/Dockerfile)を選択できる．

### ONBUILD

言語スタックでは，普通のイメージに加えて，`ONBUILD`イメージもサポートされている．

`ONBUILD`はDockerfileのコマンドで，これに続いて別のDockerfileコマンドを記述する．そして，そのDockerfileを元にビルドされたイメージをFROMとしてDockerfileを新たに作成し，ビルドを実行すると，上で`ONBUILD`と共に記述したコマンドが実行される．つまり，Dockerfileに親子関係を持たせることができる（詳しくは，["DockerfileのONBUILD"](http://deeeet.com/writing/2014/03/21/docker-onbuild/)に書いた）．

これは結構良くて，言語スタックでは，依存関係ファイルの`ADD`とインストールの実行，アプリの`ADD`に使われている．例えば，RailsのONBUILDイメージの場合は，GemfileとGemfile.lockの`ADD`，Railsアプリの`ADD`が記述されている．つまり，RailsのONBUILDイメージを使えば，特殊なことをしていない限りDockerfileにほとんど何も書かなくて良い．

また，ここにはコミュニティ開発の良さも含まれていて，例えば，["RailsアプリをDockerにデプロイするときにGemfileを変更してなければBundle Installをスキップする方法"](http://wazanova.jp/items/901)といった，Dockerfileのベストプラクティスがちゃんと含まれている．

## 使ってみる

とりあえず，いくつか軽く使ってみる．

### rails

まず，railsイメージ．[ruby:2.1.2イメージ](https://github.com/docker-library/ruby/blob/50295f3a139273601b5f2df29060ee2788f067d3/2.1/Dockerfile)を元に作られた[onbuildイメージ](https://github.com/docker-library/rails/blob/7bb6ade7f97129cc58967d7d0ae17f4b62ae52eb/onbuild/Dockerfile)を使う．このイメージは以下のDockerfileで作成されている．いくつかの`ONBUILD`と，Railsを動かすのに必要なnodeのインストールなどが記述されている．

```bash
FROM ruby:2.1.2

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ONBUILD ADD Gemfile /usr/src/app/
ONBUILD ADD Gemfile.lock /usr/src/app/
ONBUILD RUN bundle install --system

ONBUILD ADD . /usr/src/app

RUN apt-get update && apt-get install -y nodejs --no-install-recommends && rm -rf /var/lib/apt/lists/*

EXPOSE 3000
CMD ["rails", "server"]
```

これを使うのは簡単．実際にサンプルアプリを作って動かしてみる．まず，以下でDockerイメージをbuildする．

```bash
$ rails new sample-app
$ cd sample-app
$ echo 'FROM rails:onbuild' > Dockerfile
$ docker build -t tcnksm/sample-rails .
```

1行のDockerfileを作るだけで良い．それをbuildすると`ONBUILD`により，`Gemfile`と`Gemfile.lock`の`ADD`と`bundle install`が実行される．そして，カレントディレクトリのアプリケーションが`ADD`される．

後は以下を実行すれば，親Dockerfileの`CMD`に記述された`rails server`で，コンテナが起動する．

```bash
$ docker run -d -p 3000:3000 tcnksm/sample-app
$ curl http://<container-ip>:3000
```

### golang

golangだとアプリケーションを動かすより，コンテナによるクリーンな環境でのコンパイルに使うのが良さそう．それも簡単にできる．

例えば，[tcnksm/ghr](https://github.com/tcnksm/ghr)を[go-1.3.1イメージ](https://github.com/docker-library/golang/blob/9ff2ccca569f9525b023080540f1bb55f6b59d7f/1.3/Dockerfile)でコンパイルする．

```bash
$ git clone https://github.com/tcnksm/ghr
$ cd ghr
$ docker run --rm -v "$(pwd)":/usr/src/ghr -w /usr/src/ghr golang:1.3.1 bash -c 'go get -d ./... && go build -v'
```

[go-1.2イメージ](https://github.com/docker-library/golang/blob/9ff2ccca569f9525b023080540f1bb55f6b59d7f/1.2/Dockerfile)でコンパイルする．

```bash
$ docker run --rm -v "$(pwd)":/usr/src/ghr -w /usr/src/ghr golang:1.2 go build -v
```

[go-1.3.1のクロスコンパイル用イメージ](https://github.com/docker-library/golang/blob/40bd84e4bcc278281595174a60e7b4451d972dee/1.3/cross/Dockerfile)で`windows/386`にクロスコンパイルする．

```bash
$ docker run --rm -v "$(pwd)":/usr/src/ghr -w /usr/src/ghr -e GOOS=windows -e GOARCH=386 golang:1.3.1-cross go build -v
```

## コントリビュートしたい

プロジェクトを作って[partners@docker.com](mailto:partners@docker.com)にメールすれば，公式のDockerHubレポジトリとして取り込んでもらえる可能性もある．

以下のガイドラインに従う．

- [Guidelines for Creating and Documenting Official Repositories](https://docs.docker.com/docker-hub/official_repos/)
- [Best Practices for Writing Dockerfile](https://docs.docker.com/articles/dockerfile_best-practices/)

## まとめ

Dockerが出たときって，Dockerfileを書くのは時代に逆行しているから自動生成しようといった意見やツールを見た．実際，自分でも["rbdockというRuby/Rails/Sinatra用のDockerfileを生成するgem"](http://deeeet.com/writing/2014/03/06/rbdock/)をつくったりした．でも，DockerHubのおかげで良いDockerfileを**みんなで作って**，そのイメージを使えるだけにしようという流れになっている．どんどん簡単になっていく．

ただ，いきなり使うのは危険で，例えばONBUILDとか何が仕込まれてるかbuildしないとわからい．ので，使う前にちゃんとDockerfileに一度目を通すのが大事かなと．その辺はOSSのツールを使うときと同じ．



