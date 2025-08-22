---

title: 'DockerのHost networking機能'
date: 2014-05-11
comments: true
categories: docker serf
---

[DOCKER 0.11 IS THE RELEASE CANDIDATE FOR 1.0](http://blog.docker.io/2014/05/docker-0-11-release-candidate-for-1-0/)

1.0のRCである0.11はいくつかの新機能が追加された．例えば，SELinuxのサポートや，Host networking機能，Link機能でのホスト名，Docker deamonへのpingなど．

この中でもHost networking機能がなかなか面白いので，実際に手を動かして検証してみた．事前知識として["Dockerのネットワークの基礎"](http://deeeet.com/writing/2014/05/11/docker-network/)も書きました．ネットワークに関して不安があるひとが先にみると，Host Networing機能の利点／欠点もわかりやすいと思います．

## TL;DR

Host networking機能を使うと，異なるホスト間のコンテナの連携がちょっぴりやりやすくなる．SerfやConsulのようなサービスディスカバリーツールとの相性も良さそう．

まだ出たばかりの機能で実際に使ってるひとがいないので，あくまで個人の実感．[HNのコメント](https://news.ycombinator.com/item?id=7712769)で同様の発言は見かけた．

## ネットワークモード

コンテナを起動するとき，`--net`オプションで4つのネットワークモードを選択することができる．

- `--net=bridge`：仮想ブリッジ`docker0`に対して新しくネットワークスタックを作成する（default）
- `--net=container:<コンテナ名|コンテナID>`：他のコンテナのネットワークスタックを再利用する
- `--net=host`：ホストのネットワークスタックをコンテナ内で利用する
- `--net=none`：ネットワークスタックを作成しない


### bridge

ブリッジモードはデフォルトの挙動で，ループバックの`lo`と仮想インターフェースの`eth1`がつくられる．`eth1`はホストの`veth`（Virtual Ethernet）とパイプされる．このモードは外部のネットワークとは隔離される．

```bash
$ docker run --net=bridge ubuntu ifconfig
eth0      Link encap:Ethernet  HWaddr 96:e7:26:24:69:55
               inet addr:172.17.0.2  Bcast:0.0.0.0  Mask:255.255.0.0

lo        Link encap:Local Loopback
            inet addr:127.0.0.1  Mask:255.0.0.0
```


### container

コンテナモードでは既に起動しているコンテナのネットワークスタックが再利用される．以下の場合だと，あらかじめ起動した`hello`コンテナで作成したネットワークスタックがそのまま利用される．つまり，`hello`コンテナを起動したときにホスト側でつくられた`veth`と仮想インターフェース`eth0`のパイプがそのまま利用される．

```bash
$ docker run -d --name hello ubuntu /bin/sh -c "while true; do echo hello world; sleep 1; done"
$ docker run --net=container:hello ubuntu ifconfig
eth0      Link encap:Ethernet  HWaddr b2:f4:26:c4:17:16
               inet addr:172.17.0.2  Bcast:0.0.0.0  Mask:255.255.0.0

lo        Link encap:Local Loopback
            inet addr:127.0.0.1  Mask:255.0.0.0          
```

### none

この場合は，新しくネットワークスタックはつくられず，ループバックの`lo`だけになる．

```bash
$ docker run --net=none ubuntu ifconfig
lo        Link encap:Local Loopback
            inet addr:127.0.0.1  Mask:255.0.0.0
```

### host

ホストネットワークモードでは，ホストのネットワークインターフェースがそのまま利用される．

```bash
$ ifconfig
docker0   Link encap:Ethernet  HWaddr 00:00:00:00:00:00
                  inet addr:172.17.42.1  Bcast:0.0.0.0  Mask:255.255.0.0

eth0      Link encap:Ethernet  HWaddr 08:00:27:88:0c:a6
               inet addr:10.0.2.15  Bcast:10.0.2.255  Mask:255.255.255.0

eth1      Link encap:Ethernet  HWaddr 08:00:27:1c:28:3b
               inet addr:192.168.50.4  Bcast:192.168.50.255  Mask:255.255.255.0
          
lo        Link encap:Local Loopback
               inet addr:127.0.0.1  Mask:255.0.0.0
```

```bash
$ docker run --net=host ubuntu ifconfig
docker0   Link encap:Ethernet  HWaddr 00:00:00:00:00:00
                  inet addr:172.17.42.1  Bcast:0.0.0.0  Mask:255.255.0.0
          
eth0      Link encap:Ethernet  HWaddr 08:00:27:88:0c:a6
               inet addr:10.0.2.15  Bcast:10.0.2.255  Mask:255.255.255.0

eth1      Link encap:Ethernet  HWaddr 08:00:27:1c:28:3b
               inet addr:192.168.50.4  Bcast:192.168.50.255  Mask:255.255.255.0

lo        Link encap:Local Loopback
            inet addr:127.0.0.1  Mask:255.0.0.0
```

## Host Networkingでできること（Apache）

簡単な例として[Apacheコンテナ](https://gist.github.com/tcnksm/4381bbe7e8258c1f9e8d)へのアクセスしてみる．

環境は以下のVagrantfile内で行った．

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "precise64"
  config.vm.box_url = "http://files.vagrantup.com/precise64.box"
  config.vm.network :private_network, ip: "192.168.50.4"
  config.vm.provision :docker do |d|
      d.pull_images "ubuntu"  
  end
end
```

以下のようなDockerfileを準備してビルドする．

```bash
FROM ubuntu:12.04

RUN apt-get update
RUN apt-get install -y apache2

ENV APACHE_RUN_USER www-data
ENV APACHE_RUN_GROUP www-data
ENV APACHE_LOG_DIR /var/log/apache2

RUN echo 'Hello, docker' > /var/www/index.html

ENTRYPOINT ["/usr/sbin/apache2"]
CMD ["-D", "FOREGROUND"]
```

```bash
$ docker build -t tcnksm/apache .
```

デフォルトのブリッジモードでコンテナを起動する場合は，仮想ブリッジ`docker0`内でExposeしたポートをホスト側のポートにマッピングして起動する必要がある．

```bash
$ docker run -d -p 80:80 tcnksm/apache
```

ホストネットワークモードで起動する場合は，コンテナ内でExposeしたポートは**そのまま**ホストのネットワークのポートとして利用される．

```bash
$ docker run -d --net=host tcnksm/apache
```

別のホストからアクセスしてみる．

```bash
$ curl 192.168.50.4
Hello, docker
```

## Host Networkingでできること（Serf）

Host Networkingを使うと複数ホスト間の連携が簡単になりそう．すぐ思いついたのはSerfだったので，複数ホストでSerfコンテナのクラスタを組んでみる．

まず，複数ホスト（`n1`と`n2`）を立ち上げる`Vagrantfile`を準備する．それぞれ，Docker provisionだけ走らせる．

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "precise64"
  config.vm.box_url = "http://files.vagrantup.com/precise64.box"

  config.vm.provision :docker do |d|
      d.pull_images "ubuntu"
  end

  config.vm.define "n1" do |n1|
      n1.vm.network "private_network", ip: "172.20.20.10"
  end

  config.vm.define "n2" do |n2|
      n2.vm.network "private_network", ip: "172.20.20.11"
  end
end
```

次に，SerfコンテナをつくるためのDockerfileを準備し，それぞれのホストでビルドしておく．

```bash
FROM ubuntu

RUN apt-get -y install unzip wget

RUN cd /tmp/
RUN wget --no-check-certificat https://dl.bintray.com/mitchellh/serf/0.5.0_linux_amd64.zip -O serf.zip

RUN unzip serf.zip
RUN chmod +x serf
RUN mv serf /usr/local/bin/serf

EXPOSE 7946
```

```bash
$ vagrant ssh n1
$ docker build -t tcnkms/serf .
```

```bash
$ vagrant ssh n2
$ docker build -t tcnkms/serf .
```

クラスタを形成してみる．まず，`n1`で`--net=host`を利用してSerfコンテナを起動する．

```bash
$ vagrant ssh n1
$ docker run -t --net=host tcnksm/serf serf agent -node=agent1 -bind 172.20.20.10
==> Starting Serf agent...
==> Starting Serf agent RPC...
==> Serf agent running!
         Node name: 'agent1'
         Bind addr: '172.20.20.10:7946'
         RPC addr: '127.0.0.1:7373'
         Encrypted: false
         Snapshot: false
         Profile: lan
```

次に`n2`から，`n1`に立てたSerfコンテナにjoinする．

```bash
$ vagrant ssh n2
$ docker run -t --net=host tcnksm/serf serf agent -node=agent2 -bind 172.20.20.11 -join 172.20.20.10
==> Starting Serf agent...
==> Starting Serf agent RPC...
==> Serf agent running!
         Node name: 'agent2'
         Bind addr: '172.20.20.11:7946'
         RPC addr: '127.0.0.1:7373'
         Encrypted: false
         Snapshot: false
         Profile: lan
         ==> Joining cluster...(replay: false)
         Join completed. Synced with 1 initial agents
         
==> Log data will now stream in as it occurs:

    2014/05/11 15:34:50 [INFO] agent: Serf agent starting
    2014/05/11 15:34:50 [INFO] serf: EventMemberJoin: agent2 172.20.20.11
    2014/05/11 15:34:50 [INFO] agent: joining: [172.20.20.10] replay: false
    2014/05/11 15:34:50 [INFO] serf: EventMemberJoin: agent1 172.20.20.10
    2014/05/11 15:34:50 [INFO] agent: joined: 1 Err: <nil>
    2014/05/11 15:34:51 [INFO] agent: Received event: member-join
```

joinできた．

ものすごく簡単にできた．SerfのようなサービスディスカバリーツールとHost networking機能を連携すると新たな道が開けそう．[Consul](http://www.consul.io/)も使ってみたいなあ．

### 参考

- [Serf虎の巻](http://deeeet.com/writing/2014/03/23/serf-basic/)
- [SerfでDockerコンテナのクラスタを形成する](http://deeeet.com/writing/2014/03/31/docker-serf/)
- [Docker+Serf+HAproxy (+Supervisor)](http://deeeet.com/writing/2014/04/08/docker-serf-haproxy/)


## 考慮するべきこと

Host Networking良さそうだけど考慮することがある．これは，Githubの[Issue](https://github.com/dotcloud/docker/issues/2012)でも上がっていたことだけど，コンテナが"Run anywhere"ではなくなる．例えば，8000ポートをExposeしたコンテナを立てようとして，ホストが既にそのポートを利用していた場合など．

コンテナがNATで隔離されるのはDockerの利点でもあるので，Dockerをどう使うかを考えた上で利用するべき機能だと思う．

### スポンサー

この記事は，[docker飲み](https://twitter.com/deeeet/status/464569434867507201)のおつり（500円）で書かれました．[@kenjiskywalkerさん](https://twitter.com/kenjiskywalker)，[@punytanさん](https://twitter.com/punytan)，[@repeatedlyさん](https://twitter.com/repeatedly)，[@sonotsさん](https://twitter.com/sonots)，ありがとうございました．また，参加させてください．





