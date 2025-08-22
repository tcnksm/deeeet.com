---

title: 'Dockerとは何か？どこで使うべきか？'
date: 2014-05-01
comments: true
categories: docker
---


この記事はDockerに関する実験的な記事や，Buildpackを使ってHeroku AppをDocker Containerとして使えるようにする["building"](https://github.com/CenturyLinkLabs/building)の開発などで知られるCenturyLink Labsの
["What is Docker and When To Use It"](http://www.centurylinklabs.com/what-is-docker-and-when-to-use-it/)の翻訳です．
Dockerとは何か？Dockerをどこで使うべきか？についてよく見かける記事とは違った視点から説明されています．
翻訳は[許可](https://twitter.com/CenturyLinkLabs/status/459030687484362752)をとった上で行っています．

## Dockerとは何でないか

Dockerとは何かを説明する前に，Dockerは何で**ない**かについて述べる．Dockerの否定形は何か？Dockerの制限は何か？Dockerが得意でないことは何か？

- DockerはLXCのようなLinux Containerでは**ない**
- DockerはLXCだけのラッパーでは**ない**（理論的には仮想マシンも管理できる）
- DockerはChefやPuppet，SaltStackのようなConfiguration toolの代替では**ない**
- DockerはPaaSでは**ない**
- Dockerは異なるホスト間での連携が得意では**ない**
- DockerはLXC同士を隔離するのが得意では**ない**

## Dockerとは何か

では，Dockerは何ができるのか？メリットはなにか？

- Dockerはインフラを管理することができる
- Dockerはイメージのビルドや，Docker Indexを通じたイメージの共有ができる
- DockerはChefやPuppetといったConfiguration toolによりビルドされたサーバのテンプレートにとって，イメージ配布の良いモデルである
- DockerはCopy-on-wirteのファイルシステムである[btrfs](http://ja.wikipedia.org/wiki/Btrfs)を使っており，Gitのようにファイルシステムの差分を管理することができる
- Dockerはイメージのリモートレポジトリをもっているため，簡単にそれらを様々なOS上で動かすことができる

## Dockerの代替は何か

Amazonの[AWS Marketplace](https://aws.amazon.com/marketplace/ref=mkt_ste_amis_redirect?b_k=291)はDocker Indexに近い．ただし，AMIはAWS上でしか動かすことができないのに対して，Dockerイメージは，Dockerが動いているLinuxサーバであればどこでも動かすことができる．

Cloud Foundryの[Warden](https://github.com/cloudfoundry/warden)はLXCの管理ツールであり，Dockerに近い．ただし，Docker Indexのような他人とイメージを共有する仕組みを持っていない．

## Dockerをいつ使うべきか

DockerはGitやJavaのような基本的な開発ツールになりうるものであり，日々の開発やオペレーションに導入し始めるべきである．

例えば，

- インフラのバージョン管理システムとして使う
- チームにアプケーション用のインフラを配布したいときに使う
- 稼働中のサーバーと同様の環境をラップトップ上に再現して，コードを実行したいときに使う（例えば[building](https://github.com/centurylinklabs/building)を使う）
- 複数の開発フェーズ（dev，stg，prod，QA）が必要なときに使う
- [ChefのCookbook](http://tech.paulcz.net/2013/09/creating-immutable-servers-with-chef-and-docker-dot-io.html)や[PuppetのManifest](http://puppetlabs.com/blog/building-puppet-based-applications-inside-docker)と使う


## DockerとJavaはどこが似ているのか

Javaには"Write Once. Run Anywhere（一度書けばどこでも実行できる）"という文言がある．

Dockerはそれに似ている．Dockerは，一度イメージをビルドすると，Dockerが動いているLinuxサーバであれば全く同じようにそれを動かすことができる（["Build Once．Run Anywhere"](https://speakerdeck.com/naoya/dockerapurikesiyonfalsepotabiriteiwokao-eru-number-dockerjp)）．

Javaの場合，例えば以下のようなJavaコードがあるとする．

```java
// HelloWorld.java
class HelloWorldApp {
    public static void main(String[] args) {
        System.out.println("Hello World!");
    }
}
```

`javac HelloWorld.java`により生成される`HelloWorld.class`は，JVMがあればどこでも動かすことができる．

Dockerの場合，例えば以下のようなDockerfileがあるとする．

```bash
FROM ubuntu:13.10

ENV DEBIAN_FRONTEND noninteractive
RUN apt-get update -qq -y && \
    apt-get install curl -qq -y && \
    apt-get clean

RUN curl -sSL https://get.rvm.io | bash -s stable --ruby=2.1.1
```

`docker built -t tcnksm/ruby`により生成される`tcnksm/ruby`イメージは，Dockerが動いていればどこでも動かすことができる．


## DockerとGitはどこが似ているのか

Gitの公式には，"Tiny footprint with lightning fast performance（高速性能を備えた履歴管理）"という文言がある．Dockerはコードの変更履歴ではなく，ファイルシステムの変更履歴を管理する．

### diff

Gitの場合，以下のようにコードの変更が確認できる．

```bash
$ echo 'Hello' > README.md
$ git diff --name-status
M       README.md
```

Dockerの場合，以下のようにファイルシステムの変更が確認できる．

```bash
$ ID=$(docker run -d ubuntu bash -c 'touch README.md; sleep 100')
$ docker diff $MY_DOCKER
A /README.md
C /dev
C /dev/core
C /dev/fd
C /dev/ptmx
C /dev/stderr
C /dev/stdin
C /dev/stdout
```

### commit & push

Gitの場合，以下のようにコードの変更をコミットし，リモートレポジトリにpushする

```bash
$ git commit -m "Add README.md"
$ git push
```

Dockerの場合，以下のようにファイルシステムの変更をコミットし，リモートレジストリにpushする．

```bash
$ docker commit -m "Add README.md" $ID tcnksm/ubuntu
$ docker push tcnksm/ubuntu
```

### pull

Gitの場合，以下のようにリモートレポジトリからコードを取得する．

```bash
$ git pull
```

Dockerの場合，以下のようにリモートレジストリからイメージを取得する．

```bash
$ docker pull tcnksm/ubuntu
```

## まとめ

`docker push`や`docker pull`といったイメージの共有機能は，Dockerの大きな特徴のひとつ．pullするだけで，あらゆるDockerイメージをどんなマシン上でも動かすことができるのは素晴らしい．push/pullの機能により，AppチームとOpsチームでインフラ構築の共同作業が簡単になる．Appチームは，アプリケーション用のコンテナの構築に集中でき，Opsチームはサービス用のコンテナの作成に集中できる．Appチームはアプリケーション用のコンテナをOpsチームに共有でき，OpsチームはMySQLやPostgreSQL，Redis用のコンテナをAppチームに共有できる．

