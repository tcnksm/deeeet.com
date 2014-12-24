---

title: 'logspoutでDockerコンテナのログの集約・ルーティング'
date: 2014-05-14
comments: true
categories: docker
---

[progrium/logspout](https://github.com/progrium/logspout#streaming-endpoints)

logspoutは，ホスト内で動かした全てのDockerコンテナの出力を集約して，好きなところに飛ばす（ルーティングする）ためのツール．開発者はDokkの[Jeff Lindsay](https://github.com/progrium)．

以下の2つの特徴がある

- コンテナとして起動（ステートレス）
- HTTP APIによるルーティングの設定

ログを貯めて管理したり，検索するといったことはできない．コンテナのログをリアルタイムで好きなところに飛ばすだけ．

これだけだが，Dockerのログの問題をいい感じに解決してくれそう．

## Dockerのログのしくみ

まず，簡単にDockerのログのしくみを説明する．

現時点（2014年5月）でDockerはコンテナ内で吐き出されたstdout/stderrを取得することができる．コンテナのプロセスが`stdout`と`stderr`にログを吐き出し，Dockerはそれをホストに`json`として保存する．`docker log`コマンドを使うとそれを取得することができる．

これはシンプルだけど欠点でもある．いずれディスクが圧迫されるし，毎回`docker log`を叩くわけにもいかない．そのため，Dockerのログをどうするかってのはいろいろ試みられている．

## Dockerのログ収集の試み

Dockerコンテナのログ収集の試みは，大きく分けて3つある．

- **コンテナの内部で収集する**：コンテナ内でログ収集のプロセスを同時に走らせる（["dockerなら5分で動く！ nginxのログをfluentdで集めてnorikraでストリーム分析"](http://qiita.com/kazunori279/items/1bbb8fce10219217c247)，["How To Run Rsyslog in a Docker Container for Logging"](https://blog.logentries.com/2014/03/how-to-run-rsyslog-in-a-docker-container-for-logging/)）
- **コンテナの外部で収集する**：ホスト側でログ収集のエージェントを走らせて，コンテナのログの書き出し先をホストからマウントする，もしくは`json`を直接読む（["Docker Log Management Using Fluentd"](http://jasonwilder.com/blog/2014/03/17/docker-log-management-using-fluentd/)）
- **収集および配信用のコンテナを立てる**：[logstash-forwarder](https://github.com/elasticsearch/logstash-forwarder)のようなログの収集および配信を担うエージェントをコンテナ内に立てる．そして各コンテナが起動の際に`--volumes-from`でそのコンテナを指定する（["Docker And Logstash: Smarter Log management For Your Containers"](https://denibertovic.com/post/docker-and-logstash-smarter-log-management-for-your-containers/)）

やりようはいろいろあるが，少なくともDocker的に良いのは，

- コンテナに複数プロセスを立てない　
- ホストに多くを設定しない

これを満たすのは，3番目の専用のコンテナを立てる方式．ただ，現状の方法は立てるコンテナごとに`--volumes-from`を駆使しなといけないなど，少しめんどくさい．

## logsoutの良い点

専用のコンテナ（[progrium/logspout](https://index.docker.io/u/progrium/logspout/)）を立てるだけ使える．

つまり，現状動いている他のコンテナになんの設定もなしに使える．当然，ホスト側に特別な設定をする必要がない．

## logsoutを使う

まず，インストール（以下で`docker run`すればインストールもされるので実際は必要ない）

```bash
$ docker pull progrium/logspout
```

例として，"hello world"を出力し続ける単純なコンテナを立てておく．

```bash
$ docker run -d --name hello1 busybox /bin/sh -c "while true; do echo hello world; sleep 1; done"
$ docker run -d --name hello2 busybox /bin/sh -c "while true; do echo hello world; sleep 1; done"
```

これらに対してログを収集するには以下を実行する．

```bash
$ docker run -d -p 8000:8000 --name log -v=/var/run/docker.sock:/tmp/docker.sock progrium/logspout
```

HTTP APIのアクセスを可能にするため`8000`ポートを解放し，ホストの`/var/run/docker.sock`をマウントする．

ログを見てみる．

```bash
$ curl $(docker port log 8000)/logs
             log|[martini] Started GET /logs for 172.17.42.1:50859
             hello2|hello world
             hello1|hello world
             hello2|hello world
             hello1|hello world
             hello2|hello world
```

リアルタイムの出力が確認できる．出力は色づけもされている．

### ルーティング

一番単純な方法は，rsyslogに投げること．以下のように起動コマンドにURIを指定するだけ．

```bash
$ docker run -v=/var/run/docker.sock:/tmp/docker.sock progrium/logspout syslog://logs.papertrailapp.com:55555
```

以下のようにPOSTを使って，ルーティングの設定をすることもできる．

```bash
$ curl $(docker port log 8000)/logs -X POST \
    -d '{"source": {"filter": "db", "types": ["stderr"]}, target": {"type": "syslog", "addr": "logs.papertrailapp.com:55555"}}'
```

上の例では，名前が`db`であるコンテナの`stderr`への出力を`logs.papertrailapp.com:55555`に飛ばすように設定している．`addr`はDNSで名前解決さえできればいいので，[Consul](https://github.com/hashicorp/consul)などのサービスディスカバリを使えば，さらなる道を開けそう．

ルーティングは以下のようにGETでデバッグしつつ設定できる．

```bash
GET /logs
GET /logs/filter:<container-name-substring>
GET /logs/id:<container-id>
GET /logs/name:<container-name>
```

## CoreOSの場合

Dockerの運用に関しては[CoreOS](https://coreos.com/)に多くの知見がある．CoreOSのコンテナのログのルーティング方法について[@mopemopeさん](https://twitter.com/mopemope)に教えていただいた（参考：["CoreOS logging to remote destinations"](https://medium.com/coreos-linux-for-massive-server-deployments/defb984185c5)）．

CoreOSの場合は，上の分類でいうと**コンテナの外部で収集する**方式になる．そもそもCoreOSでは，systemdでコンテナを起動する想定になっている．そのため，ログのルーティングにはsystemd自前のjournalが使える．logspoutと同様のことをするには，以下のようにする．

```bash
$ journalctl -o short -f | ncat remote-destination.com 12345
```

どの方法が一番良いかはまだまだ一概には言えないが，コンテナをsystemdで起動することが前提になっていれば，余計な設定などもなく，シンプルだなと．

## まとめ

考慮する問題はいくつかある．

- 若干の遅れが生じる
- stdout/stderrだけしか取得できない（これはDockerの仕様）
- [ルーティング用のコンテナが落ちたときにログを保証できない](https://twitter.com/kenjiskywalker/status/466784403020992512)

まだ出たばかりなので，1つ目はすぐに解決しそう．2つ目の問題に関しては， 特別なログは`volume`やマウントを駆使してなんとかするしかない．3つ目に関して，このコンテナはログをルーティングするだけで，保存はできない．つまり，コンテナが落ちている間のログは失われ，再度送信することはできない．コンテナのヘルスチェックや障害対応などまだまだ考えることは多いように思える．
