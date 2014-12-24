---

title: 'Fleetの使い方，Unitファイルの書き方'
date: 2014-11-20
comments: true
categories: coreos
---

[CoreOSに入門した | SOTA](http://deeeet.com/writing/2014/11/17/coreos/)

CoreOSではすべてのアプリケーションをDockerで動かす．このとき，コンテナによるサービスをCoreOSクラスタのどのマシンで起動するかをいちいち人手で決めるわけにはいけない．クラスタ内のリソースの状態や動いているサービスに基づき，適切なマシンでコンテナを動かすスケジューリングの仕組みが必要になる．

このスケジューリングとコンテナの管理にCoreOSはfleetを用いる． fleetを使うとCoreOSクラスタが1つのinit systemで動いているかのようにそれを扱うことができるようになる．開発者はどのマシンでどのDockerコンテナが動いているかを気にする必要がなくなる．

例えば，5つのコンテナを動かす必要があれば，fleetはクラスタのどこかでその5つのコンテナが動いてることを保証する．もしコンテナが動いているマシンに障害があっても，fleetはそのコンテナを別のマシンにスケジューリングしなおす（フェイルオーバー）．

スケジューリングは柔軟で，マシンのRegionやRoleによって振り分けることもできるし，同じサービスを同じマシンでは動かさないようにするといった設定もできる．例えば，複数のDBコンテナを別々のマシンに分散させるといったこともできる．

DigitalOceanの["Getting Started with CoreOS"](https://www.digitalocean.com/community/tutorial_series/getting-started-with-coreos-2)シリーズの

- [How To Use Fleet and Fleetctl to Manage your CoreOS Cluster](https://www.digitalocean.com/community/tutorials/how-to-use-fleet-and-fleetctl-to-manage-your-coreos-cluster)
- [How to Create Flexible Services for a CoreOS Cluster with Fleet Unit Files](https://www.digitalocean.com/community/tutorials/how-to-create-flexible-services-for-a-coreos-cluster-with-fleet-unit-files)

において，fleetを操作するための`fleettcl`コマンドの使い方と，その設定ファイルであるUnitファイルの書き方を良い感じに解説していたので，それらを参考にfleetの使い方をまとめておく．

まずfleetの技術的概要をまとめる，次に`fleetctl`コマンドによるサービスの管理方法を書く．最後にUnitファイルの書き方について説明する．

## fleetの技術的概要

fleetはクラスタレベルのsystemdと捉えることができる（単一マシンのinit systemがsystemdで，クラスタのinit systemがfleet）．

![https://coreos.com/assets/images/media/fleet-schedule-diagram.png](https://coreos.com/assets/images/media/fleet-schedule-diagram.png)

[https://coreos.com/assets/images/media/fleet-schedule-diagram.png](https://coreos.com/assets/images/media/fleet-schedule-diagram.png)

fleetは**engine**と**agent**という大きく2つのコンポーネントから構成される．**engine**はジョブスケジューリングとクラスタサイズの変更を管理する．**agent**はマシンの代わりにジョブを引き受ける．Unitがクラスタに割り当てられると，**agent**はUnitファイルを読み込み，それを開始する．そして，systemdの状態をfleetに通知する．

バックエンドでは`etcd`クラスタが動いており，**engine**と**agent**の協調に使われる．

## fleetctlによるサービスの管理

fleetの設定ファイルは，systemdのunitファイルにfleet特有の設定（e.g., クラスタ内での分散方法など）を加えたものを利用する． このファイルの詳細は後述するとして，ここでは以下のようなHello Worldを出力しつづける`hello.service`を利用する．

```
[Unit]
Description=My Service
After=docker.service

[Service]
TimeoutStartSec=0
ExecStartPre=-/usr/bin/docker kill hello
ExecStartPre=-/usr/bin/docker rm hello
ExecStartPre=/usr/bin/docker pull busybox
ExecStart=/usr/bin/docker run --name hello busybox /bin/sh -c "while true; do echo Hello World; sleep 1; done"
ExecStop=/usr/bin/docker stop hello
```

fleetによるサービス管理は`fleetctl`コマンドを使って行う．サービスの起動は以下の流れで行われる．

1. Unitファイルを読み込む
2. クラスタ内の特定のマシンにスケジューリングする
3. サービスを起動する

### サービスの登録

まず，`submit`コマンドを使ってサービスを登録する．これは単にfleetがファイルをメモリ内に読み込むだけ．

```bash
$ fleetctl submit hello.service
```

fleetが読み込んだunitファイルは以下で一覧できる．

```bash
$ fleetctl list-unit-files
UNIT            HASH    DSTATE          STATE           TARGET
hello.service   3f8de4b inactive        inactive        -
```

`DSTATE`とは望まれる状態であり，`STATE`は実際の状態を示す（`DSTATE`と`STATE`が一致しているとき各種コマンドがちゃんと動いたと考えて良い）．`TARGET`はサービスを実行するべきマシンを示す．今はまだスケジューリングをしていないので，`-`となる．

読み込んだファイルの内容を確認することもできる．

```bash
$ fleetctl cat hello
[Unit]
Description=My First Service
After=docker.service
...
```

`submit`コマンドを一度実行し，Unitファイルを変更して再び`submit`してもアップロードは実行されない．ファイルを更新するには，一度アップロードしたものを削除する必要がある．

### サービスのスケジューリング

次に，サービスをスケジューリングする．スケジューリングとは，fleetエンジンがクラスタ内でサービスを実行するのに最も適したマシンを選択することである．これはUnitファイルの`[X-Fleet]`セクションの既述と，クラスタ内のマシンの現在のリソース状態に基づき決定される．サービスがスケジューリングされると，Unitファイルはそのマシンに渡され，ローカルのsystemdインスタンスに読み込まれる．

スケジューリングは，`load`コマンドで行う．

```bash
$ fleetctl load hello.service
Unit hello.service loaded on 0d8b5e37.../10.132.181.182
```

読み込んだUnitファイルを確認する．

```bash
fleetctl list-unit-files
UNIT            HASH    DSTATE  STATE   TARGET
hello.service   3f8de4b loaded  loaded  0d8b5e37.../10.132.181.18
```

`TAGET`セクションにサービスを実行するマシンが追加されているのが確認できる．`STATE`はスケジューリングされたことを示している．

`list-units`コマンドを使うと，実行中，もしくはスケジューリングされたサービスとその状態を確認することができる．

```bash
$ fleetctl list-units
UNIT            MACHINE                         ACTIVE          SUB
hello.service   0d8b5e37.../10.132.181.182      inactive        dead
```

これはsystemdから得られる情報であり，`ACTIVE`はサービスの状態を示し，`SUB`はより低レベルな状態を示す．


### サービスを起動する

次にサービスを起動してみる．起動は`start`コマンドで行う．

```bash
fleetctl start hello
Unit hello.service launched on 0d8b5e37.../10.132.181.182
```

Unitファイルの状態を確認する．

```bash
$ fleetctl list-unit-files
UNIT            HASH    DSTATE          STATE           TARGET
hello.service   3f8de4b launched        launched        0d8b5e37.../10.132.181.182
```

次に，systemdの状態を確認する．

```bash
$ fleetctl list-units
UNIT            MACHINE                         ACTIVE  SUB
hello.service   0d8b5e37.../10.132.181.182      active  running
```

ちゃんとサービスが起動したことが確認できる．

### サービスの詳細の状態を得る

`list-unit`コマンドで，現在スケジュールされているUnitを一覧でき，`list-unit-files`でfleetが知っている*全て*のUnitの状態を一覧できる．

一覧ではなく，各Unitの詳細をみることもできる．例えば，`status`コマンドを使うと，そのUnitが動いているマシンの`systemctl status`の結果を取得することができる．

```bash
$ fleetctl status hello
● hello.service - My First Service
   Loaded: loaded (/run/fleet/units/hello.service; linked-runtime)
      Active: active (running) since Sun 2014-11-16 07:02:10 UTC; 8min ago
        Process: 11863 ExecStartPre=/usr/bin/docker pull busybox (code=exited, status=0/SUCCESS)
        Process: 11853 ExecStartPre=/usr/bin/docker rm hello (code=exited, status=0/SUCCESS)
        Process: 11844 ExecStartPre=/usr/bin/docker kill hello (code=exited, status=0/SUCCESS)
        Main PID: 11873 (docker)
           CGroup: /system.slice/hello.service
              └─11873 /usr/bin/docker run --name hello busybox /bin/sh -c while true; do echo Hello World; sleep 1; done

Nov 16 07:10:59 core2 docker[11873]: Hello World
Nov 16 07:11:00 core2 docker[11873]: Hello World
Nov 16 07:11:01 core2 docker[11873]: Hello World
Nov 16 07:11:02 core2 docker[11873]: Hello World
```

`journal`コマンドを使うと，各サービスのjournalのエントリをみることもできる．

```bash
$ fleetctl journal hello
-- Logs begin at Sat 2014-11-15 10:23:32 UTC, end at Sun 2014-11-16 07:12:54 UTC. --
Nov 16 07:12:44 core2 docker[11873]: Hello World
Nov 16 07:12:45 core2 docker[11873]: Hello World
Nov 16 07:12:46 core2 docker[11873]: Hello World
Nov 16 07:12:47 core2 docker[11873]: Hello World
```

`tail -f`みたいなこともできる．

```bash
$ fleetctl journal -f hello
```

スケジューリングされたマシンにログインしていろいろ調査することもできる．このときスケジューリングされたマシンのIPを知る必要はなく，サービス名でログインできる．

```bash
$ fleetctl ssh hello
```

### サービスの停止

まず，`stop`コマンドでサービスを停止できる．

```bash
$ fleetctl stop hello
Unit hello.service loaded on 0d8b5e37.../10.132.181.182
```

```bash
 $ fleetctl list-unit-files
 UNIT            HASH    DSTATE  STATE   TARGET
 hello.service   3f8de4b loaded  loaded  0d8b5e37.../10.132.181.182
```

これにより，サービスは`loaded`状態に戻ったことが確認できる．これはサービスは止まったが，スケジューリングされたマシンの`systemd`には読み込まれた状態である．

これを削除するには，`unload`コマンドを使う．

```bash
$ fleetctl unload hello
Unit hello.service inactive
```

```bash
$ fleetctl list-unit-files
UNIT            HASH    DSTATE          STATE           TARGET
hello.service   3f8de4b inactive        inactive        -
```

`inactive`状態になり，ターゲットのマシンも消えていることが確認できる．これは，スケジューリングを解除し，fleetにUnitファイルが読み込まれただけの状態である．

fleetが読み込んだUnitファイルを削除するには，`destroy`コマンドを使う．

```bash
$ fleetctl destroy hello
Destroyed hello.service
```

```bash
$ fleetctl list-unit-files
UNIT    HASH    DSTATE  STATE   TARGE
```

完全に消えた．

## Unitファイル

fleetによるスケジューリングはUnitファイルにより行う．UnitファイルはsystemdのUnitファイルにfleet特有の`[X-Fleet]`セクションを加えたものを使う．systemdについて以下の記事が詳しい．

- [Systemd入門(1) - Unitの概念を理解する](http://d.hatena.ne.jp/enakai00/20130914/1379146157)
- [Systemd入門(2) - Serviceの操作方法](http://d.hatena.ne.jp/enakai00/20130915/1379212787)
- [Systemd入門(3) - cgroupsと動的生成Unitに関する小ネタ](http://d.hatena.ne.jp/enakai00/20130916/1379295816)
- [Systemd入門(4) - serviceタイプUnitの設定ファイル](http://d.hatena.ne.jp/enakai00/20130917/1379374797)
- [Systemd入門(5) - PrivateTmpの実装を見る](http://d.hatena.ne.jp/enakai00/20130923/1379927579)

### Unitファイルの名前

Unitファイル名には命名規則がある．`string.suffix`もしくは`string@instance.suffix`とする．

- `string`は必須．Unitの名前を指定する．` [a-zA-Z0-9:_.@-]+`の正規表現に一致する必要がある
- `instance`は必須ではない．1つのUnitファイルから複数のUnitインスタンスを作成するときに利用する（例えば，`hello@.service`ファイルから`hello@1.service`，`hello@2.service`を作る）．この値はUnitファイル内から`%i`として参照することもできる．` [a-zA-Z0-9:_.@-]+`の正規表現に一致する必要がある
- `suffix`は必須．Unitの属性を指定する．service, socket, device, mount, automount, timer, pathのいずれか．

### セクション

一般的なfleetの設定ファイルは以下のようになる（serviceの場合）．

```
[Unit]
generic_unit_directive_1
generic_unit_directive_2

[Service]
service_specific_directive_1
service_specific_directive_2
service_specific_directive_3

[X-Fleet]
fleet_specific_directive
```

`[Unit]`セクションには，Unitの依存関係/順序関係など、Unitのタイプに依存しない設定を既述する（systemdと同様）．

`[Service]`セクションには，service固有の設定を書く．例えば，起動・停止コマンドや，サービス起動前に実行するべきコマンド，環境変数ファイルの場所などを既述する（systemdと同様）．

`[X-Fleet]`セクションには，fleet特有の設定を書く．どのようにクラスタにスケジューリングを行うかを定義する．具体的には以下のような設定ができる．

- `MachineID` - 特定のマシンにスケジューリングしたときに利用する．マシンのIDを指定する（`fleetctl list-machines -l `）．
- `MachineOf` - 特定のUnitが実行されているマシンと同様のマシンにスケジューリングしたときに利用する．Unit名を指定する．
- `MachineMetadata` - マシンのメタデータに基づきスケジューリングしたいときに利用する．例えばRegionやRole, diskTypeなど．これらは`cloud-config`の`fleet.metadata`の項目で指定できる．
- `Conflicts` - 特定のUnitが実行されているマシンを避けたいときに利用する．`MachineOf`の逆．
- `Global` - すべてのマシンにスケジューリングしたいときに利用する．


### Apacheサービス

具体例としてApacheサービスを起動するためのUnitファイルを作る．ファイル名は`apache@.service`とする．

```
[Unit]
Description=Apache web server service
After=etcd.service
After=docker.service
Requires=apache-discovery@%i.service

[Service]
TimeoutStartSec=0
KillMode=none
EnvironmentFile=/etc/environment
ExecStartPre=-/usr/bin/docker kill apache%i
ExecStartPre=-/usr/bin/docker rm apache%i
ExecStartPre=/usr/bin/docker pull user_name/apache
ExecStart=/usr/bin/docker run --name apache%i -p $COREOS_PUBLIC_IPV4:%i:80 user_name/apache /usr/sbin/apache2ctl -D FOREGROUND
ExecStop=/usr/bin/docker stop apache%i

[X-Fleet]
X-Conflicts=apache@*.service
```

まず`[Unit]`セクションには，サービス名とこのサービスを起動するための依存を既述する．`After`にはこのサービスが起動する前に起動されているべきサービスを，`Require`にはこのサービスが必要とするサービスを既述する．

`Require`に書いたサービスが失敗したらこのサービスも起動に失敗する．失敗してもサービスを継続したい場合は`Want`を使う．

次に`[Service]`セクションには，具体的なサービスの起動・停止方法を書く．`TimeoutStartSec`を0にしてタイムアウトを無効にしている（デフォルトは90秒）．これはDockerイメージのpullに時間がかかる可能性があるため．

`EnvironmentFile`を指定するとその中に既述された環境変数が有効になる．`/etc/environment`には`COREOS_PUBLIC_IPV4`といった値が定義されている．

`ExecStartPre`にはサービス起動前に実行するべきコマンドを定義する．`=-`とした場合は，失敗してもサービスの起動を続行する（一度目の起動は`docker kill`や`docker rm`は必ず失敗する）．そして`ExecStart`と`ExecStop`で起動，停止コマンドを指定する．

最後に`[X-Fleet]`には，fleetのスケジューリングに関わる設定を既述する．`X-Conflicts`を指定すると，そのUnitが実行されているマシンではスケジューリングされなくなる．この場合，このapacheサービスは同じマシンにはスケジューリングされない．

さらにこのUnitファイルはテンプレートになっており，`%i`には動的に値が代入される．スケジューリングする際に具体的な値を入れる．例えば，以下のようにすると，起動時には80という値が代入される．

```bash
$ fleetctl submit apache@.service
$ fleetctl load apache@80.service
```

### テンプレートの扱い

fleetもsystemdもシンボリックリングを扱うことができる．そのため上述した`apache@.service`のスケジューリングは以下のように既述できる．

```bash
$ ln -s apache@.service apache@8888.service
$ fleetctl start apache@8888.service
```

これは扱うテンプレートとそのインスタンスが増えたときに管理が楽になる．例えば，`templeates`と`instance`，`static`というディレクトリを作り，動的な変更のないUnitファイルは`static`以下に，テンプレートとして使うUnitファイルは`templates`以下に配置し，`instances`にシンボリックリンクを作る．

```bash
$ mkdir templates instances static
$ mv apache@.service templates/.
$ mv hello.service static/.
```

```bash
$ cd instances
$ ln -s ../templates/apache@.service apache@5555.service
$ ln -s ../templates/apache@.service apache@6666.service
$ ln -s ../templates/apache@.service apache@7777.service
```

こうしておくと，instanceは以下のように一気に起動できる．管理と運用が楽になる．

```bash
$ fleetctl start instances/* 
```
