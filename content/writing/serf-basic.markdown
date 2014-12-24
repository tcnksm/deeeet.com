---

title: 'Serf 虎の巻'
date: 2014-03-23
comments: true
categories: serf
---


サービスディスカバリーとオーケストレーション用のツールである[Serf](http://www.serfdom.io/)についてまとめた．基本的には公式のHPのGetting Startの抄訳．Vagrantで試験環境を立てて実際に触りつつSerfを使い始められるようにした．


<h2 id="m">目次</h2>

- [Serfとは](#ov)
- [Gossip protocolとは](#g)
- [試験環境の準備](#pre)
- [クラスタの形成](#jcluster)
- [クラスタからの離脱](#lcluster)
- [イベントハンドラ](#eh)
- [カスタムイベント](#ce)
- [カスタムクエリ](#q)
- [コマンド一覧](#com)
- [参考](#ref)

<h2 id="#ov">Serfとは</h2>

Serfはサービスディスカバリーやオーケストレーション，障害検出のためのツール．Vagrantの開発者であるMitchell Hashimoto氏により開発が進められている．Serfは[Immutable Infrastructure](http://www.publickey1.jp/blog/14/immutable_infrastructure.html)の文脈で登場してきたツールであり，Immutableなシステムアーキテクチャー，デプロイを実現する上で必須のツールである．

Immutable Infrastructureを簡単に説明すると，上書き的にサーバーを更新するのではなく，デプロイの度に１からにサーバ，イメージを構築してしまおうという考え方．現段階では，ChefやPuppet，AnsibleのようなConfiguration toolでソフトウェア，サービスの設定を行いイメージを作成し，テストが完了した段階でロードバランサを切り替えるというワークフローが提唱されている（[Blue Green Deployment](http://www.publickey1.jp/blog/14/blue-green_deployment.html)）．もしくは，Dockerなどのコンテナベースであれば，そのポータビリティにより，ローカルでコンテナをつくって，それをそのままプロダクションデプロイする方法も考えられる．

このとき問題になるのは，ロードバランサへの追加や，Memcacheのクラスタ，MySQLのslave/masterなどの動的に変わるような設定．もちろんChefやPuppetがこれらの設定まで受け持つことは可能であるが，Immutableなデプロイを実現する上では複雑性が増す．

これを解決するのがSerf．ChefやPuppetで不変なサーバ，イメージが完成したあとに，それらのサーバ，イメージ間の紐付けやクラスタリングを行う．

### Serfができること

Serfは，大きく以下の3つのことを行うことができる．

- **クラスタリング**: Serfはクラスタを形成し，クラスタへメンバーの参加，離脱といったイベントを検出して，メンバーそれぞれにあらかじめ設定したスクリプトを実行させることができる．例えば，SerfはロードバランサのためのWebサーバのリストをもち，ノードの増減の度にロードバランサにそれを通知することができる．
- **障害の検出と回復**: Serfはクラスタのメンバーが障害で落ちた場合にそれを検出し，残りのメンバーにそれを通知することができる．また，障害によりダウンしたメンバーを再びクラスタに参加させるように働く．
- **イベントの伝搬**: Serfはメンバーの参加，離脱といったイベント以外にオリジナルのカスタムイベントをメンバーに伝搬させることができる．これらは，デプロイやConfigurationのトリガーなどに使うことができる．

### Serfの利用例

具体的なSerfの利用例には以下のようなものがある．

- Webサーバのロードバランサへの登録，解除
- RedisやMemcachedのクラスタリング
- DNSの更新
- デプロイのトリガー（[カスタムイベント](#ce)）
- シンプルなサービス監視（[カスタムクエリ](#q)）

詳細は，公式の[Use Cases](http://www.serfdom.io/intro/use-cases.html)を参照．

<a href="#m">目次へ</a>

<h2 id="g">Gossip Protocolとは</h2>

Serfはクラスタのメンバーへのイベントの伝搬に[Gossip Protocol](http://en.wikipedia.org/wiki/Gossip_protocol)を用いている．Gossip Protocolは["SWIM: Scalable Weakly-consistent Infection-style Process Group Membership Protocol"](http://www.cs.cornell.edu/~asdas/research/dsn02-swim.pdf)を基にしており，SWIMのイベントの伝搬速度とカバレッジに改良を加えている．

### SWIM Protocolの概要

Serfは新しいクラスタの形成，既存のクラスタへ参入，のどちらかで起動する．新しいクラスタが形成されると，そこには新しいノードが参入してくることが期待される．既存のクラスタに参入するには，既存クラスタのメンバーのIPアドレスが必要になる．新しいメンバーはTCPで既存クラスタのメンバーと状態が同期され，Gossiping（噂，情報のやりとり）が始まる．

GossipingはUDPで通信される．これにより，ネットワークの容量はノードの数に比例して一定になる．Gossipingよりも頻度は低いが，定期的にTCPによるランダムなノード間で完全な状態同期が行われる．

障害検出は，定期的にランダムなノードをチェックすることにより行われる．もし一定期間あるノードから反応がない場合は，直接そのノードに対してチェックが行われる．ネットワーク上問題でノードからの反応が得られていない可能性を考慮して，この直接のチェックは複数のノードから行われる．ランダムなチェックおよび，直接のチェックでも反応がない場合，そのノードは，_suspicious_と認定される．_suspicious_であってもそのノードはクラスタの一員として扱われる．それでも反応が慣れれば，そのノードは落ちたと認定され，それは他のノードにGossipされる．

### GossipのSWIMからの改良点

Gossip ProtocolのSWIMからの変更点は大きく以下の3点

- SerfはTCPで全状態の同期を行うが，SWIMは変更をGossipすることしかしない．最終的には，どちらも一貫性を持つが，Serfは状態の収束が速い．
- SerfはGossipingのみを行うレイヤーと障害検出を行うプロトコルを分離しているが，SWIMは，障害検出にGossipingが上乗りしている．Serfは上乗りもしている．これによりSerfはより速いGossipingを可能にする．
- Serfは落ちたノードを一定期間保持するため，全状態の同期の際にそれも伝搬される．SWIMはTCPによる状態の同期を行わない．これにより障害からの復帰が速くなる．

<a href="#m">目次へ</a>

<h2 id="pre">試験環境の準備</h2>

[serf/demo/vagrant-cluster](https://github.com/hashicorp/serf/tree/master/demo/vagrant-cluster)のVagrantfileを改良して，Serfがプレインストールされたノードが3つ立ち上がった試験環境を作る．ノードのIPはそれぞれ"172.20.20.10"，"172.20.20.11"，"172.20.20.12"とし，同一ネットワーク上に存在する．Vagrantfileは以下．

```ruby
$script = <<SCRIPT

echo Installing depedencies...
sudo apt-get install -y unzip

echo Fetching Serf...
cd /tmp/
wget https://dl.bintray.com/mitchellh/serf/0.5.0_linux_amd64.zip -O serf.zip

echo Installing Serf...
unzip serf.zip
sudo chmod +x serf
sudo mv serf /usr/bin/serf

SCRIPT

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "precise64"
    config.vm.box_url = "http://files.vagrantup.com/precise64.box"

  config.vm.provision "shell", inline: $script

  config.vm.define "n1" do |n1|
      n1.vm.network "private_network", ip: "172.20.20.10"
  end

  config.vm.define "n2" do |n2|
      n2.vm.network "private_network", ip: "172.20.20.11"
  end

  config.vm.define "n3" do |n3|
      n3.vm.network "private_network", ip: "172.20.20.12"
  end
end  
```

立ち上げる．

```bash
$ vagrant up
$ vagrant status
Current machine states:

n1                        running (virtualbox)
n2                        running (virtualbox)
n3                        running (virtualbox)
```

<a href="#m">目次へ</a>

<h2 id="jcluster">クラスタの形成</h2>

シンプルなクラスタを形成してみる．

### エージェントの起動

まず，`n1`で最初のエージェント（`agent1`）を起動する．同一ネットワーク上で発見されるように，bindアドレスにはprivate networkのIPを指定する．

```bash
$ vagrant ssh n1
vagrant@n1:$ serf agent -node=agent1 -bind=172.20.20.10
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

次に，別のウィンドウを立ち上げて`n2`で新たなエージェント（`agent2`）を起動する．

```bash
$ vagrant ssh n2
vagrant@n2:$ serf agent -node=agent2 -bind=172.20.20.11
==> Starting Serf agent...
==> Starting Serf agent RPC...
==> Serf agent running!
         Node name: 'agent2'
         Bind addr: '172.20.20.11:7946'
         RPC addr: '127.0.0.1:7373'
         Encrypted: false
         Snapshot: false
         Profile: lan
```

この時点で，2つのホストで2つのserfエージェントが起動してる．しかし，2つのエージェントは互いについては何も知らない．それぞれが自分自身のクラスタを形成している．`serf member`を実行するとそれを確認できる．


```bash
vagrant@n1:$ serf members
agent1  172.20.20.10:7946  alive
```

```bash
vagrant@n2:$ serf members
agent2  172.20.20.11:7946  alive
```

### クラスタへのJoin

クラスタにjoinしてみる．`agent2`を`agent1`にjoinさせる．

```bash
vagrant@n2$ serf join 172.20.20.10
Successfully joined cluster by contacting 1 nodes.
```

それぞれのエージェントのログをみると，メンバーのjoin情報（`EventMemberJoin`）を互いに受け取っていることが確認できる．

```bash
# agent1
2014/03/23 13:45:18 [INFO] serf: EventMemberJoin: agent2 172.20.20.11
```

```bash
# agent2
2014/03/23 13:45:18 [INFO] agent: joining: [172.20.20.10] replay: false
2014/03/23 13:45:18 [INFO] serf: EventMemberJoin: agent1 172.20.20.10
2014/03/23 13:45:18 [INFO] agent: joined: 1 Err: <nil>
```

それぞれのエージェントで`serf member`を実行すると，それぞれのエージェントが互いのことを認識していることが確認できる．


```bash
vagrant@n1:$ serf members
agent1  172.20.20.10:7946  alive
agent2  172.20.20.11:7946  alive
```

```bash
vagrant@n2:$ serf members
agent2  172.20.20.11:7946  alive
agent1  172.20.20.10:7946  alive
```

さらに別のウィンドウを立ち上げて`n3`で新たなエージェント（`agent3`）を起動し，同時に`agent1`と`agent2`で形成するクラスタにjoinする．起動と同時にクラスタにjoinするには，`-join`オプションを使う．ここでは，`agent2`のbindアドレスを指定してjoinしてみる．

```bash
$ vagrant ssh n3
vagrant@precise64:~$ serf agent -node=agent3 -bind=172.20.20.12 -join=172.20.20.11
==> Starting Serf agent...
==> Starting Serf agent RPC...
==> Serf agent running!
         Node name: 'agent3'
         Bind addr: '172.20.20.12:7946'
         RPC addr: '127.0.0.1:7373'
         Encrypted: false
         Snapshot: false
         Profile: lan
==> Joining cluster...(replay: false)
Join completed. Synced with 1 initial agents
```

それぞれのエージェントのログをみると，エージェントのjoinの情報がやり取りされているのがわかる．`agent1`と`agent2`は`agent3`のjoin情報を，新しくクラスタにjoinしたばかりの`agent3`は`agent1`と`agent2`のjoin情報を受け取っている．

```bash
# agent1
2014/03/23 14:15:09 [INFO] serf: EventMemberJoin: agent3 172.20.20.12
```

```bash
# agent2
2014/03/23 14:15:08 [INFO] serf: EventMemberJoin: agent3 172.20.20.12
```

```bash
# agent3
2014/03/23 14:15:08 [INFO] agent: joining: [172.20.20.11] replay: false
2014/03/23 14:15:08 [INFO] serf: EventMemberJoin: agent1 172.20.20.10
2014/03/23 14:15:08 [INFO] serf: EventMemberJoin: agent2 172.20.20.11
```

それぞれのエージェントでserf memberを実行すると，`agent3`が新たなメンバーとして追加されていることが確認できる．

```bash
vagrant@n1:$ serf members
agent1  172.20.20.10:7946  alive
agent2  172.20.20.11:7946  alive
agent3  172.20.20.12:7946  alive
```

```bash
vagrant@n2:$ serf members
agent2  172.20.20.11:7946  alive
agent1  172.20.20.10:7946  alive
agent3  172.20.20.12:7946  alive
```

```bash
vagrant@n3:$ serf members
agent3  172.20.20.12:7946  alive
agent1  172.20.20.10:7946  alive
agent2  172.20.20.11:7946  alive
```

<a href="#m">目次へ</a>

<h2 id="lcluster">クラスタからの離脱</h2>

クラスタから抜けてみる．エージェントを停止するだけ．停止方法は，エージェントの起動画面で`Ctrl-C`（interrupt signalを送る）するか，エージェントのプロセスをkill（terminated）するだけ．

二つの停止方法で，serfの挙動は異なる．

- 正常終了．`Ctrl-C`（interrupt）による停止．Serfは他のクラスタのメンバーにその停止エージェントの_left_を通知し，以後そのノードに対して通信はしない．
- 異常終了．プロセスをkill（terminated）して停止．クラスタの他のメンバーはそのノードが_failed_したと検知する．そしてSerfは再びそのノードに接続しよう通信を継続する．

### 正常終了

まず，`agent3`を`Ctrl-C`で停止してみる．

```bash
==> Caught signal: interrupt
==> Gracefully shutting down agent...
    2014/03/23 14:42:07 [INFO] agent: requesting graceful leave from Serf
    2014/03/23 14:42:08 [INFO] serf: EventMemberLeave: agent3 172.20.20.12
    2014/03/23 14:42:08 [INFO] agent: requesting serf shutdown
    2014/03/23 14:42:08 [INFO] agent: shutdown complete
```

他のメンバーに対して，クラスタのleaveを通知してからエージェントを停止している．また，残ったエージェントのログをみると，メンバーのleave情報（`EventMemberLeave`）を受け取っていることが確認できる．


```bash
# agent1
2014/03/23 14:42:08 [INFO] serf: EventMemberLeave: agent3 172.20.20.12
```

```bash
# agent2
2014/03/23 14:42:08 [INFO] serf: EventMemberLeave: agent3 172.20.20.12
```

それぞれのエージェントでserf memberを実行すると，`agent3`が_left_したことが確認できる．


```bash
vagrant@n1:$ serf members
agent1  172.20.20.10:7946  alive
agent2  172.20.20.11:7946  alive
agent3  172.20.20.12:7946  left
```

```bash
vagrant@n2:$ serf members
agent2  172.20.20.11:7946  alive
agent1  172.20.20.10:7946  alive
agent3  172.20.20.12:7946  left
```

### 異常終了

次に，`agent2`をプロセスのkillで停止してみる．

```bash
==> Caught signal: terminated
    2014/03/23 14:58:11 [INFO] agent: requesting serf shutdown
    2014/03/23 14:58:11 [WARN] Shutdown without a Leave
    2014/03/23 14:58:11 [INFO] agent: shutdown complete
```

`agent3`の場合とは異なり，leave通知なしで停止している．残った`agent1`のログをみると，メンバーの_failed_を検知し，再接続しようとしているのが確認できる．

```bash
# agent1
2014/03/23 14:58:19 [INFO] serf: EventMemberFailed: agent2 172.20.20.11
2014/03/23 14:58:20 [INFO] agent: Received event: member-failed
2014/03/23 14:58:36 [INFO] serf: attempting reconnect to agent2 172.20.20.11
2014/03/23 14:59:06 [INFO] serf: attempting reconnect to agent2 172.20.20.11
2014/03/23 14:59:36 [INFO] serf: attempting reconnect to agent2 172.20.20.11
```

`serf members`を実行すると，`agent2`が_failed_となっていることが確認できる．

```bash
vagrant@n1:$ serf members
agent1  172.20.20.10:7946  alive
agent2  172.20.20.11:7946  failed
agent3  172.20.20.12:7946  left
```

Serfは_failed_ノードを再接続しようとし続けるので，再び`n2`で`agent2`を起動すると，joinすることなく自動でクラスタにjoinされる．

```bash
vagrant@n2:$ serf agent -node=agent2 -bind=172.20.20.11
...
2014/03/23 15:05:36 [INFO] serf: EventMemberJoin: agent1 172.20.20.10
```

<a href="#m">目次へ</a>

<h2 id="eh">イベントハンドラ</h2>

Serfのエージェントの起動方法，クラスタへの参入/離脱方法はわかった．Serfが強力なのは，メンバーのjoinやその他のイベントに反応できるところ．特定のイベントに対して，オリジナルのスクリプトを実行することができる．

以下のような，単純なrubyスクリプトによるイベントハンドラ（`handler.rb`）を作る．

```ruby
#handler.rb

puts
puts "New event: #{ENV["SERF_EVENT"]}. "

while str = STDIN.gets
    puts str
end
```

このイベントハンドラは，単純に`SERF_EVENT`という環境変数に格納されたイベント名を出力する．Serfのイベントのデータは常に標準入力からくる，ので`STDIN`によりこれを取得する．

### イベントハンドラの登録

では，実際にこのイベントハンドラを動かしてみる．エージェントを起動する際に，`-event-handler`で上記のスクリプトを指定するだけ．イベントハンドラの出力はDEBUGモードの時に出力されるので，ログレベルをDEBUGにしておく．

```bash
$ serf agent -node=agent1 -log-level=debug -event-handler='ruby handler.rb'
==> Starting Serf agent...
==> Starting Serf agent RPC...
==> Serf agent running!
         Node name: 'agent1'
         Bind addr: '0.0.0.0:7946'
         RPC addr: '127.0.0.1:7373'
         Encrypted: false
         Snapshot: false
         Profile: lan

==> Log data will now stream in as it occurs:

    2014/03/25 16:43:00 [INFO] agent: Serf agent starting
    2014/03/25 16:43:00 [INFO] serf: EventMemberJoin: agent1 10.0.2.15
    2014/03/25 16:43:01 [INFO] agent: Received event: member-join
    2014/03/25 16:43:01 [DEBUG] agent: Event 'member-join' script output:
    New event: member-join.
    agent1  10.0.2.15
```

ログの最終行をみると，イベントに対して，スクリプトを実行しているのがわかる．今回の`
SERF_EVENT`は`member-join`で，それを出力している．


### イベントハンドラの種類

Serfが発行するイベントは以下．

- `member-join` メンバーのjoin
- `member-leave` メンバーの離脱（`Ctrl+c`による離脱，正常終了の場合） 
- `member-failed` メンバーのダウン，Failed（異常終了の場合）
- `member-update` メンバーのアップデート
- `member-reap` メンバーの解除（_failed_メンバーへの再接続のタイムアウト）
- `user` [カスタムイベント](#ce)の発行
- `query` [カスタムクエリ](#q)の発行

### 環境変数

イベントハンドラが実行されると，Serfは以下のような環境変数を設定する．

- `SERF_EVENT` 発生したイベント名
- `SERF_SELF_NAME` イベントを発行したノード名
- `SERF_SELF_ROLE` イベントを発行したノードのrole名
- `SERF_TAG_${TAG}` エージェントが持つタグ名
- `SERF_USER_EVENT` [カスタムイベント](#ce)名
- `SERF_USER_LTIME` [カスタムイベント](#ce)の`LamportTime`
- `SERF_QUERY_NAME` [カスタムクエリ](#q)名
- `SERF_QUERY_LTIME` [カスタムクエリ](#q)の`LamportTime`

`LamportTime`は[Lamport timestamps](http://en.wikipedia.org/wiki/Lamport_timestamps)を参照．

### 特定のイベントに対するイベントハンドラの登録

特定のイベントに対して，イベントハンドラを登録することもできる．

`member-leave`のときのみ，`handler.rb`を実行したい場合は，

```bash
$ serf agent -node=agent1 -log-level=debug -event-handler member-leave='ruby handler.rb'
```

`memver-join`と`member-leave`のときのみ，`handler.rb`を実行した場合は，

```bash
$ serf agent -node=agent1 -log-level=debug -event-handler member-join,member-leave='ruby handler.rb'
```

<a href="#m">目次へ</a>

<h2 id="ce">カスタムイベント</h2>

joinやleave等の標準のイベントに加えて，ユーザ独自のイベントをクラスタ内に伝搬させることもできる．このイベントには，基になるノードもないし，反応も期待しない．また，全てのノードに伝搬したか保証できない．カスタムイベントは，デプロイのトリガー，クラスタの再起動などに使われる．

### カスタムイベントの発行

あらかじめエージェントを起動しておく．例として，二つのホスト（`n1`と`n2`）で`agent1`と`agent2`を起動し，クラスタを形成する．

```bash
$ vagrant ssh n1
vagrant@n1:$ serf agent -node=agent1 -bind=172.20.20.10
```

```bash
$ vagrant ssh n2
vagrant@n2:$ serf agent -node=agent2 -bind=172.20.20.11 -join=172.20.20.10
```

```bash
$ serf members
agent1  172.20.20.10:7946  alive
agent2  172.20.20.11:7946  alive
```

カスタムイベントを発行するには，`serf event`コマンドを実行する．`hello`というイベントを発行する．

```bash
$ vagrant ssh n2
vagrant@n2:$ vagrant event hello
```

それぞれのエージェントのログをみると，`hello`イベントを受け取っていることがわかる

```bash
#agent1
2014/03/26 14:10:38 [INFO] agent: Received event: user-event: hello
```

```bash
#agent2
2014/03/26 14:10:38 [INFO] agent: Received event: user-event: hello
```

### カスタムイベントに対するイベントハンドラ

標準のイベントと同様に，イベントハンドラはこのカスタムイベントに反応することができる．

すべてのカスタムイベントに対して，`handler.rb`を実行したい場合，

```bash
$ serf agent -log-level=debug -event-handler user="ruby handler.rb"
```

特定のカスタムイベントに対するイベントハンドラは，`user:イベント名`で登録する．例えば，上の`hello`カスタムイベントに対して，`handler.rb`を実行したい場合，

```bash
$ serf agent -log-level=debug -event-handler user:hello="ruby handler.rb"
```

### イベントペイロード

イベント名を伝搬するだけではなく，イベント名に紐づく任意のデータ（ペイロード）を同時に伝搬させることができる．

例えば，`name`というイベント名で，`deeeet`を伝搬させるには以下のようにする．

```bash
$ serf event name deeeet
```

データは，標準入力として入力されるので，イベントハンドラ内で利用できる．

SerfのゴシッププロトコルはUDPを使っているので，理論的には，最大積載量は1KB未満であり，Serfはさらにそれを制限している．

<a href="#m">目次へ</a>

<h2 id="q">カスタムクエリ</h2>

[カスタムイベント](#ce)は，イベントを伝搬させるだけだが，カスタムクエリは各ノードにレスポンスを要求する．カスタムクエリは，イベントよりも柔軟で，伝搬させるべきノードをフィルタリングして，さらに好きなレスポンスを返させることができる．カスタムクエリは，ノードの情報種集などに利用される．

### カスタムクエリの発行

あらかじめエージェントを起動しておく．例として，二つのホスト（`n1`と`n2`）で`agent1`と`agent2`を起動し，クラスタを形成する．

```bash
$ vagrant ssh n1
vagrant@n1:$ serf agent -node=agent1 -bind=172.20.20.10
```

```bash
$ vagrant ssh n2
vagrant@n2:$ serf agent -node=agent2 -bind=172.20.20.11 -join=172.20.20.10
```

```bash
$ serf members
agent1  172.20.20.10:7946  alive
agent2  172.20.20.11:7946  alive
```

カスタムクエリを発行するには，`serf query`コマンドを実行する．`uptime`というクエリを発行する．

```bash
$ serf query uptime
Query 'uptime' dispatched
Ack from 'agent2'
Ack from 'agent1'
Total Acks: 2
Total Responses: 0
```

カスタムイベントとはことなり，各ノードからレスポンスが返ってきている．それぞれのエージェントのログをみると，`uptime`クエリを受け取っていることがわかる．

```bash
# agent1
2014/03/26 15:18:32 [INFO] agent: Received event: query: uptime
```

```bash
# agent2
2014/03/26 15:18:32 [INFO] agent: Received event: query: uptime
```

### カスタムクエリに対するイベントハンドラ

カスタムクエリが強力なのは，イベントハンドラの出力結果をレスポンスとして返させることができること．

特定のクエリに対するイベントハンドラは，`query:クエリ名`で登録する．例えば，上の`uptime`カスタムクエリに対して，`uptime`を実行したい場合は，以下のようにする．

```bash
$ serf agent -node=agent1 -bind=172.20.20.10 -event-handler query:uptime=uptime
```

この状態で，`uptime`クエリを実行すると，

```bash
$ serf query uptime
Query 'uptime' dispatched
Ack from 'agent1'
Response from 'agent1':  15:29:29 up 2 days,  6:27,  2 users,  load average: 0.13, 0.25, 0.30
Total Acks: 1
Total Responses: 1
```

`agent1`から`uptime`の実行結果が返ってきているのがわかる．

### クエリペイロード

クエリ名を伝搬するだけではなく，クエリ名に紐づく任意のデータ（ペイロード）を同時に伝搬させることができる．

例えば，nameというクエリ名で，deeeetを伝搬させるには以下のようにする．

```bash
$ serf query name deeeet
```

データは，標準入力として入力されるので，イベントハンドラ内で利用できる．

SerfのゴシッププロトコルはUDPを使っているので，理論的には，最大積載量は1KB未満であり，Serfはさらにそれを制限している．

### 伝搬させるノードの制限

クエリを伝搬させるべきノードを制限することができる．例えば`agent1`のみに伝搬させたい場合は，

```bash
$ serf query -node agent1 uptime
```

### カスタムクエリの応用例

イベントハンドラにシェルを指定し，クエリペイロードを用いると，任意のコマンドを発行し，その結果を受け取ることができる．

```bash
$ serf agent -node=agent1 -bind=172.20.20.10 -event-handler query:sh='/bin/bash'
```

```bash
$ serf query sh 'service nginx reload'
```

["Serf という Orchestration ツール #immutableinfra"](http://www.slideshare.net/sonots/serf-iiconf-20140325)を参考．

<a href="#m">目次へ</a>

<h2 id="com">コマンド一覧</h2>

v0.5.0現在で利用可能なコマンド一覧．

メンバーシップ関連

- `serf agent` エージェントを起動する
- `serf join` クラスタに参入する
- `serf leave` クラスタから離脱する
- `serf force-leave` メンバーを離脱させる
- `serf memers` クラスタのメンバーを確認する

カスタムメッセージ関連

- `serf event` カスタムイベントを配信する
- `serf query` カスタムクエリを配信する

デバッグ関連

- `serf monitor` 起動しているエージェントの接続して，そのログを確認する
- `serf reachability` ネットワークの接続確認をする

その他

- `serf keygen` [暗号通信](http://www.serfdom.io/docs/agent/encryption.html)を行うための暗号キーを生成する
- `serf tag` クラスタのメンバーのタグを変更する


<a href="#m">目次へ</a>

<h2 id="ref">参考</h2>

- [インフラ系技術の流れ](http://mizzy.org/blog/2013/10/29/1/)
- [Serf+HAProxyで作るAutomatic Load Balancer](http://blog.glidenote.com/blog/2013/10/30/serf-haproxy/)
- [Serf を使ってみた](http://jedipunkz.github.io/blog/2013/11/10/serf/)
- [RaspberryPi起動・停止時にSerfで画面に通知する方法](http://pocketstudio.jp/log3/2013/11/12/raspberrypi-notify-with-serf/)
- ["Serf という Orchestration ツール #immutableinfra"](http://www.slideshare.net/sonots/serf-iiconf-20140325)



