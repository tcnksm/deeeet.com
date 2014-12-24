---

title: 'CoreOSクラスタ内のDockerコンテナの動的リンク'
date: 2014-11-26
comments: true
categories: coreos
---

[Dynamic Docker links with an ambassador powered by etcd](https://coreos.com/blog/docker-dynamic-ambassador-powered-by-etcd/)

上記の記事を参考にCoreOSのクラスタ内で複数ホスト間にまたがりDockerコンテナを連携させる方法について検証した．

## 背景と問題

複数ホストにまたがりDockerのコンテナを接続する方法としては[Ambassador パターン](http://docs.docker.com/articles/ambassador_pattern_linking/)が有名である．これはトラフィックを別ホストへforwardすることに特化したコンテナを立てる方法で，ホストに無駄な設定なし，かつDockerコンテナのみで行えるシンプルな方法である．例えば，あるホストから`redis-cli`を使って，別ホストで動く`redis`に接続する場合は以下のように接続する．

```bash
(redis-cli) --> (ambassador) ---network---> (ambassador) --> (redis)
```

`redis-cli`コンテナと`ambassador`コンテナ，`redis`コンテナと`ambassador`コンテナはdockerのlink機能で接続し，`ambassador`コンテナはトラフィックをネットワーク越しにフォワードする．

この方法は，接続側がその相手先のホストを知っている必要がある．例えば上記の場合，`redis-cli`コンテナ側の`ambassador`コンテナは以下のように相手先のホストのIP（e.g., `192.168.1.52`）を指定して起動しなければならない．

```bash
$ docker run -d --name ambassador --expose 6379 -e REDIS_PORT_6379_TCP=tcp://192.168.1.52:6379 svendowideit/ambassador
```

ホストが固定されている場合は問題ないが，CoreOSのように動的にホストが変わる可能性がある場合は問題になる．接続先のホスト情報を直接既述すると，ホストが変わる度に設定を更新する必要があり，かなり億劫な感じになる．

## CoreOSにおける1つの解法

CoreOSはクラスタの形成に分散Key-Valueストアであるetcdを使っている．このetcdを使うと動的な`ambassador`パターンを作り上げることができる．つまり，以下のようなことをする．

- 接続される側は接続情報をetcdに書き込み続けるコンテナを立てる
- 接続する側はその情報を読み込み続ける動的な`ambassador`コンテナを立てる

あとは，この動的な`ambassador`コンテナとlink接続すれば，相手先の情報を環境変数として取得するとができる．これで接続する側は接続相手のホスト情報を知らなくてもよくなる．

## 検証ストーリー

これを実際にCoreOSクラスタを立てて検証してみる．

ここでは，Docker公式のドキュメント["Link via an Ambassador Container"](http://docs.docker.com/articles/ambassador_pattern_linking/)と同様の例を用いる．クラスタ内のあるホストより`redis-cli`コンテナを使って，別ホストの`redis`コンテナに接続するという状況を考える．

## CoreOSクラスタを立てる

利用するCoreOSクラスタは[tcnksm/vagrant-digitalocean-coreos](https://github.com/tcnksm/vagrant-digitalocean-coreos)を使って，VagrantでDigitalOcean上に立てる．

```bash
$ export NUM_INSTANCES=3
$ vagrant up --provider=digital_ocean
```

これで，DigitalOcean上に3つのCoreOSインスタンスが立ち上がる．

## 利用するコンテナ

全部で5つのコンテナを用いる．

![https://coreos.com/assets/images/media/etcd-ambassador-hosts.png](https://coreos.com/assets/images/media/etcd-ambassador-hosts.png)

[https://coreos.com/assets/images/media/etcd-ambassador-hosts.png](https://coreos.com/assets/images/media/etcd-ambassador-hosts.png)

HostA（`redis`を動かすホスト）では以下のコンテナを立てる．

- **crosbymichael/redis** - [Ambassador パターン](http://docs.docker.com/articles/ambassador_pattern_linking/)で使われているものと同様のRedisコンテナ
- **polvi/simple-amb** - `socat`コマンドを使って，特定のポートへのトラフィックを与えられたホストにforwardするだけのコンテナ．etcdへのフォーワードに利用する．
- **polvi/docker-register** - `docker port`コマンドを使って与えられたDockerコンテナのIPとPortを取得し，etcdにそれを登録するコンテナ

HostB（`redis-cli`を動かすホスト）では以下のコンテナを立てる．

-  **polvi/simple-amb** - HostAと同様のコンテナ．etcdへのフォーワードに利用する．
- **polvi/dynamic-etcd-amb** - etcdからRedisコンテナのホストとIPを取得し，環境変数にそれを設定するコンテナ
- **relateiq/redis-cli** - [Ambassador パターン](http://docs.docker.com/articles/ambassador_pattern_linking/)で使われているものと同様のコンテナ

## Unitファイル

CoreOSはコンテナの管理とスケジューリングにFleetを用い，その設定はUnitファイルで行う．上述したDockerコンテナを起動するためのUnitファイルについて簡単に説明する．なお，Fleetの詳しい使いかたなどは，["Fleetの使い方，Unitファイルの書き方"](http://deeeet.com/writing/2014/11/20/fleet/)に書いた．

### HostA

**crosbymichael/redis**を動かすための`redis.service`は以下．

```
[Unit]
Description=Run redis

[Service]
TimeoutStartSec=0
KillMode=none
EnvironmentFile=/etc/environment
ExecStartPre=-/usr/bin/docker kill %n
ExecStartPre=-/usr/bin/docker rm %n
ExecStartPre=/usr/bin/docker pull crosbymichael/redis
ExecStart=/usr/bin/docker run --rm --name %n -p $COREOS_PRIVATE_IPV46379 crosbymichael/redis
ExecStop=/usr/bin/docker stop -t 3 %n
```

単純に**crosbymichael/redis**コンテナを起動するだけ．**polvi/docker-register**コンテナを使って，ホストのIPとPortをetcdに登録する必要があるので，`-p ${COREOS_PRIVATE_IPV4}::6379`を指定して起動する．CoreOSはそのホスト情報を`/etc/environment`に保存しているので，それをそのまま使う．どのホストかを直接指定する必要はない．

`%n`はsystemdのUnitファイルの記法で，そのファイル名が代入される（今回の場合は，`redis.service`）．

**polvi/simple-amb**を動かすための`etcd-amb-redis.service`は以下．

```
[Unit]
Description=Forward all traffic it gets on port 10000 to 172.17.42.1:4001 (redis)

[Service]
TimeoutStartSec=0
KillMode=none
ExecStartPre=-/usr/bin/docker kill %n
ExecStartPre=-/usr/bin/docker rm %n
ExecStartPre=/usr/bin/docker pull polvi/simple-amb
ExecStart=/usr/bin/docker run --rm --name %n polvi/simple-amb 172.17.42.1:4001
ExecStop=/usr/bin/docker stop -t 3 %n

[X-Fleet]
X-ConditionMachineOf=redis.service
```

このコンテナは特定のポート（`10000`port）のトラフィックを与えられた引数のホストにforwardする．CoreOSのDockerコンテナからは`172.17.42.1:4001`でそのetcdにアクセスできる．引数にそれを与えることで`10000`portへのトラフィックはすべてetcdにforwardされるようになる．

`X-ConditionMachineOf`に`redis.service`を指定することで，このコンテナは，**crosbymichael/redis**コンテナと同じホストにスケジューリングされるようになる．

**polvi/docker-register**の`register-redis-etcd.service`は以下．

```
[Unit]
Description=Read the IP and port of redis.service from Docker API and publish it to etcd as service name of redis-A
After=redis.service
After=etcd-amb-redis.service
Require=etcd-amb-redis.service

[Service]
TimeoutStartSec=0
KillMode=none
ExecStartPre=-/usr/bin/docker kill %n
ExecStartPre=-/usr/bin/docker rm %n
ExecStartPre=/usr/bin/docker pull polvi/docker-register
ExecStart=/usr/bin/docker run --link etcd-amb-redis.service:etcd -v /var/run/docker.sock:/var/run/docker.sock --rm --name %n polvi/docker-register redis.service 6379 redis-A
ExecStop=/usr/bin/docker stop -t 3 %n

[X-Fleet]
X-ConditionMachineOf=redis.service
```

このコンテナは与えられたコンテナのホストにおけるIPとPortのマッピング情報を取得し，それをetcdに登録する．今回は**crosbymichael/redis**コンテナの`6379`portのホストにおけるIPとPortのマッピング情報を`redis-A`という名前でetcdに登録する．**polvi/docker-register**コンテナとlinkで接続することにより，環境変数で`etcd`の接続先を取得する．

`X-ConditionMachineOf`に`redis.service`を指定することで，このコンテナは**crosbymichael/redis**コンテナと同じホストにスケジューリングされるようになる．

### HostB

**polvi/simple-amb**を動かすための`etcd-amb-redis-cli.service`は以下．

```
[Unit]
Description=Forward all traffic it gets on port 10000 to 172.17.42.1:4001 (etcd)

[Service]
TimeoutStartSec=0
KillMode=none
ExecStartPre=-/usr/bin/docker kill %n
ExecStartPre=-/usr/bin/docker rm %n
ExecStartPre=/usr/bin/docker pull polvi/simple-amb
ExecStart=/usr/bin/docker run --rm --name %n polvi/simple-amb 172.17.42.1:4001
ExecStop=/usr/bin/docker stop -t 3 %n

[X-Fleet]
X-Conflicts=redis.service
```

内容はHostAの`etcd-amb-redis.service`と同様だが，スケジューリングの条件が異なる．`X-Conflicts`に`redis.service`を指定することで**crosbymichael/redis**コンテナとは異なるホストにスケジューリングされるようになる．

**polvi/dynamic-etcd-amb**の`redis-dyn-amb.service`は以下．

```
[Unit]
Description=Tells the proxy to expose port 6379 and point it to the service registered as redis-A in etcd.
After=etcd-amb-redis-cli.service
Require=etcd-amb-redis-cli.service
After=register-redis-etcd

[Service]
TimeoutStartSec=0
KillMode=none
ExecStartPre=-/usr/bin/docker kill %n
ExecStartPre=-/usr/bin/docker rm %n
ExecStartPre=/usr/bin/docker pull polvi/dynamic-etcd-amb
ExecStart=/usr/bin/docker run --link etcd-amb-redis-cli.service:etcd --rm --name %n -p 127.0.0.16379 polvi/dynamic-etcd-amb redis-A 6379
ExecStop=/usr/bin/docker stop -t 3 %n

[X-Fleet]
X-ConditionMachineOf=etcd-amb-redis-cli.service
```

このコンテナはetcdに保存されたホストへのプロキシとして動作する．`6379`portを解放し，そこへの接続を`redis-A`という名前でetcdに登録された**crosbymichael/redis**コンテナが動くIPとPortに向けるようにする．**polvi/docker-register**コンテナとlinkで接続することにより，環境変数で`etcd`の接続先を取得する．

**relateiq/redis-cli**コンテナは，このコンテナと接続することで，ネットワーク越しに**crosbymichael/redis**コンテナに接続する．

## 接続を試す

上述したUnitファイルで定義したサービスをCoreOSクラスタにデプロイし`redis`コンテナに接続してみる．

まず，サービスのデプロイする．`.service`ファイルがあるディレクトリで以下を実行する．

```bash
$ fleetctl start *.service
```

サービスの起動を確認する．Unitファイルで定義したように別々のホストでサービスが起動していることが確認できる．

```bash
$ fleetctl list-units
UNIT                            MACHINE                         ACTIVE  SUB
etcd-amb-redis-cli.service      7f0be3a3.../10.132.180.245      active  running
redis-dyn-amb.service           7f0be3a3.../10.132.180.245      active  running
etcd-amb-redis.service          dc324c84.../10.132.181.182      active  running
redis.service                   dc324c84.../10.132.181.182      active  running
register-redis-etcd.service     dc324c84.../10.132.181.182      active  running
```

`redis`コンテナに接続するには，`etcd-amb-redis-cli`コンテナが動いているホストに移動する必要がある．以下で移動できる．

```bash
$ fleetctl ssh etcd-amb-redis-cli
```

実際に接続してみる．

```bash
$ docker run -it --link redis-dyn-amb.service:redis relateiq/redis-cli
redis 172.17.0.3:6379> ping
PONG
```

etcdに保存された情報をみると，`redis.service`が動いているホストの情報が保存されているのが確認できる．

```bash
$ etcdctl get /services/redis-A/redis.service
{ "port": 49155, "host": "10.132.181.182" }
```

### 耐障害性

`redis`コンテナを再起動してもすぐに設定は更新され再接続できる．これは，`redis`コンテナが動くホスト情報のetcdへの動的な書き込み，読み込みにより実現できる．

また，`redis`コンテナが動くホストを，ホストごと殺しても再び接続できる．これは，fleetによるフェイルオーバー（再スケジューリング）とetcdの動的に書き込み・読み込みにより実現できる．

## まとめ

CoreOSのクラスタ内で複数ホスト間にまたがりDockerコンテナを連携させる方法について検証した．etcdに接続先のホストを保存することで，コンテナがどのホストで動いているかを意識しないでそれに接続することができた．



