---

title: 'Docker+Serf+HAproxy (+Supervisor)'
date: 2014-04-08
comments: true
categories: docker serf
---

- [SerfでDockerコンテナのクラスタを形成する](http://deeeet.com/writing/2014/03/31/docker-serf/)
- [SerfでHAProxyの更新 on Vagrant](http://deeeet.com/writing/2014/04/01/serf-haproxy/)

でやったことを融合した．つまり，HAProxy（ロードバランサ）コンテナとWebサーバコンテナを立てて，Serfでそれらのクラスタを形成する．そしてWebサーバコンテナの増減に応じてHAProxyコンテナの設定を書き換えるということをやってみた．

基本的には，上でやったことをDockerのコンテナに移行するだけだが，Dockerは1コンテナで1プロセスが普通であるため，複数プロセス（サービス）をどう扱うかが問題になる．

Dockerで複数プロセスを扱うときには，[Supervisor](http://supervisord.org/)という選択肢がある．この方法は，[公式](http://docs.docker.io/en/latest/examples/using_supervisord/)で紹介されていたり，Foot Fightの["Docker in Practice"](http://foodfightshow.org/2013/11/docker-in-practice.html)で言及されてたり，CenturyLink Labsが[試みて](http://www.centurylinklabs.com/auto-loadbalancing-with-fig-haproxy-and-serf/)いたりする．

ということで，SupervisordとSerf，HAproxyによるDockerコンテナのディスカバリをやってみた．


[tcnksm/docker-serf-haproxy](https://github.com/tcnksm/docker-serf-haproxy)

## 準備

OSX+boot2dockerで行う．あらかじめboot2docker-vmのport forwardingの設定だけしておく．

```bash
$ boot2docker init
$ VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port8080,tcp,,8080,,8080"
$ boot2docker up
```

## HAProxy+Serfコンテナ

Dockerfileは以下．

```bash
FROM ubuntu

# Install serf
RUN apt-get install -y unzip wget
RUN wget --no-check-certificat https://dl.bintray.com/mitchellh/serf/0.5.0_linux_amd64.zip -O serf.zip
RUN unzip serf.zip
RUN chmod +x serf
RUN mv serf /usr/bin/serf

# Install HAProxy
RUN apt-get -y install haproxy
RUN sed -i -e 's/ENABLED=0/ENABLED=1/' /etc/default/haproxy

# Install supervisor
RUN apt-get install -qy supervisor

# Install basic packages for ruby
RUN apt-get -y update
RUN apt-get install -y build-essential git
RUN apt-get install -y zlib1g-dev libssl-dev libreadline-dev libyaml-dev libxml2-dev libxslt-dev
RUN apt-get clean

# Install ruby-build
RUN git clone https://github.com/sstephenson/ruby-build.git .ruby-build
RUN .ruby-build/install.sh
RUN rm -fr .ruby-build

# Install ruby-2.1.0
RUN ruby-build 2.1.0 /usr/local

# Add Handler
ADD default_haproxy.cfg /etc/haproxy/haproxy.cfg
ADD supervisord-haproxy.conf /etc/supervisor/conf.d/supervisord-haproxy.conf
ADD handler.rb /handler.rb

EXPOSE 80
CMD ["supervisord", "-n"]
```

やっているのは，

- Serfのインストール
- HAProxyのインストール
- Supervisorのインストール
- Rubyのインストール
- 設定ファイル，イベントハンドラスクリプトの追加

Rubyをインストールしているのは，HAProxyの設定を書き換えるためのイベントハンドラをRubyで書いたためで，これはシェルスクリプトでも全然できる（Serfレポジトリの[デモページ](https://github.com/hashicorp/serf/tree/master/demo/web-load-balancer)を参照）．余談だが，キャッシュが効くように変更が入りうる設定ファイル等の`ADD`はなるべく最後の方に記述するようにしたほうがよい．

HAProxyのデフォルトの設定ファイルは[default_haproxy.cfg](https://github.com/tcnksm/docker-serf-haproxy/blob/master/haproxy/default_haproxy.cfg)で，イベントハンドラでこれを書き換える．

イベントハンドラは[handler.rb](https://github.com/tcnksm/docker-serf-haproxy/blob/master/haproxy/handler.rb)で，roleがwebのメンバーが参加したらそのメンバーのIPをhaproxy.cfgに追記，離脱したら設定を削除する．

Supervisorの設定ファイルは以下．

```
# supervisord-haproxy.conf
[supervisord]
nodaemon=true

[program:haproxy]
command=service haproxy start
numprocs=1
autostart=true
autorestart=true

[program:serf]
command=serf agent -tag role=lb -node proxy -event-handler 'ruby /handler.rb'
```

あとは，起動コマンドに`["supervisord","-n"]`を指定しておけば，コンテナを立ち上げたときに，HAProxyとSerfが両方起動する．

イメージをビルドしておく．

```bash
$ docker build -t tcnksm/haproxy .
```

## Nginx+Serfコンテナ

Webサーバには，nginxを利用する．Dockerfileは以下．

```bash
FROM ubuntu

# Install serf
RUN apt-get install -y unzip wget
RUN wget --no-check-certificat https://dl.bintray.com/mitchellh/serf/0.5.0_linux_amd64.zip -O serf.zip
RUN unzip serf.zip
RUN chmod +x serf
RUN mv serf /usr/bin/serf

# Install nginx
RUN apt-get -y update
RUN apt-get -y install nginx

# Install supervisor
RUN apt-get install -qy supervisor

# Supervisord config
ADD supervisord-nginx.conf /etc/supervisor/conf.d/supervisord-nginx.conf

# Default page
ADD index.html /usr/share/nginx/www/index.html

# Startup script (We need this to use environmetal variables with --link)
ADD start-serf.sh /start-serf.sh
RUN chmod 755 /start-serf.sh

EXPOSE 80
CMD ["supervisord", "-n"]
```

やっているのは，

- Serfのインストール
- Nginxのインストール
- Supervisorのインストール
- 設定ファイル，デフォルトページ，Serf起動スクリプトの追加

Supervisorの設定ファイルは以下．

```bash
# supervisord-nginx.conf
[supervisord]
nodaemon=true

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
numprocs=1
autostart=true
autorestart=true

[program:serf]
command=/start-serf.sh
numprocs=1
autostart=true
autorestart=true
```

HAProxyコンテナと同様に，起動コマンドに["supervisord","-n"]を指定しておけば，コンテナを立ち上げたときに，NginxとSerfが両方起動する．

Serfの起動スクリプトは，以下．

```bash
#!/bin/bash

exec serf agent \
    -tag role=web \
    -join $SERF_PORT_7946_TCP_ADDR:$SERF_PORT_7946_TCP_PORT
```

クラスタに参入するときに必要となる，メンバーのIPはDockerのLink機能を利用して取得する（Link機能については，["Dockerコンテナ間のlink，database.ymlの書き方"](http://deeeet.com/writing/2014/03/20/docker-link-container/)に書いた）．

バランシングされていることを確認するために，異なるデフォルトページを持つ2つのイメージを作成しておく．

```bash
$ echo '<h1>web1</h1>' > index.html
$ docker build -t tcnksm/web1 .
$ echo '<h1>web2</h1>' > index.html
$ docker build -t tcnksm/web2 .
```

## 動かしてみる

まず，HAProxyコンテナを起動する．

```bash
$ docker run -d -t -p 8080:80 -p 7946 --name haproxy tcnksm/haproxy
```

起動の確認には，`docker logs $(docker ps -l -q)`する．

次に，Nginxコンテナを起動する．

```bash
$ docker run -d -t --link haproxy:serf tcnksm/web1
$ docker run -d -t --link haproxy:serf tcnksm/web2
```

バランシングされているのを確認する．

```bash
$ curl http://0.0.0.0:8080
```

余談．ホスト（OSX）側からserfのメンバーに参入してクラスタのメンバの確認をする．

```bash
$ serf agent -bind 127.0.0.1 -join $(docker port proxy 7946)
$ serf members
OSX             127.0.0.1:7946   alive
71bb31bdb656    172.17.0.3:7946  alive  role=web
042494b4df57    172.17.0.4:7946  alive  role=web
haproxy         172.17.0.2:7946  alive  role=lb
```

事前に`$(docker port proxy 7967)`のportにホスト側からアクセスできるようにboot2docker-vmのport forwardingをやっておくこと．`haproxy`コンテナ以外には接続できないので，ゴシップが送れないため，あくまで一時的なデバッグ用．


## 雑感

やってみると案外簡単だった．ただ，これはDockerのLink機能を使ってるため，同一ホスト内でしか利用できない手法になる．負荷を考えるとしんどそう．異なるホスト間でもSerf+Dockerで連携できるようにしたい（既にCenturyLink Labsの["Linking Docker Containers with a Serf Ambassador"](http://www.centurylinklabs.com/linking-docker-containers-with-a-serf-ambassador/)がある）．

ただ，SupervisorつかってDockerで複数プロセスを動かすときとかの参考になればと．

### 参考

- [Docker in Practice - Food Fight](http://foodfightshow.org/2013/11/docker-in-practice.html)
- [Auto-Loadbalancing Docker with Fig, HAProxy and Serf](http://www.centurylinklabs.com/auto-loadbalancing-with-fig-haproxy-and-serf/)
- [Using Supervisor with Docker](http://docs.docker.io/en/latest/examples/using_supervisord/)
- [Serf+HAProxyで作るAutomatic Load Balancer](http://blog.glidenote.com/blog/2013/10/30/serf-haproxy/)
- [Synapse と Serf でサービスディスカバリ](http://blog.ryotarai.info/blog/2014/04/01/service-discovery-by-syanpse-with-serf/)
- [Serf Demo: Web Servers + Load Balancer](https://github.com/hashicorp/serf/tree/master/demo/web-load-balancer)
- [Serf設定オプションまとめ](http://pocketstudio.jp/log3/2014/03/29/serf_configuration_quick_guide/)
