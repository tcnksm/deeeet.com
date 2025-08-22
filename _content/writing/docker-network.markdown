---

title: 'Dockerのネットワークの基礎'
date: 2014-05-11
comments: true
categories: docker
---

今までいろいろ触ってきて，Dockerネットワーク周りに関しては何となくは理解していたが，人に説明できるほど理解してなかったのでまとめておく．基本は，[Advanced networking - Docker Documentation](http://docs.docker.io/use/networking)がベースになっている．

## 仮想ブリッジの仕組み

Dockerのネットワークは，仮想ブリッジ`docker0`を通じて管理され，他のネットワークとは隔離された環境で動作する．

Dockerデーモンを起動すると，

- 仮想ブリッジ`docker0`の作成
- ホストの既存ルートからの空きのIPアドレス空間を検索
- 空きから特定の範囲のIPアドレス空間を取得
- 取得したIPアドレス空間を`docker0`に割り当て

が行われる．

コンテナを起動すると，コンテナには以下が割り当てられる．

- `docker0`に紐づいた`veth`（Virtual Ethernet）インターフェース
- `docker0`に割り当てられたIPアドレス空間から専用のIPアドレス

そして`docker0`はコンテナのデフォルトのgatewayとして利用されるようになる．コンテナに付与される`veth`は仮想NICで，コンテナ側からは`eth0`として見える．2つはチューブのように接続され，あらゆるやりとりはここを経由して行われるようになる．


実際にコンテナを起動して確認する．まず，インターフェースから．

```bash
$ brctl show
bridge name     bridge id               STP enabled     interfaces
docker0         8000.000000000000       no
```

```bash
$ docker run -d ubuntu /bin/sh -c "while true; do echo hello world; sleep 1; done"
b9ffb0800ca5
```

```bash
$ docker run -d ubuntu /bin/sh -c "while true; do echo hello world; sleep 1; done"
4c0d9b786e8f
```

```bash
$ brctl show
bridge name     bridge id               STP enabled     interfaces
docker0         8000.7ab1e2001566       no              veth29c1, veth9eb7
```

`b9ffb0800ca5`コンテナには`veth29c1`が，`4c0d9b786e8f`コンテナには`veth9eb7`がそれぞれ割り当てられているのがわかる．


次にIPを見てみる．

```bash
$ ifconfig docker0
docker0   Link encap:Ethernet  HWaddr 7a:b1:e2:00:15:66
          inet addr:172.17.42.1  Bcast:0.0.0.0  Mask:255.255.0.0
```

```bash
$ docker inspect --format '{{ .NetworkSettings.IPAddress }}' b9ffb0800ca5
172.17.0.2
```

```bash
$ docker inspect --format '{{ .NetworkSettings.IPAddress }}' 4c0d9b786e8f
172.17.0.3
```

`docker0`に割り当てられた`172.17.42.1/16`のうち，`b9ffb0800ca5`コンテナには`172.17.02`が，`4c0d9b786e8f`コンテナには`172.17.0.3`がそれぞれ割り当てられているのがわかる．

## コンテナ同士のやりとり

コンテナ間のやりとりの制御は，Dockerデーモンの`-icc`パラメータにより行う．Dockerはこれに`iptables`を使っている．

- `-icc=true`とすると，コンテナ間のやりとりが可能になる（default）
- `-icc=false`とすると，コンテナ同士は隔離される


さらに，コンテナ同士でやりとりするにはportを`docker0`に晒す必要がある．これには，以下の2つの方法がある．

- Dockerfileに`EXPOSE <port>`を記述する
- コンテナ起動時に`--expose <port>`を指定する

具体的に，`docker0`を通じてコンテナ同士を接続する場合は，link機能を使う．コンテナを起動する際に，`--link コンテナ名:エイリアス名`とすると，環境変数を通じて接続したいコンテナのIPやPortを取得できるようになる（詳しくは，["Dockerコンテナ間のlink，database.ymlの書き方"](http://deeeet.com/writing/2014/03/20/docker-link-container/)に書いた）．

## 外部ネットワークからコンテナへのアクセス

外部ネットワークからコンテナにアクセスするには，コンテナを起動するときに外部ポートを`docker0`に晒した内部portにマップする必要がある．

例えば，ホストの8080ポートをコンテナの80ポートにマップして[Apacheコンテナ](https://gist.github.com/tcnksm/4381bbe7e8258c1f9e8d)を起動してみる．

```bash
$ ID=$(docker run -d -p 8080:80 tcnksm/apache)
caad0cfc2a0
```

マッピングは以下で確認できる．

```bash
$ docker ps
CONTAINER ID        IMAGE                  COMMAND                CREATED              STATUS              PORTS                  NAMES
caad0cfc2a03        tcnksm/apache:latest   /usr/sbin/apache2 -D   About a minute ago   Up About a minute   0.0.0.0:8080->80/tcp   elegant_thompson
```

IDと晒したportを基に確認することもできる．

```bash
$ docker port $ID 80
0.0.0.0:8080
```

実際に接続してみる．

```bash
$ curl http://localhost:8080
Hello, docker
```

ホスト側のIPの指定を省略することもできる．この場合，自動でポートが選ばれる．

```bash
$ ID=$(docker run -d -p 80 tcnksm/apache)
$ docker port $ID 80
0.0.0.0:49156
$ curl `docker port $ID 80`
Hello, docker
```

### 参考

- [Dockerのネットワーク管理とnetnsの関係 - めもめも](http://d.hatena.ne.jp/enakai00/20140424/1398321672)
- [Hack for Docker's Network](http://www.slideshare.net/hansode/hack-for-dockers-network)
- [Docker networking basics & coupling with Software Defined Networks](http://www.slideshare.net/adrienblind/docker-networking-basics-using-software-defined-networks)
