---

title: 'libswarmの現状と将来'
date: 2014-07-14
comments: true
categories: docker
---

DockerCon14で新たに発表されたDockerによる新しいOSSである[libswarm](https://github.com/docker/libswarm)をざっと触ってみたので，現状何ができて，将来的にどういったことができそうになるかを簡単にまとめておく．

## TL;DR

libswarmを使うと複数ホストやサービス（自社サーバー，DigitalOcean，Amazon EC2，Orchardなど）に存在するDockerコンテナを，１つのホストに存在しているかのように扱うことができるようになる．Dockerがホストを抽象化したのに対して，libswarmは複数ホストを抽象化する．

libswarmを使ったswarmdコマンドを使って，UNIXのパイプのように複数ホストやサービスを連鎖的につなげる．

## デモ

libswarmで何ができるのかは，DockerCon14でのデモ動画["Orchard + libswarm demo from DockerCon"](https://www.youtube.com/watch?v=a_YbxWbHgQA)を観るのが一番わかりやすい．

ここでは，異なるホスト（ローカルホストとDigitalOcean，Orchard）に対して，swarmdを立ち上げるだけで，それらに個別にログインすることなく，同様のコマンドを発行してaanand/hello-worldコンテナを立ち上げ，かつそれら全てのコンテナの情報を一気に取得している様子が観られる．

## libswarmの動作

libswarmのプロジェクトをみると，[backends](https://github.com/docker/libswarm/tree/master/backends)というディレクトリがある．ここに，様々ななバックエンドサービス，例えば標準的なDocker server/clientやAmazon EC2，Orchardなど，が定義されており，libswarmはこれらのサービスの間の情報のやりとりを受け持つ．

例えば，一番単純なコマンドは以下のようになる．

```bash
$ swarmd 'dockerserver unix:///var/run/docker.sock' 'dockerclient tcp://192.168.59.103:2375'
```

これを立ち上げたまま，ローカルでDockerコマンドを実行すると，

1. クライアントによるHTTPリクエストを`dockerserver`が受ける
2. `dockerserver`はリクエストを`dockerclient`にフォワードする
3. `193.168.59.103`のDockerデーモンでコマンドが実行される

この動作は以下の図がわかりやすい．

![](http://www.tech-d.net/wp-content/uploads/2014/07/548d351e8542debc543ca059d96859c9.png)
[Libswarm (in a nutshell) | Tech'd](http://www.tech-d.net/2014/07/03/libswarm/)


上の例は最小限で感動はない．libswarmがすごいのは，例えばdockerclientバックエンドをorchardバックエンドに変えればorchardにコマンドが発行されるし，EC2バックエンドに変えればEC2にコマンドが発行されるところ．さらに，複数のバックエンドサービスを束ねて同時にそれらを扱えるところ．

## デモの再現

とりあえず，DockerCon14のデモをOSX上で再現してみる．まず，インストールは以下．Goがインストールされている必要がある．

```bash
$ go get github.com/docker/libswarm/...
$ go install github.com/docker/libswarm/swarmd
```

### dockerclient

まず，dockerclientにboot2dockerを指定してみる．

```bash
$ swarmd 'dockerserver tcp://localhost:4567' 'debug' "dockerclient tcp://:2375"
```

別のウィンドウを立ち上げて，`DOCKER_HOST`を`dockerserver`で指定した値にして，コマンドを発行する．

```bash
$ export DOCKER_HOST=tcp://:4567
$ docker run -d -p 80:80 dockerfile/nginx
```

すると，nginxコンテナが立ち上がる．

```bash
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS                       NAMES
3eac36e063d6        dockerfile/nginx    nginx               25 hours ago        Up                  0.0.0.0:80->80/tcp, 0/tcp   evil_leakey
```

現時点（2014.07.10）では，ポートフォーワードは効かない．これを再現するには，[libswarm/backends/dockerclient.go](https://github.com/docker/libswarm/blob/master/backends/dockerclient.go)の`start()`関数のポストパラメータを無理矢理いじるしかない．

### DigitalOcean

次に，dockerclientにDigitalOceanに立てたサーバを指定してみる．

```bash
$ swarmd 'dockerserver tcp://localhost:4243' 'debug' "dockerclient $DIGITAL_OCEAN_HOST"
```

`DOCKER_HOST`を指定してあれば上記を同じコマンドでnginxコンテナを立ち上げることができる．

```bash
$ docker run -d -p 80:80 dockerfile/nginx
```

```bash
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED              STATUS              PORTS                       NAMES
5d84aaca9fbc        dockerfile/nginx    nginx               About a minute ago   Up                  0.0.0.0:80->80/tcp, 0/tcp   happy_mayer
```

### Orchard

次にOrchardバックエンドを使ってみる．これを使うには，OrchardのAPI tokenを事前に取得しておく必要がある．

まず，Orchardでホストを立ち上げる．

```bash
$ orchard hosts create
```

次に，Orchardバックエンドを指定して，swarmdを立ち上げる．

```bash
$ swarmd 'dockerserver tcp://localhost:4567' 'debug' "orchard $ORCHARD_API_TOKEN default"
```

あとは，同じコマンドでnginxコンテナを立ち上げることができる．

```bash
$ docker run -d -p 80:80 dockerfile/nginx
```

```bash
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS                       NAMES
6e26732ecc14        dockerfile/nginx    nginx               15 seconds ago      Up                  0.0.0.0:80->80/tcp, 0/tcp   nostalgic_pike
```

### aggregate

これまでのバックエンドサービスを全て指定する．これには，aggregateバックエンドを利用する．

```bash
$ swarmd 'dockerserver tcp://localhost:4567' \
    "aggregate 'dockerclient tcp://localhost:2375' \
               'dockerclient $DIGITAL_OCEAN_HOST' \
               'orchard $ORCHARD_API_TOKEN default'"
```

コンテナの情報を取得してみる．

```bash
$ docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS                       NAMES
3eac36e063d6        dockerfile/nginx    nginx               25 hours ago        Up                  0.0.0.0:80->80/tcp, 0/tcp   evil_leakey
5d84aaca9fbc        dockerfile/nginx    nginx               About a minute ago   Up                  0.0.0.0:80->80/tcp, 0/tcp   happy_mayer
6e26732ecc14        dockerfile/nginx    nginx               15 seconds ago      Up                  0.0.0.0:80->80/tcp, 0/tcp   nostalgic_pike
```

上は期待する動作で，boot2docker，DigitalOcean，Orchardに立てたコンテナの情報が取得できるはず．現状は，`not implemented`エラーになる．


## 将来できそうなこと

最後に，[この記事](http://www.tech-d.net/2014/07/03/libswarm)を参考に将来こんなことできるようになるのでは？をざっと書いておく．

例えば，複数のdockerclientを指定する．

```bash
$ swarmd 'dockerserver tcp://:4567' \
    'aggregate "dockerclient tcp://172.20.20.10:2375" \
               "dockerclient tcp://172.20.20.11:2375" \
               "dockerclient tcp://172.20.20.12:2375"'
```

これに対して，`docker run`を実行すると，dockerclientで指定したホストのどれか1つでコンテナを実行する．`docker ps`をすると，すべてのホストからコンテナの情報を取得できる．また，コンテナ間のlink機能を複数ホストにまたがりそのまま使える．

例えば，Mesosバックエンド（実装されてない）を指定する．

```bash
$ swarmd 'dockerserver tcp://:4567' \
    'mesos "dockerclient tcp://172.20.20.10:2375" \
           "dockerclient tcp://172.20.20.11:2375" \
           "dockerclient tcp://172.20.20.12:2375"'
```

これに対して，`docker run`を実行すると，Mesosがサーバのリソースの状況に合わせて，コンテナを実行する．

などなど．


## まとめ

期待は多いが，実装やコードを見てるとプロトタイプ感は半端ない．みんなでlibswarmにコミットしてコンテナオーケストレーションツールの乱立を阻止する必要がある．

## 参考

- [Docker: the road ahead](http://www.slideshare.net/shykes/docker-the-road-ahead)
- [Analyzing Docker’s New OSS: libchan and libswarm | CenturyLink Labs](http://www.centurylinklabs.com/analyzing-dockers-new-oss-libchan-and-libswarm/)
- [libswarm - Docker Orchestration Announced | ActiveBlog: Insights on Code, the Cloud and More](http://www.activestate.com/blog/2014/06/libswarm-docker-orchestration-announced)
- [Dockerで何が変わるのか - 世界線航跡蔵](http://yugui.jp/articles/880)
- [Libswarm (in a nutshell) | Tech'd](http://www.tech-d.net/2014/07/03/libswarm/)
- [How to impl libswarm backend](http://www.slideshare.net/YutakaMatsubara/out-36624126)
