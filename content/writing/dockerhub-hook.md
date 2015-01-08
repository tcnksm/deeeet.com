+++
date = "2015-01-08T20:29:53+09:00"
title = "DockerHubのAutomated Buildsをフックして最新のDockerコンテナをデプロイする"
+++

[DockerHubのAutomated Builds](http://docs.docker.com/docker-hub/builds/)は，GithubやBitbucketへの`git push`をフックしてレポジトリ内のDockerfileを元にDockerイメージをビルドする機能である．

イメージを使う側からすれば，それがどのようなDockfileから作られているか可視化され，常に新しいイメージがあることが保証されるので安心感がある．イメージを提供する側からすればDockerfileを更新して`git push`すれば自動でビルドしてくれくれるので楽という利点がある．そのためDockerHubにイメージを上げる場合は，`docker push`を使うことはほとんどなくてこのAutomated Buildsを使うのが普通である．

このAutomated BuildsはWeb hookを提供しており，イメージのビルドが終了したら，好きなところにHTTP POSTをぶん投げるということができる．この仕組みを使えば，`git push`したら，DockerHubで最新のイメージをビルドして，終わったらそのイメージをデプロイ！といったことが可能になる．

[bketelsen/captainhook](https://github.com/bketelsen/captainhook)を使えば，Web Hookを受け取ってコマンドを実行ということが簡単にできる（Go製なのでデプロイも楽）．これを使って，DockerHubのAutomated BuildsをフックしてDockerコンテナのデプロイする．以下ではCoreOS以外のホストOS（シングルホスト）の場合とCoreOSの場合をそれぞれ説明する．

## Captainhookとは

[bketelsen/captainhook](https://github.com/bketelsen/captainhook)について簡単に説明する．captainhookはHTTP POSTを受け取って設定したコマンドを実行するツールである．

まず`configdir`を作成し，その中にJSONで設定ファイルを準備する．例えば`endpoint.json`というファイルを作る．

```bash
$ mkdir ~/captainhook
```

```json
{
    "scripts": [
        {
            "command": "echo",
            "args": [
               "hello"
            ]
        }
    ]
}
```

以下のようにサービスを起動する．

```bash
$ captainhook -configdir ~/captainhook
```

あとは，以下のようにHTTP POSTを投げると，JSONで指定したコマンドが実行される．シンプルで良い．

```bash
$ curl -X POST http://localhost:8080/endpoint1
```

## CoreOS以外の場合

まず，CoreOS以外のホストOS（シングルホスト）でAutomated Buildsをフックして最新のDockerコンテナをデプロイする方法について説明する．これは，[Gopher Academyのブログ](http://blog.gopheracademy.com/)のデプロイ方法が参考になる．まさにこの方法で最新のブログ記事をデプロイしている．以下のブログに詳しく説明されている．

- [Easy Docker Deployment with Hooks and Captain Hook](http://blog.gopheracademy.com/advent-2014/easy-deployment/)

Gopher Academyのブログは`bketelsen/gopheracademy-web`とうDockerイメージとして動いている．Automated Buildsでビルドされており，`git push`される度に最新のイメージが作られる．Captainhookには以下のようなスクリプトを登録している．

```bash
echo "Getting currently running gablog containers"
OLDPORTS=( `docker ps | grep gopheracademy-web | awk '{print $1}'` )

echo "pulling new version"
docker pull bketelsen/gopheracademy-web
echo "starting new containers"
for i in `seq 1 $1` ; do
docker run -d -e VIRTUAL_HOST=blog.gopheracademy.com -p 80 bketelsen/gopheracademy-web
done

echo "removing old containers"
for i in ${OLDPORTS[@]}
do
echo "removing old container $i"
docker kill $i
done
```

やってることは単純で，

- `docker ps`で現在動いてるコンテナを取得する
- `docker pull`で最新のイメージを取得する
- `docker run`で最新のコンテナを起動する
- `docker kill`で元々動いていたイメージを削除する

を実行し，最新のコンテナに切り替えている．

あとはcaptaihookを起動し，Automted Buildsが終了したらこのホストにPOSTを投げるように設定されている．これにより`git push`するだけでコンテナが最新のものに入れ替わるということを実現している．

ちなみに上のスクリプトではPortマッピングに関して特別に何もしていない．これは，フロントで`jwilder/nginx-proxy`というDockerコンテナを動かしているからである．このコンテナは`VIRTUAL_HOST`環境変数を設定して起動したDockerコンテナにリクエストを振り分けるということをやってくれる．

`jwilder/nginx-proxy`は，内部で[jwilder/docker-gen](https://github.com/jwilder/docker-gen)というツールを使って，Nginxの設定ファイルを生成している．`docker-gen`は`docker.sock`のイベントから得られる値とテンプレートを使って設定ファイルなどを生成するツールである．これのおかげで`VIRTUAL_HOST`環境変数を設定してコンテナを起動するだけで，そのコンテナにリクエストをプロキシするといったことを実現している．


## CoreOSの場合

次にAutomated BuildをフックしてCoreOSクラスタ内のDockerコンテナを最新のものに切り替える方法について説明する．CoreOSの場合は以下の2つの条件がある．

- Dockerコンテナはfleetによってサービスとしてデプロイする
- CaptainhookサービスもDockerコンテナとしてデプロイする

これを満たすためには，Captaihookでfleetを実行するためのDockerコンテナを作る．

### Captainhookコンテナ

以下のようなDockerfileからCaptainhookでfleetを実行するイメージを作成する．

```bash
FROM debian:wheezy
MAINTAINER tcnksm <nsd22843@gmail.com>

# Install dependencies
RUN apt-get update && apt-get install -y \
              curl \
              build-essential \
              ca-certificates \
              git \
              mercurial \
              bzr \
              --no-install-recommends \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*

# Install Golang
ENV GOVERSION 1.4
RUN mkdir /goroot && curl https://storage.googleapis.com/golang/go${GOVERSION}.linux-amd64.tar.gz | tar xvzf - -C /goroot --strip-components=1
RUN mkdir /gopath

# Set Environmental variable for golang
ENV GOROOT /goroot
ENV GOPATH /gopath
ENV PATH $PATH:$GOROOT/bin:$GOPATH/bin

# Install fleet
RUN go get -d github.com/coreos/fleet/...
RUN cd $GOPATH/src/github.com/coreos/fleet && ./build && cp ./bin/fleetctl /usr/local/bin/.


# Install captainhook
RUN go get github.com/bketelsen/captainhook

# Setup captainhook
ADD etc/captainhook/update.json /etc/captainhook/update.json
ADD usr/local/bin/update-container.sh /usr/local/bin/update-container.sh

CMD ["captainhook","-listen-addr=0.0.0.0:8080","-echo","-configdir=/etc/captainhook"]
```

得に複雑なことはしていない．やっているのは以下．

- fleetとCaptainhookのインストール
- Captainhookで実行したいスクリプト（`update-container.sh`）の`ADD`
- 起動コマンドへのcanptainhookの登録

Captainhookでは以下のようなスクリプトを実行する．

```bash
PORTS=( "8901" "8902" )
for p in "${PORTS[@]}"; do
    SERVICE="my-service@${p}.service"

    echo "Restart ${SERVICE}"
    fleetctl stop ${SERVICE} 2>/dev/null
    fleetctl start ${SERVICE} 2>/dev/null

    # fleet doesn't wait but starts after `launched`
    # We need to wait for zero-downtime.
    until [ "`fleetctl list-units 2>/dev/null | grep ${SERVICE} | cut -f 6`" = "running" ]; do
        echo "Wainting for starting ${SERVICE}...."
        sleep 5s
    done
    echo "${SERVICE} is running"
    sleep 20s
done
```

やっているのは，最新に切り替えたいコンテナを動かしているサービスを順番に`fleet stop`，`fleet start`しているだけ．これでコンテナは最新のものに切り替わる．起動には若干時間がかかるので，fleetのステータスを監視して，`running`になるまで待つ．


### Captainhookサービス

上記のCaptainhookコンテナを起動するためのUnitファイルは以下．

```bash
[Unit]
Description=Receive web-hook to update my-service container

# Requirements
Requires=etcd.service
Requires=docker.service

# Dependency ordering
After=etcd.service
After=docker.service

[Service]
TimeoutStartSec=0
KillMode=none
EnvironmentFile=/etc/environment
ExecStartPre=-/usr/bin/docker kill my-service-hook
ExecStartPre=-/usr/bin/docker rm my-service-hook
ExecStartPre=/usr/bin/docker pull tcnksm/my-service-hook:1.0
ExecStart=/usr/bin/docker run --net=host --name my-service-hook tcnksm/my-service-hook:1.0
ExecStop=/usr/bin/docker stop my-service-hook
```

これも特別なことはしていない．ポイントは，`--net=host`でコンテナを起動するところ，これによりDockerコンテナ内からfleetを実行できるようになる．

あとは，このサービスを起動し，Automted Buildsが終了したらこのホストにPOSTを投げるように設定をすればよい．そうすれば`git push`するだけでコンテナが最新のものに入れ替わる．


### プロキシ

CoreOS以外のホストOSでは，`jwilder/nginx-proxy`コンテナをフロントに置いて，バックのコンテナを切り替えるということをしたが，それが使えるのはシングルホストのみの場合である（`docker.sock`に依存するため）．CoreOSの場合はそれが使えない．

CoreOSの場合は[kelseyhightower/confd](https://github.com/kelseyhightower/confd)を使うのがよい．confdはetcdの値をwatchし，変更があれば，その値とテンプレートをもとに設定ファイルを生成し，コマンドを実行するといったことができる．これを使って，

- プロキシしたいコンテナのホストとポートをetcdに登録するサイドキックコンテナを立てる
- confdを使ってnginxの設定ファイル生成するフロントコンテナを立てる

ということをすれば，サービスを立ちげる度にフロントコンテナにそれが登録され，リクエストがプロキシされるといったことが実現できる．また上述したfleetのデプロイも（ほぼ）Zero Downtimeで実行できる（厳密にBlue-Green deploymentをしたいのであればMailgunの[vulcand](https://github.com/mailgun/vulcand)を使うのがよい）．

## まとめ

DockerHubのAutomated Buildsをフックして最新のDockerコンテナをデプロイする方法について説明した．CoreOS以外のホストOSの場合は，Gopher Academyのブログを見る限りは，落ちることなく運用できているらしい．CoreOSの場合も自分で簡単なサービスを動かしいるが，今のところ問題なく動いている．

最後に鬱陶しいことを挙げておくと，DockerHubを経由すると，Pending地獄に直面してデプロイがめちゃ遅いことがある．またDockerイメージも軽いわけではないので，`docker pull`に時間がかかったりもする．このあたり，Immutableの辛いところなので，良い解法を見つけたいなと思う．











