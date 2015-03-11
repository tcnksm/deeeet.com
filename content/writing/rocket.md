+++
date = "2015-03-12T00:58:54+09:00"
draft = true
title = "CoreOS/rocket v0.3.2の使用感"
+++

## TODO

- イメージの署名について
- Rocketの簡単な動作について

[http://deeeet.com/writing/2015/02/17/docker-bad-points/](http://deeeet.com/writing/2015/02/17/docker-bad-points/)

Rocketはリリースした直後にちょっと触ってそのまま放置していた．App containerの一連のツールとRocketが現状どんな感じかをざっと触ってみる．まだまだ全然使えると思えないが今後差分だけ追えるようにしておく．

なお，今回試した一連のツールをすぐに試せるVagrantfileをつくったので触ってみたいひとはどうぞ．

[https://github.com/tcnksm/vagrant-appc](https://github.com/tcnksm/vagrant-appc)

## 概要

App Container SpecやRocketが登場の経緯は前回書いたのでここでは省略し，これらは一体何なのかを簡単に書いておく．

まず，App Container（appc）Specはコンテナで動くアプリケーションの"仕様"である．なぜ仕様が必要かというと，コンテナという概念は今まで存在したが曖昧なものだったため．namespaceやcgroupを使った..という何となくのものはあったが，統一的なものは存在しなかったため．appc specはOpenかつSecure，Composable，Simpleであることを理念に掲げて作成されている．

appcには仕様だけではなくいくつかのツールも提供されている．例えば，appcの元になるApp Container Image (ACI)の構築と検証を行う`actool`や，DockerイメージからACIをつくる`docker2aci`，Go言語のバイナリからACIをつくる`goaci`などがある．

では，Rocketは何かというと，そのappcを動かす*runtimeの実装の1つ*である．つまりappcとRocketは別のものであり実装は他にも存在する．例えば，現時点ではFreeBSDのJail/ZFSとGo言語で実装された[Jetpack](https://github.com/3ofcoins/jetpack)や，C++のライブラリとして[libappc](https://github.com/cdaylward/libappc)とそれを使ったruntimeである[Nose Cone](https://github.com/cdaylward/nosecone)などがある．

今回はこれらのappc関連ツールとRocketを実際に触ってみる．

## Appc tools

まず，[https://github.com/appc](https://github.com/appc)にあるAppcの一連のツールを触ってみる．

### actoolによるイメージのbuild

`actool`はRootファイルシステムとjsonで既述されるmanifestファイルを基にACIをビルドするツール．ビルドだけではなく，manifestやACIが仕様通りであるかも検証する．

例として，以下のGo言語で書かれてサンプルWebアプリケーションを動かすためのACIを作成する．

"""go
package main

import (
"log"
"net/http"
)

func main()
http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request)
log.Printf("Request from %vn", r.RemoteAddr)
w.Write([](#)byte("Hello from App Container"))
})
log.Fatal(http.ListenAndServe(":5000", nil))
}
"""

ルートファイルシステムを準備する．

"""bash
$ mkdir hello
$ mkdir hello/rootfs
$ mkdir hello/rootfs
"""

サンプルアプリケーションをビルドしてRootFS内に配置する．

"""bash
$ CGO_ENABLED=0 GOOS=linux go build -a -tags netgo -ldflags '-w' -o hello-web
$ mv hello-web hello/rootfs/bin/.
"""

次にイメージのmanifestファイルを作成する．

"""bash
$ cat \<\< EOF \> hello/manifest

"acKind": "ImageManifest",
"acVersion": "0.3.0",
"name": "hello",
"labels": [
](#)"name": "os", "value": "linux",
"name": "arch", "value": "amd64"
],
"app":
"exec": [
](#)"/bin/hello-web"
],
"user": "0",
"group": "0"
}
}
EOF
"""

`actool validate`を使うと仕様通りにmanifestファイルが作成されているかを検証することができる．

"""bash
$ actool -debug validate hello/manifest
hello/manifest: valid ImageManifest
"""

また同じく`actool validate`を使いイメージのレイアウトが仕様通りであるかを検証する．

"""bash
$ actool -debug validate hello
hello: valid image layout
"""

`actool build`でイメージをビルドする（静的リンクでビルドする，go1.4の場合は`-installsuffix`が必要）．

"""bash
$ actool build hello/ hello.aci
"""

`actool validate`でACIが仕様通りであるかを検証する．

"""bash
$ actool -debug validate hello.aci
hello.aci: valid app container image
"""

ちなみにACIはただのtarファイルである．

"""bash
$ tar xvf hello.aci
rootfs
rootfs/bin
rootfs/bin/hello-web
manifest
"""

また[appc/spec](https://github.com/appc/spec)にはACIを実行するruntime（Rocket）を検証するためのACIも提供されている．

"""bash
$ EXECUTOR run ace_validator.aci
"""

### actoolによるイメージのdiscovery

example.com/app -> https://example. com/releases/app.aci

自分で実装するのが良さそう．HTTPS..?

curl https://coreos.com/etcd?ac-discovery=1 | grep meta
<meta name="ac-discovery" content="coreos.com/etcd https://github.com/coreos/etcd/releases/download/{version}/etcd-{version}-{os}-{arch}.{ext}">
<meta name="ac-discovery-pubkeys" content="coreos.com/etcd https://coreos.com/dist/pubkeys/aci-pubkeys.gpg">

metaタグで公開鍵とイメージの場所を伝える．公開鍵はあらかじめ取得しておく．gpg

App name -\> artifact

HTTPS+HTML

Metadata service?
http://AC_META_URL/acMetadata
HMAX verfication https

### docker2aci

actoolによるイメージのbuildは現時点ではしんどい．それに対してDockerはDockerfileで簡単にイメージを作ることができるし，DockerHubには既に多くの良いDockerイメージが存在している．この利点を活かすために[docker2aci](https://github.com/appc/docker2aci)というツールが提供されている．

例えば，Dockerhubにある`crosbymichael/redis`からACIを作成するには以下を実行すれば良い．`crosbymichael-redis-latest.aci`が作成される．

"""bash
$ docker2aci crosbymichael/redis:latest
"""

Dockerのイメージはやはり便利らしく，CloudFoundryのコンテナruntimeであるGardenもDocker imageをRootFSとして利用できるようにしているらしい（参考: [新しいDiegoの仕組み入門](http://www.slideshare.net/jacopen/diego-45603123)）．

ちなみに，逆にDockerでACIをPullできるようにするというPRもある（[https://github.com/docker/docker/pull/10776](https://github.com/docker/docker/pull/10776)）．

"""bash
$ docker pull --format aci coreos.com/etcd:v2.0.0
$ docker run --format aci coreos.com/etcd
"""

が，DockerのCTOのSolomon Hykes氏が「ユーザに何のメリットがあるの？」とかコメントしていて感慨深い．


### goaci

上では自分でRootFSを作ってGo言語のサンプルアプリケーションをビルドするなどしたが，`go get`のようにGo言語のアプリケーションをACIに変換するツールも提供されている．

"""bash
$ acigo github.com/coreos/etcd
"""

`$GOPATH`を書き換えて`go get`を実行している．そして，静的リンクでコンパイルを実行し，デフォルト値で基本的なmanifestファイルを準備してACIのビルドを行っているだけ．

## Rocket

現時点(v0.3.0)でRocketでやれることをやってみる．

### trust, fetch

上述したappcのdiscoveryと署名の仕様に従ってインターネット上からイメージを取得することができる．ここでは例として`coreos.com/etcd`というACIを取得する．

まず，`rkt trust`コマンドで取得するACIの公開鍵を取得する．

"""bash
$ sudo rkt trust --insecure-allow-http --prefix coreos.com/etcd
...
Added key for prefix "coreos.com/etcd" at "/etc/rkt/trustedkeys/prefix.d/coreos.com/etcd/8b86de38890ddb7291867b025210bd8888182190"
"""

次に`rkt fetch`コマンドでACIを取得する．署名も同時にダウンロードして上で取得した公開鍵をつかって署名の検証も行う．

"""bash
$ sudo rkt fetch coreos.com/etcd:v2.0.0
"""

### run

`rkt run`でコンテナを起動する．上で`actool`を使って作成した`hello.aci`を動かすには以下のようにする．

"""bash
$ sudo rkt run hello.aci &
"""

コンテナにアクセスしてみる．

"""bash
$ curl localhost:50000
Hello from App Container
"""

コンテナを殺すには普通にプロセスをkillすればよい（フォアグランドで実行した場合は，`^]`を3回叩けば死ぬ）．

Dockerと比較した場合のRocketの大きな特徴は中央集権デーモンが存在しないことである．Rocketでコンテナをつくればそれは1つのプロセスとして存在することになる．そのためupstartやsystemdといった既存のツールで個々のコンテナプロセスを管理することができる．

ちなみに署名の検証を無視すればDockerHub上のイメージを使うこともできる

"""bash
$ sudo rkt --insecure-skip-verify run docker://redis
"""

### list,status

`rkt list`でコンテナの一覧を確認できる．

"""bash
$ sudo rkt list
UUID                                    ACI             STATE
2bbe6aaa-a41d-43cd-b5b2-ff8058662bb6    hello           active
b1c946f5-bd54-43e6-b241-289077adf12f    coreos.com/etcd inactive
"""

`rkt status`でコンテナの状態（PIDと終了状態）を確認できる．

"""bash
$ sudo rkt status 2bbe6aaa-a41d-43cd-b5b2-ff8058662bb6
pid=21967
exited=false
"""

### gc

`rkt gc`で古いinactiveなコンテナを破棄することができる．`-grace-period `でinactiveからどれだけ時間の経過したものを破棄するかを指定できる．

"""bash
$ sudo rkt gc -grace-period=10s
"""

これをsystemdの`OnCalendar`で定期実行してゴミ捨て場にならないようにする．

### enter

`rkt enter`でコンテナのnamespace内に入ることができる．

"""bash
$ sudo rkt enter 29d47fda-23f5-423f-9457-708d775ee9d9
No command specified, assuming "/bin/bash"
root@rootfs:/#
"""


## 参考

- [http://opensource.com/business/15/2/interview-jonathan-boulle-rocket](http://opensource.com/business/15/2/interview-jonathan-boulle-rocket)
- http://www.socallinuxexpo.org/sites/default/files/presentations/appc%20%2B%20rocket%20(SCALE%2013x).pdf



