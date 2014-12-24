---

title: 'rbdockというRuby/Rails/Sinatra用のDockerfileを生成するgemをつくった'
date: 2014-03-06
comments: true
categories: docker
---

- [tcnksm/rbdock](https://github.com/tcnksm/rbdock)
- [rbdock | RubyGems.org | your community gem host](https://rubygems.org/gems/rbdock)

実験的に作ってみた．RubyやRails，Sinatraアプリケーションを動かすためのDockerfileを生成する．

これを作った理由は，今まで自分でRuby/Rails/Sinatraのコンテナを作ってみたり，Web上のRuby+Docker関連の記事などを見ていると，どれも同じようなDockerfileを書いていたため．

さらに，Dockerの流れを見ていると，

- コンテナは必要なものだけを入れるようになりそう．つまり，RedisならRedisの，nginxならnginxの，RailsならRailsのコンテナをそれぞれ作るようになりそう．
- コンテナの起動やコンテナ間の連携は[Fig](http://orchardup.github.io/fig/index.html)などが受け持ってくれそう．

な雰囲気なので，Ruby/Rails/Sinatra用のコンテナをつくるためのDockerfileをつくるところに特化したツールを作ってみようと考えた．ちなみにDocker.ioには，あらかじめRubyがビルドされたイメージが上げられつつある．だから，それをそのまま使うのもありだけど，編集可能なDockerfileが手元にある方がよい．



## インストール

gemでインストールする．

```bash
$ gem install rbdock
```

インストールが完了すると`rbdock`というコマンドが使えるようになる．

```bash
$ rbdock --version
rbdock 0.1.0
```

## 使い方（Rubyのみ）

使い方は以下．使いたいバージョンのRubyを指定するだけで，そのバージョンのRubyが使えるDockerfileが生成される．

```bash
$ rbdock <ruby-versions> [<args>]
```

例えば，ruby 2.1.0が使えるDockerfileを生成したい場合は以下のようにする．

```bash
$ rbdock 2.1.0
```

生成結果は以下．

```
FROM ubuntu

# Install basic packages
RUN apt-get update
RUN apt-get install -y build-essential wget curl git
RUN apt-get install -y zlib1g-dev libssl-dev libreadline-dev libyaml-dev libxml2-dev libxslt-dev
RUN apt-get install -y sqlite3 libsqlite3-dev
RUN apt-get clean

# Install ruby-build
RUN git clone https://github.com/sstephenson/ruby-build.git .ruby-build
RUN .ruby-build/install.sh
RUN rm -fr .ruby-build

# Install ruby-2.1.0
RUN ruby-build 2.1.0 /usr/local

# Install bundler
RUN gem update --system
RUN gem install bundler --no-rdoc --no-ri
```

あとは，このDockerfileを基にイメージをビルドするだけ．

```bash
$ docker build -t tcnksm/ruby:2.1.0
$ docker run -i -t tcnksm/ruby:2.1.0 bash -c -l 'ruby -v'
ruby 2.1.0p0 (2013-12-25 revision 44422) [x86_64-linux]
```

複数のバージョンを指定することもできる．

```bash
$ rbdock 2.0.0-p353 1.9.3-p484
```

生成結果は，[こちら](https://gist.github.com/tcnksm/9388736)．複数のRubyをインストールする場合デフォルトでは[rbenv](https://github.com/sstephenson/rbenv)が使われるが，`--rvm`オプションで[rvm](https://rvm.io/)を使うこともできる．

## 使い方（Rails/Sinatra）

Rails/Sinatraアプリケーションを同梱したイメージを作るためのDockerfileも生成できる．例えば，ローカルのRailsアプリケーションを含めたい場合は，以下のように`--app`オプションにアプリケーションのパスを渡す．


```bash
$ rails new my_rails_app
...
$ rbdock 2.0.0-p353 --app my_rails_app
```

生成結果は以下．

```
FROM ubuntu

# Install basic packages
RUN apt-get update
RUN apt-get install -y build-essential wget curl git
RUN apt-get install -y zlib1g-dev libssl-dev libreadline-dev libyaml-dev libxml2-dev libxslt-dev
RUN apt-get install -y sqlite3 libsqlite3-dev
RUN apt-get clean

# Install ruby-build
RUN git clone https://github.com/sstephenson/ruby-build.git .ruby-build
RUN .ruby-build/install.sh
RUN rm -fr .ruby-build

# Install ruby-2.0.0-p353
RUN ruby-build 2.0.0-p353 /usr/local

# Install bundler
RUN gem update --system
RUN gem install bundler --no-rdoc --no-ri

# Add application
RUN mkdir /myapp
WORKDIR /myapp
ADD my_rails_app/Gemfile /myapp/Gemfile
RUN bundle install
ADD my_rails_app /myapp

ENTRYPOINT ["bash", "-l", "-c"]
```

Gemfileを`ADD`するテクニックは["How to Skip Bundle Install When Deploying a Rails App to Docker if the Gemfile Hasn’t Changed"](http://ilikestuffblog.com/2014/01/06/how-to-skip-bundle-install-when-deploying-a-rails-app-to-docker/)を参考にしている．

後は，イメージをビルドしてコンテナを起動するだけ．

```bash
$ docker build -t tcnksm/rails_app .
$ docker run -i -p 3000:3000 -t tcnksm/rails_app 'rails server'
```

リモートのレポジトリにホストしているプロジェクトを同梱することも可能．例えば，Githubに置いてあるSinatraアプリケーションを指定する．

```bash
$ rbdock 2.0.0-p353 --app https://github.com/tcnksm/trying-space
```

生成結果は，[こちら](https://gist.github.com/tcnksm/9389116)．あとは，ビルドして起動するだけ．

```bash
$ docker build -t tcnksm/sinatra_app .
$ docker run -i -p 8080:8080 -t tcnksm/my_sinatra_app 'rackup -p 8080'
```

## オプション

指定可能なオプションは以下

- `--image`
    - ベースイメージを指定する．デフォルトはubuntu．現時点ではubuntuとcentosのみに対応している．
- `--rbenv`
    - Rubyのインストールに[rbenv](https://github.com/sstephenson/rbenv)を使う．
- `--rvm`
    - Rubyのインストールに[rvm](https://github.com/wayneeseguin/rvm)を使う．
- `--app`
    - Rails/SinatraのアプリケーションのPathもしくはレポジトリのURLを指定する．
- `--list`
    - 利用可能なRubyのバージョンを表示する．


## バグ

[@deeeet](https://twitter.com/deeeet)，もしくはGithubのIssueにお願いします．

## 参考

- [Docker for Rubyists](http://www.sitepoint.com/docker-for-rubyists/)
- [Using Docker and Vagrant on Mac OS X with a Ruby on Rails application](http://www.powpark.com/blog/programming/2013/11/11/using-docker-and-vagrant-on-mac-osx-for-a-ruby-on-rails-app/)
- [OSX, Vagrant, Docker, and Sinatra](http://dyli.sh/2013/08/23/OSX-Vagrant-Docker-Sinatra.html)
- [Sinatra deployment with Docker](http://haanto.com/sinatra-deployment-with-docker/)
- [ruby が色々入っている docker イメージを作っておいたメモ](http://blog.livedoor.jp/sonots/archives/36632684.html)
- [Dockerで複数バージョンのrubyがインストールされたイメージを作る](http://deeeet.com/writing/2013/12/12/docker-rbenv/)

















