---

title: 'OrchardにDockerアプリケーションをデプロイ'
date: 2014-03-22
comments: true
categories: docker
---

[Orchard](https://orchardup.com/)は，Docker as a ServiceなDocker専用のホスティングサービス．[DigitalOcean]()のように時間単位の課金で利用できる．DigitalOceanより若干高いが，512MB RAM/20GB SSDであれば，1時間1円/月1000円程度で利用できる．

同様のサービスには，[StackDock](https://stackdock.com/)がある．またDockerをサポートしているプラットフォームとしては，[Google Compute Engine](https://cloud.google.com/products/compute-engine/)やDigitalOceanなどがある．これと比較してOrchardがよいと感じた理由は以下．

- シンプル．専用のコマンドラインラッパーを使って，いつも通りのDockerコマンドをローカルから発行するだけでbuild/runが実行できる（StackDockはWebコンソールにDockerfileを書く）．
- [Fig](http://orchardup.github.io/fig/)のサポート/開発を行っており，将来的に複数のDockerのコンテナ間のリンクなどがやりやすくなりそう．

ということで，実際にサンプルアプリケーションをデプロイしてみた．サンプルコードは全て以下にある．

- [tcnksm/sample-docker-orchard](https://github.com/tcnksm/sample-docker-orchard)

## 準備

OSX上で行う．まず，Dockerのインストール．

```bash
$ brew update
$ brew tap homebrew/binary
$ brew install docker
```

次に，Dockerのデーモンを動かすために，VirtualBoxとboot2dockerのインストール．

```bash
$ brew tap phinze/homebrew-cask
$ brew cask install virtualbox
$ brew install boot2docker
```

boot2dockerを立ち上げて，Docker hostの環境変数を設定する．

```bash
$ boot2docker init
$ boot2docker up
$ export DOCKER_HOST=tcp://localhost:4243
```

ローカルで，アプリケーションの実行確認をする場合は，`up`する前に，boot2docker-vmのPort forwardingの設定をしておく．

```bash
$ VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port3000,tcp,,3000,,3000"
```

最後に，Orchardでアカウントを作成し，Orchardのコマンドラインツールをインストールする．

```bash
$ curl -L https://github.com/orchardup/go-orchard/releases/download/2.0.5/darwin > /usr/local/bin/orchard
$ chmod +x /usr/local/bin/orchard
```

## 準備（Railsアプリケーション）

今回は，サンプルアプリケーションとして，[mkwiatkowski/todo-rails4-angularjs](https://github.com/mkwiatkowski/todo-rails4-angularjs)を利用する（これは，Rails4でAngularJSを使ってみたというサンプルプロジェクト）．

```bash
$ git clone https://github.com/mkwiatkowski/todo-rails4-angularjs
```

このアプリケーションは，DBにPostgresqlを使っている．Postgresqlコンテナを立ててそれと連携するため，以下のように`config/database.yml`を記述する．

```
development:
  adapter: postgresql
  template: template0
  encoding: unicode
  database: todo_rails4_angularjs_development
  pool: 5
  username: docker
  password: docker
  host: <%= ENV.fetch('DB_PORT_5432_TCP_ADDR') %>
  port: <%= ENV.fetch('DB_PORT_5432_TCP_PORT') %>
```

Dockerのコンテナ間のリンクについては，["Dockerコンテナ間のlink，database.ymlの書き方"](http://deeeet.com/writing/2014/03/20/docker-link-container/)に書いた．

最後に，[rbdock](https://github.com/tcnksm/rbdock)を使ってRailsアプリケーション用のDockerfileを作成する（rbdockについては，["rbdockというRuby/Rails/Sinatra用のDockerfileを生成するgemをつくった"](http://deeeet.com/writing/2014/03/06/rbdock/)に書いた）．

```bash
$ gem install rbdock
$ rbdock 2.0.0-p247 --app todo-rails4-angularjs
```

[このようなDockerfile](https://github.com/tcnksm/sample-docker-orchard/blob/master/Dockerfile)が生成される．

後は，イメージをビルドしておく．

```bash
$ docker build -t tcnksm/rails .
```

## ローカルでの開発

デプロイする前にローカルで動作確認をする．

まず，Postgresqlコンテナには，orchardが提供している[orchard/postgresql]()を使う．これをpgという名前で立ち上げる．

```bash
$ docker run -d -p 5432:5432 -e POSTGRESQL_USER=docker -e POSTGRESQL_PASS=docker -name pg orchardup/postgresql
```

次に，上の準備で作成したRailsコンテナを立ち上げる．

```bash
$ docker run -i -p 3000:3000 -link pg:db -name web -t tcnksm/rails 'rake db:create && rake db:migrate && rails s'
```

[http://localhost:3000/](http://localhost:3000/)にアクセスすれば，実行が確認できる．

ローカルでの開発では，ONBUILDやVolumeを使ってイメージにアプリケーションをマウントして開発すれば，リアルタイムに更新が確認できて便利．また，Vagrant share的なこともできる．その辺りは以下に書いた．

- [DockerfileのONBUILD](http://deeeet.com/writing/2014/03/21/docker-onbuild/)
- [Docker share](http://deeeet.com/writing/2014/03/12/docker-share/)

## Orchardへのデプロイ

開発が完了したら，実際にOrchardにアプリケーションをデプロイしてみる．まず，作成したアカウントでログインする．

```bash
$ orchard hosts create
Orchard username: 
Password:
```

すると専用のホストが作成される．課金はここから始まる．

次に，Postgresqlコンテナを起動する．

```bash
$ orchard docker run -d -p 5432:5432 -e POSTGRESQL_USER=docker -e POSTGRESQL_PASS=docker -name pg orchardup/postgresql
```

そして，Railsイメージをビルドして起動する（イメージをdocker.ioに上げてある場合はbuildは必要ない）．

```bash
$ orchard docker build -t tcnksm/rails .
$ orchard docker run -i -p 3000:3000 -link pg:db -name web -t tcnksm/rails 'rake db:create && rake db:migrate && rails s'
```

起動ホストは以下で確認できる．

```
$ orchard hosts
NAME                SIZE                IP
default             512M                162.243.93.47
```

[http://162.243.93.47:3000/](http://162.243.93.47:3000/)にアクセスする．

ホストを削除したい場合は，以下のようにする．課金はこれで終了する．

```bash
$ orchard hosts rm
```

以上．

## 雑感

上で示したように，ローカルでの環境と全く同じコマンドを`orchard`コマンドを介して発行するだけで利用できる．素晴らしい．とてもシンプル．

Figも試したい．また今作っている自分のアプリケーションも実際にデプロイして運用していきたい．





