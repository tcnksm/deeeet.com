---

title: 'CoreOSに入門した'
date: 2014-11-17
comments: true
categories: coreos
cover_image: coreos.png
---

[CoreOS is Linux for Massive Server Deployments · CoreOS](https://coreos.com/)

[CoreOS + Docker Meetup Tokyo #1](http://www.meetup.com/Docker-Tokyo/events/218561812/)に参加してCoreOSにめっちゃ感動したので，CoreOSに入門していろいろ触ってみた．

まず，CoreOSの概要とそれを支える技術について説明する．次に実際にDigitalOcenan上にVagrantを使って実際にCoreOSクラスタを立てて，CoreOSで遊ぶ方法について書く．

## CoreOSとは何か

[CoreOS](https://coreos.com/)は，GoogleやFacebook，Twitterといった企業が実現している柔軟かつスケーラブル，耐障害性の高いインフラの構築を目的としたLinuxディストリビューションである．軽量かつ使い捨てを前提にしており，クラウドなアーキテクチャのベストプラクティスを取り入れている．CoreOSの特徴は大きく4つ挙げられる．

- ミニマルなデザイン
- 容易かつ安全なOSアップデート
- Dockerコンテナによるアプリケーションの起動
- クラスタリング

CoreOSはとてもミニマルである．従来のLinuxディストリビューションが機能を追加することでその価値を高めていったのに対して，CoreOSは必要最低限まで機能を削ぎ落としていることに価値がある（["CoreOS の調査：足し算から引き算へと，Linux ディストリビューションを再編する"](http://agilecatcloud.com/2014/11/17/coreos-%E3%81%AE%E8%AA%BF%E6%9F%BB%EF%BC%9A%E8%B6%B3%E3%81%97%E7%AE%97%E3%81%8B%E3%82%89%E5%BC%95%E3%81%8D%E7%AE%97%E3%81%B8%E3%81%A8%E3%80%81linux-%E3%83%87%E3%82%A3%E3%82%B9%E3%83%88%E3%83%AA/)）．

CoreOSは安全かつ容易なOSアップデート機構を持っている．これには[Omaha](https://code.google.com/p/omaha/)というChromeOSやChromeの更新に利用されているUpdate Engineを使っており，RootFSを丸ごと入れ替えることでアップデートを行う．これによりShellShockのような脆弱性が発見されても，いちいちパッチを当てるといったことやらずに済む．

CoreOSは専用のパッケージマネージャーをもたない．またRubyやPythonといった言語のRuntimeも持たない．全てのアプリケーションをDockerコンテナとして動作させる．これによりプロセスの隔離と，安全なマシンリソースの共有，アプリケーションのポータビリティという恩恵を受けることができる．

CoreOSはクラスタリングの機構を標準で持っている．クラスタリングについては，先週来日していたCoreOSのKelsey氏は"Datacenter as a Computer"という言葉を使っていた．データセンターの大量のサーバー群からクラスタを構築してまるでそれが1つのコンピュータとして扱えるようにすることをゴールとしているといった説明をしていた．

CoreOSはクラウドネイティブなOSである．Amazon EC2，DigitalOcean，Rackspace，OpenStack，QEMU/KVMといったあらゆるプラットフォームが対応を始めている．1つのクラスタを異なる2つのクラウドサーバにまたがって構築することもできるし，クラウドと自社のベアメタルサーバーを使って構築することもできる．

CoreOSの特徴については，[@mopemope](https://twitter.com/mopemope)さんの ["CoreOS入門 - Qiita"](http://qiita.com/mopemope/items/fa9424b094aae3eac580)や，[@yungsang](https://twitter.com/yungsang)さんの["CoreOS とその関連技術に関するここ半年間の私の活動まとめ"](https://gist.github.com/YungSang/73148282c1a081adb2ba)が詳しい．

## CoreOSを支える技術

CoreOSを支える技術キーワードを挙げるとすれば以下の3つになる．

- [Docker](https://www.docker.com/)
- [etcd](https://github.com/coreos/etcd)
- [fleet](https://github.com/coreos/fleet)

これらについてざっと説明する．

### Docker

CoreOSは専用のパッケージマネージャーをもたない．またRubyやPythonといった言語のRuntimeも持たない．全てのアプリケーションをDockerコンテナとして動作させる．

![https://coreos.com/assets/images/media/Host-Diagram.png](https://coreos.com/assets/images/media/Host-Diagram.png)

[https://coreos.com/assets/images/media/Host-Diagram.png](https://coreos.com/assets/images/media/Host-Diagram.png)

Dockerを使うことで上図のようにコンテナによるプロセスの隔離と，安全なマシンリソースの共有，アプリケーションのポータビリティという恩恵を受けることができる．

### etcd

CoreOSは複数のマシンからクラスタを形成する．クラスタを形成するために，CoreOSは`etcd`という分散Key-Valuesストアを使い，各種設定をノード間で共有する（`etcd`ってのは"`/etc` distributed"という意味）．

<img src="/images/etcd.png" class="image">

[https://coreos.com/assets/images/media/Three-Tier-Webapp.png](https://coreos.com/assets/images/media/Three-Tier-Webapp.png)

`etcd`はクラスタのサービスディスカバリーとしても利用される．クラスタのメンバーの状態などを共有し，共有情報に基づき動的にアプリケーションの設定を行う．これらを行うetcdのコアはRaftのコンセンサスアルゴリズムである．Raftについては，["Raft - The Secret Lives of Data"](http://thesecretlivesofdata.com/raft/)を見るとビジュアルにその動作を見ることができる．

etcdは[locksmith](https://github.com/coreos/locksmith)というクラスタの再起動時のリブートマネジャーにも使われている．

### fleet

コンテナによるサービスをクラスタ内のどのマシンで起動するかをいちいち人手で決めるわけにはいけない．クラスタ内のリソースの状態や動いているサービスに基づき，適切なマシンでコンテナを動かすスケジューリングの仕組みが必要になる．

このスケジューリングとコンテナの管理にCoreOSは`fleet`を用いる．`fleet`はクラスタ全体のinit systemとして，クラスタのプロセス管理を行う．`fleet`はこれを各マシンの`systemd`を束ねることでこれを実現している．`fleet`で管理するサービスは`systemd`のUnitファイルを改良したものを用いる．

![https://coreos.com/assets/images/media/Fleet-Scheduling.png](https://coreos.com/assets/images/media/Fleet-Scheduling.png)

[https://coreos.com/assets/images/media/Fleet-Scheduling.png](https://coreos.com/assets/images/media/Fleet-Scheduling.png)

例えば，上図のようにAPIサーバーを動かすコンテナを6つ，LB用のコンテナを2つ起動したいとする．`fleet`はマシンのリソース状態と`systemd`のUnitファイルに既述した条件に基づき，これらを最も適したマシンで起動する．`fleet`はこれらのコンテナがどこで動いているかも常に管理しており，コンテナの停止，削除，ログの確認なども行うことができる．

もしマシンに障害が発生しても`fleet`は自動でフェイルオーバーを行う．適切なマシンを選択し直し，登録された分のコンテナが起動していることを保証する．


## CoreOSの起動

CoreOSは`cloud-config`という設定ファイルを使って起動する．このファイルにより，CoreOSはクラスタ内の他のメンバーと接続し，基本的なサービスを起動し，重要なパラメータを設定する．

`cloud-config`は[cloud-init](https://launchpad.net/cloud-init)にインスパイアされている．cloud-initはCoreOSが使わないツールも含むので，`cloud-config`は必要最低限なものだけを実装したサブセットになる．さらに，例えばetcdの設定，systemdのunitなどといったCoreOS特有の設定項目も持つ．

最小限には，`cloud-config`は，ホストに既存のクラスタへの参入方法と`etcd`と`fleet`の2つのサービスの起動方法を伝えればよい（これらは全て関連している）．これにより，新しいホストを，既存のサーバーに接続させ，設定する必要のあるツールを提供する．基本的に，これらがCoreOSノードを既存クラスタへ参入させるための要件となる．

## CoreOSクラスタを立てる

[tcnksm/vagrant-digitalocean-coreos](https://github.com/tcnksm/vagrant-digitalocean-coreos)

Vagrantを使ってDigitalOcean上にCoreOSのクラスタを立ち上げてみる（ソースは全て上記のレポジトリにある）．

### SSHの準備

まず，全てのCoreOSは少なくとも1つのSSH公開鍵が登録されている必要がある．DigitalOceanの場合は，公開鍵をDropletsに登録しておき，以下で秘密鍵をエージェントに登録しておく必要がある．

```bash
$ ssh-add
```

fleetを使った他nodeへの接続でもCoreOSはsshを使う．CoreOSへログインした後も同様の秘密鍵の情報が利用される必要があるので，sshの際は必ず`-A`オプションを指定する．

### サービスディスカバリーの設定

etcdを使ってクラスタを形成するために，discovery用のサーバを別途準備する必要がある．CoreOSは[https://discovery.etcd.io](#)というdiscoveryサービスを運用しており，それをそのまま使うことができる．今回はこれを利用する．

この`/new`ページにアクセスすれば，新しいクラスタ用のTokenが生成されるので，それをdiscovery用のURLとして利用する．

```bash
$ curl -w "n" https://discovery.etcd.io/new
https://discovery.etcd.io/724ac1949c661bb3970ff8984b895bca
```

（1つのクラスタに付き1つの新しいTokenを生成する必要がある．また，同じIPで再びクラスタを再構成する場合も新しいTokenを取得する必要がある）

### 最小限のcloud-config

`cloud-config`は`#cloud-config`で始まるYAMLフォーマットで既述する．以下は最小限の設定内容になる．これを`user-data.yml`という名前で作成する．

```yaml
# cloud-config

coreos:
  etcd:
    discovery: https://discovery.etcd.io/c39365ee7d788fb27596150a451c2434
    addr: $private_ipv4:4001
    peer-addr: $private_ipv4:7001

  fleet:
    public-ip: $private_ipv4

units:
  - name: etcd.service
    command: start
  - name: fleet.service
    command: start
```

`coreos.etcd.*`パラメータには，etcdの設定ファイルとしてsystemdのunitファイルへ解釈される．もしプラットフォームがcoreos-cloudinitのテンプレート機能が使えるなら`$public_ipv4`や`$private_ipv4`といった変数が使える．

`coreos.fleet.*`パラメータも`coreos.etcd.*`のように，fleetの設定ファイルとして利用される．

`coreos.units.*`パラメータは，起動後のsystemd unitを定義する．これらは，基本的なサービスの起動を行う．`name`はサービスの名前で必須，`command`はunitが実行するコマンド（start, stop, reload, restart, try-restart, reload-or-restart,…）で，デフォルトは何もしない．`content`を使うと直接unit fileの既述もできる．

起動後の`etcd`と`fleet`の設定項目は以下で確認できる．

- `/run/systemd/system/etcd.service/20-cloundinit.conf`
- `/run/systemd/system/fleet.service/20-cloundinit.conf `

### Vagrantfile

[vagrant-digitalocean](https://github.com/smdahlen/vagrant-digitalocean) pluginを使えばVagranを使ってDigitalOcean上にイメージを立てることができる．CoreOSには，現時点（2014年11月）では最新の`494.0.0`を利用する．以下のような`Vagrantfile`を準備する．

```ruby
$num_instances = 1
$image         = '494.0.0 (alpha)'

if ENV["NUM_INSTANCES"].to_i > 0 && ENV["NUM_INSTANCES"]
  $num_instances = ENV["NUM_INSTANCES"].to_i
end

Vagrant.configure('2') do |config|
  config.ssh.username = 'core'
    (1..$num_instances).each do |i|
    config.vm.define "core-%02d"%i do |config|
      config.vm.provider :digital_ocean do |provider, override|
      override.ssh.private_key_path = '/.ssh/idrsa'
      override.vm.box               = 'digital_ocean'
      override.vm.box_url           = "https://github.com/smdahlen/vagrant-digitalocean/raw/master/box/digital_ocean.box"
      provider.token                = ENV['TOKEN']
      provider.image                = $image
      provider.region               = 'nyc3'
      provider.size                 = '512MB'
      provider.ssh_key_name         = ENV['SSH_KEY_NAME']
      provider.setup                = false
      provider.private_networking   = true
      provider.user_data            = File.read('user-data.yml')
    end
   end
  end
end
```

また現時点（2014年11月）では，[vagrant-digitalocean](https://github.com/smdahlen/vagrant-digitalocean) のバージョンは0.7であり，`user_data`（`cloud-config`ファイル）のポストに対応していない．GitHub上にある最新はそれに対応しているので，自分でビルドしてインストールする必要がある．

```bash
$ git clone https://github.com/smdahlen/vagrant-digitalocean
$ gem build vagrant-digitalocean.gemspec
$ vagrant plugin install vagrant-digitalocean-0.7.0.gem
```

### CoreOSを起動する

では，実際に上記の`user-data.yml`と`Vagrantfile`を使ってDigitalOcean上にクラスタを立ててみる．今回は3つのインスタンスを立てる．以下のようにするだけ．

```bash
export TOKEN="YOUR_DIGITALOCEAN_TOKEN"
export SSH_KEY_NAME="YOUR_SSH_KEY"
export NUM_INSTANCES=3
```

```bash
$  vagrant up --provider=digital_ocean
```

### クラスタの確認をする

クラスタがちゃんと形成されているかを確認する．`core1`にログインする．

```bash
$ ssh -A core@core1_public_IP
```

以下のコマンドでクラスタのマシンを確認する．それぞれのマシンの`peer-addr`が確認できる．

```bash
$ fleetctl list-machines
MACHINE         IP              METADATA
12c469d0...     10.102.100.105  -
93093555...     10.102.101.102  -
b463af61...     10.102.101.101  -
```

`etcd`や`fleet`，DockerといったCoreOSで重要なサービスも使えるようになっているはず．

## 参考

- [CoreOS入門 - SlideShare](http://www.slideshare.net/YutakaMatsubara/coreos-35320632)
- [CoreOS入門 - Qiita](http://qiita.com/mopemope/items/fa9424b094aae3eac580)
- [CoreOSによるDockerコンテナのクラスタリング](http://www.slideshare.net/yujiod/coreosdocker)
- [CoreOS とその関連技術に関するここ半年間の私の活動まとめ](https://gist.github.com/YungSang/73148282c1a081adb2ba)
- [Getting Started with CoreOS | DigitalOcean](https://www.digitalocean.com/community/tutorial_series/getting-started-with-coreos-2)
- [How To Troubleshoot Common Issues with your CoreOS Servers | DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-troubleshoot-common-issues-with-your-coreos-servers)
- [Etcd and fleet [LWN.net]](http://lwn.net/Articles/617452/)
- [etcd - CoreOS が提供してくれるもの - Qiita](http://qiita.com/voluntas/items/1d5c1a6b6e7bce4abac4)
- [CoreOS + etcd + fleetによるクラスタリング事始め - さくらのナレッジ](http://knowledge.sakura.ad.jp/tech/2519/)

