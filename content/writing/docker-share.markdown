---

title: 'Docker Share'
date: 2014-03-12
comments: true
categories: docker
---

[Vagrant Shareとngrok](http://deeeet.com/writing/2014/03/11/vagrant-share/)

Vagrant Share素晴らしい．外部ネットワークのマシンから，ローカルに立てた仮想マシンへのアクセスを実現している．

## TL;DR

[ngrok](https://ngrok.com/)を使えば，Dockerコンテナに対してVagrant Shareと同様のことができる．つまり，Dockerコンテナを外部ネットワークからアクセス可能にすることができる．

以下をやってみた．

- Apacheコンテナへのアクセス
- Railsコンテナへのアクセス

## 準備

OSX上で行った．dockerはboot2dockerで動かす．

```
$ brew install boot2docker
```

事前にboot2dockerにport forwardingの設定をしておく．

```
$ VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port8080,tcp,,8080,,8080"
```

設定が終わったらしたら，boot2dockerを起動しておく．

```bash
$ boot2docker start
```

また，ngrokを[ダウンロード](https://ngrok.com/download)して適切な場所に配置しておく．

## Apacheコンテナ

以下のようなDockerfileを準備する．

```bash
FROM ubuntu:12.04

RUN apt-get update
RUN apt-get install -y apache2

ENV APACHE_RUN_USER www-data
ENV APACHE_RUN_GROUP www-data
ENV APACHE_LOG_DIR /var/log/apache2

EXPOSE 80

ENTRYPOINT ["/usr/sbin/apache2"]
CMD ["-D", "FOREGROUND"]
```

イメージをビルドする．

```bash
$ docker build -t apache2 .
```

コンテナを起動する．このとき，8080->80でport forwardingをする．

```bash
$ docker run -p 8080:80 apache2
```

次に，ngrokを8080ポートで起動する．

```bash
$ ngrok 8080
```

すると，[http://4c9084d8.ngrok.com](http://4c9084d8.ngrok.com)のようなURIが発行される．あとはVagrant Shareと同様にこのURIを共有すれば，外部ネットワークからこのコンテナにアクセスできる．

以下のような流れでコンテナ内へのアクセスが実現される．

```
http://4c9084d8.ngrok.com -> 127.0.0.1:8080 (localhost)
-> 127.0.0.1:8080 (boot2docker-vm) -> 127.0.0.1:80 (apache container)
```

## Railsコンテナ

Railsコンテナでもやってみた．

Railsアプリを新規に作成し，[rbdock](http://deeeet.com/writing/2014/03/06/rbdock/)を使ってRailsアプリ用のDockerfileを生成する．

```bash
$ rails new myapp
$ rbdock 2.1.0 -a myapp
```

すると，[このようなDockerfile](https://gist.github.com/tcnksm/9497916)が生成される．

イメージをビルドする．

```bash
$ docker build -t rails 
```

コンテナを起動する．8080->3000でport forwadingをする．

```bash
$ docker run -i -p 8080:3000 rails 'rails server'
```

同様にngrokを8080ポートで起動する．

```bash
$ ngrok 8080
```

すると，[http://36a98c94.ngrok.com](http://36a98c94.ngrok.com)のようなURIが発行される．あとはこのURIを共有するだけ．簡単だ．

## 参考

- [tcnksm/docker-share](https://github.com/tcnksm/docker-share)
- [ngrok - secure introspectable tunnels to localhost](https://ngrok.com/)
- [Vagrant Shareとngrok](http://deeeet.com/writing/2014/03/11/vagrant-share/)


