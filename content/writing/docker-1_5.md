+++
date = "2015-02-11T22:04:50+09:00"
title = "Docker 1.5の変更点"
+++

- [Docker 1.5.0-rc1](https://groups.google.com/forum/#!topic/docker-dev/nzKREJKqxe4)
- [Docker 1.5: IPv6 support, read-only containers, stats, “named Dockerfiles” and more | Docker Blog](http://blog.docker.com/2015/02/docker-1-5-ipv6-support-read-only-containers-stats-named-dockerfiles-and-more/)

Docker 1.5が出た．IPv6のサポートや`stats`コマンドによるコンテナのメトリクス表示などが追加された．ユーザ的に一番嬉しいのはDockerfileの名前を自由に決められるようになったことだろうと思う．

今までDockerfileは`Dockefile`という名前しか受け付けなかった，というかまともに動かなかった．やりようはあって，標準入力からぶっ込むことはできた．例えば`base`とう名前のDockerfileを作って以下のように`build`を実行することができた．

```bash
$ docker build -t tcnksm/test - < base
```

しかし，`ADD`もしくは`COPY`インストラクションを使っている場合に，そのソースはURLでないといけないという制限があった．ソースにローカルのファイルを指定していると，`build`のコンテキストが伝わらず`no such file or directory`エラーが発生するという面白い状況だった．

1.5からは`-f`オプションが追加され，`Dockerfile`という名前以外のDockerfileを指定することができるようになった．

```bash
$ docker build -t tcnksm/test -f base .
```

`ADD`や`COPY`インストラクションのソースにローカルファイルを指定していてもちゃんと動く．

しかし，今までのようにカレントディレクトリの`Dockerfile`をビルドすることに慣れていると，ハマるところがある．カレントディレクトリ以外のDockerfileをビルドするときは，その`build`の起点となるディレクトリをちゃんと指定する必要がある．例えば，`files`ディレクトリ内の`base`という名前のDocekerfileをその外からビルドするときは，以下のようにする．

```bash
$ docker build -t tcnksm/test -f files/base files
```

末尾の`files`をいつも通りに`.`にすると`ADD`や`COPY`インストラクションで`no such file or directory`エラーが発生する．

### DockerHub

ではDockerHubのAutomated buildはどうか．現時点（2015年2月11日）では`Dockerfile`という名前以外は受け付けていない．ので，今まで通りにディレクトリごとにDockerifileを準備する必要がある．

ただ，自分はディレクトリごとにDockerfileを分けるという慣習には適応しすぎているので，もうこのままでも良いかなって気持ちはある...

## その他の変更

他にもいくつか自分的に気になった機能をいくつか．

### Read-onlyコンテナ

`run`に`--read-only`オプションがつき，コンテナのファイルシステムを書き込み不可にすることができるようになった．

```bash
$ docker run --read-only busybox sh -c 'echo test > /etc/test.conf'
sh: can't create /etc/test.conf: Read-only file system
```

この場合，書き込みは`volume`領域のみに行える．

```bash
$ docker run --read-only -v `pwd`/volume:/volume busybox sh -c 'echo test > /volume/test.conf'
```

これはセキュリティとコンテナのステートレスの推進が目的だと思う．

### Stats

`stats`コマンドが追加され，リアルタイムでコンテナのCPUやメモリ，ネットワークI/Oなどを確認できるようになった．

```bash
$ docker run -d --name redis -p 6379 crosbymichael/redis
$ docker stats redis
# CONTAINER           CPU %               MEM USAGE/LIMIT       MEM %               NET I/O
# redis               0.46%               10.23 MiB/1.961 GiB   0.51%               1.266 KiB/648 B
```

ざっと確認するには使える．ただ，メトリクス収集をまともにやるなら[google/cadvisor](https://github.com/google/cadvisor)の方が筋が良いのでこっち使うと思う．

### ホストのPID

`--net=host`のように`--pid=host`を指定するとするとホストのPIDのnamespaceが使われるようになる．

```bash
$ docker run --pid=host busybox ps
```

### Dockerイメージのスペック

またリリースアナウンスには，Dockerイメージのスペックを作り始めたことが触れられている．

- [Docker Image Specification v1.0.0](https://github.com/docker/docker/blob/master/image/spec/v1.md)

これは[CoreOS/Rocket](https://github.com/coreos/rocket)と[App Container](https://github.com/appc/spec)の登場の影響によるものだと推測できる．その辺については次回詳しく書く．




