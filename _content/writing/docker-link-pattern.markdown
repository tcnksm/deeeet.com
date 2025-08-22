---

title: 'Dockerコンテナ接続パターン (2014年冬)'
date: 2014-12-01
comments: true
categories: docker
cover_image: docker.jpg
---

本記事は[Docker Advent Calendar 2014](http://qiita.com/advent-calendar/2014/docker)の1日目の記事です．

Dockerによるコンテナ化はリソース隔離として素晴らしい技術である．しかし，通常は1つのコンテナに全ての機能を詰め込むようなことはしない．マイクロサービス的にコンテナごとに役割を分け，それらを接続し，協調させ，全体として1つのサービスを作り上げるのが通常の使い方になっている．

コンテナ同士の接続と言っても，シングルホスト内ではどうするのか，マルチホストになったときにどうするのかなど様々なパターンが考えられる．Dockerが注目された2014年だけでも，とても多くの手法や考え方が登場している．

僕の観測範囲で全てを追いきれているかは分からないが，現状見られるDockerコンテナの接続パターンを実例と共にまとめておく．

なお今回利用するコードは全て以下のレポジトリをcloneして自分で試せるようになっている．

- [tcnksm/docker-link-pattern](https://github.com/tcnksm/docker-link-pattern)

## 概要

本記事では以下について説明する．

- link機能（シングルホスト）
- fig（シングルホスト）
- Ambassadorパターン（マルチホスト）
- 動的Ambassadorパターン（マルチホスト）
- weaveによる独自ネットワークの構築（マルチホスト）
- Kubernetes（マルチホスト）


## 事前知識

事前知識として，Dockerがそのネットワークをどのように制御しているかを知っていると良い．それに関しては以下で書いた．

- [Dockerのネットワークの基礎 | SOTA](http://deeeet.com/writing/2014/05/11/docker-network/)

## 利用する状況

以下ではすべてのパターンを，同じ状況で説明する．redisコンテナ（`crosbymichael/redis`）を立て．それにresdis-cliコンテナ（`relateiq/redis-cli`）で接続するという状況を考える．

## link機能（シングルホスト）

まず，基礎．DockerはLinksというコンテナ同士の連携を簡単に行う仕組みを標準でもっている．これは，`--link <連携したいコンテナ名>:<エイリアス名>`オプションで新しいコンテナを起動すると，そのコンテナ内で連携したいコンテナのポート番号やIPを環境変数として利用できるという機能である．

今回の例でいうと，まず，`redis`という名前でredisコンテナを立てておく．

```bash
$ docker run -d --name redis crosbymichael/redis
```

これに接続するには，以下のようにする．

```bash
$ docker run -it --rm --link redis:redis relateiq/redis-cli
redis 172.17.0.42:6379> ping
PONG
```

`relateiq/redis-cli`コンテナの起動スクリプトは以下のようになっている．

```bash
# !/bin/bash

if [ $# -eq 0 ]; then
/redis/src/redis-cli -h $REDIS_PORT_6379_TCP_ADDR -p $REDIS_PORT_6379_TCP_PORT
else
/redis/src/redis-cli "$@"
fi
```

引数なしで起動すると，`relateiq/redis-cli`は環境変数，` $REDIS_PORT_6379_TCP_ADDR`に接続しようとする．`--link redis:redis`でこれを起動することで，この環境変数が設定され，接続できる．

link機能については以下に詳しく書いた．

- [Dockerコンテナ間のlink，database.ymlの書き方](http://deeeet.com/writing/2014/03/20/docker-link-container/)

## fig（シングルホスト）

link機能は便利だが，利用するコンテナが多くなったときに毎回それらのコマンドを叩くのは億劫になる．それを解決するのが，Docker社に買収されたOrchard社の[fig](http://www.fig.sh/)である．

figは，シングルホスト向けのコンテナ管理ツールである．`fig.yml`という1つのyamlファイルに利用するコンテナや，その起動コマンド，linkしたいコンテナ，解放しておきたいportなどを定義し，`fig up`というコマンドを叩くだけで全てのコンテナを一気に立ち上がり，接続などをよしなにやってくれる．

例えば，今回の例だと，以下のような`fig.yml`を準備する．

```yaml
cli:
  image: relateiq/redis-cli
  links:
    - redis
redis:
  image: crosbymichael/redis
```

あとは，以下のコマンドを叩くだけ（`run`はone-offコマンドを実行する）．

```bash
$ fig run --rm cli
redis 172.17.0.42:6379> ping
PONG
```

figを使ってプロダクション運用をしている例は既にある．ローカルでプロダクションと全く同じ状況を一瞬で作れるのが気に入られている．

- [Docker in dev and in production – a complete and DIY guide | Technology Against You](http://davidmburke.com/2014/09/26/docker-in-dev-and-in-production-a-complete-and-diy-guide/)
- [Docker Global Hack Day: Fig Demo'd by Daniel Nephin of Yelp](https://www.youtube.com/watch?v=bYfwFkeeUL4)

ちなみに，今年のDocker GlobalHackDayの優勝はfigのマルチホスト対応だった（まだPRはマージされてないっぽいが…）．

- [Enable Fig to deploy to different docker servers in one time](https://www.youtube.com/watch?v=D3-tvQRRKBc)
- [Enable services to use different Docker Hosts #607](https://github.com/docker/fig/pull/607)

### 参考

- [Orchestrating Docker containers in production using Fig | Docker Blog](http://blog.docker.com/2014/08/orchestrating-docker-containers-in-production-using-fig/)
- [Docker1.3版 boot2docker+fig入門 - Qiita](http://qiita.com/toritori0318/items/190fd2dad2bf3ce38b88)
- [OS Xでfigを利用してDockerのコンテナを操作する](http://blog.kenjiskywalker.org/blog/2014/10/25/osx-fig-docker-access-container/)


## Ambassadorパターン（マルチホスト）

シングルホストで全てのコンテナを運用するというのは大規模になるときつい．普通はホストを分散させる．Dockerはシングルホストでは強いが，マルチホストになると，とたんに難易度が上がる．実際，今年はDockerに関していろいろツールが出たが，マルチホストでいかにDockerコンテナをオーケストレーションするかを解決するツールが多かったように思える．

その中でも一番シンプルな方法として，Dockerの公式ドキュメントでも紹介されているのが，[Ambassadorパターン](http://docs.docker.com/articles/ambassador_pattern_linking/)である．これはトラフィックを別ホストへforwardすることに特化したコンテナ（`svendowideit/ambassador`）を立てる方法である．今回の例でいうと以下のように接続する．

```bash
(redis-cli) --> (ambassador) ---network---> (ambassador) --> (redis)
```

redis-cliコンテナとambassadorコンテナ，redisコンテナとambassadorコンテナはdockerのlink機能で接続し，ambassadorコンテナはトラフィックをネットワーク越しにフォワードする．

まず，redisコンテナを動かすホスト（IPは`192.168.1.52`とする）では，以下の2つのコンテナを立てる．

```bash
$ docker run -d --name redis crosbymichael/redis
$ docker run -d --link redis:redis --name redis_ambassador -p 6379:6379 svendowideit/ambassador
```

そして別ホストから以下を実行し，そのRedisコンテナに接続する．

```bash
$ docker run -d --name redis_ambassador --expose 6379 -e REDIS_PORT_6379_TCP=tcp://192.168.1.52:6379 svendowideit/ambassador
$ sudo docker run -i -t --rm --link redis_ambassador:redis relateiq/redis-cli
redis 172.17.0.160:6379> ping
PONG
```

これはシンプルだが，Redisコンテナを再起動したら，Ambassadorも起動して..など，運用を考えるとしんどそう．また，結局redisコンテナがどのホストで動いているかを意識する必要があり，ホストの数が膨大になったときにしんどくなる未来が見える．

## 動的Ambassadorパターン（マルチホスト）

では，ホストの数が膨大になり，接続したいコンテナがどのホストで動いているかを意識しなくても良くするにはどうしたら良いか．

その1つの解法としては，`etcd`のような分散Key-Valueストアを利用し，動的なAmbassadorパターンを作り上げる方法がある．つまり以下のようなことをする．

- 接続される側は接続情報をetcdに書き込み続けるコンテナを立てる
- 接続する側はその情報を読み込み続ける動的なambassadorコンテナを立てる

これにより，ホストの変更や増減を意識する必要がなくなる．今回の例を図にすると以下のようになる．

![https://coreos.com/assets/images/media/etcd-ambassador-flow.png](https://coreos.com/assets/images/media/etcd-ambassador-flow.png)

[https://coreos.com/assets/images/media/etcd-ambassador-flow.png](https://coreos.com/assets/images/media/etcd-ambassador-flow.png)

これは少し複雑なので別で記事を書いた．

- [CoreOSクラスタ内のDockerコンテナの動的リンク | SOTA](http://deeeet.com/writing/2014/11/26/coreos-etcd-docker-link/)

CoreOSを使っているのは標準でetcdが使えること，fleetによるコンテナの管理が楽であるからだが，`etcd`のような分散Key-Valueストアが使えればどんなプラットフォームでも実現可能な話である．

Dokkuの作者である[Jeff Lindsay](https://twitter.com/progrium)氏が，[progrium/ambassadord](https://github.com/progrium/ambassadord)とういうツールを作っている．これはetcd+ConsulでDNSベースでこの動的Ambassadorを実現する手法であり，これも良さそう．

## weave（マルチホスト）

一方で，Docker専用の仮想ネットワーク（オーバーレイネットワーク）を構築してしまおうという流れもある．あらゆるコンテナを同一ネットワーク上に存在しているかように扱えるようにし，portマッピングやlinkなどを考慮しなくてもよくする．

その中で有名なのが[zettio/weave](https://github.com/zettio/weave)である．weaveは，

- `weave`コンテナというルータ用のコンテナを立てる
- 専用の仮想ブリッチを作成する
- 全てのDockerコンテナに専用のvethインターフェースを作成する

ということをして，専用のネットワークを構築する．

![https://github.com/zettio/weave/raw/master/docs/deployment.png?raw=true](https://github.com/zettio/weave/raw/master/docs/deployment.png?raw=true)

[https://github.com/zettio/weave/raw/master/docs/deployment.png](https://github.com/zettio/weave/raw/master/docs/deployment.png?raw=true)

実際に使ってみる．まず，weaveネットワークを構築する．あるホスト（IPは`192.20.20.11`とする）で以下を実行する．

```bash
$ sudo weave launch
```

次に別のホストから上のホストを指定してweaveネットワークを立てる．

```bash
$ sudo weave launch 192.20.20.11 
```

これでweaveルータが立ち上がり，ネットワークは構築できた．あとは，CIDER形式でサブネットワークを指定してコンテナを立てればよい．

まず，以下のようにredisコンテナを立てる．

```bash
$ sudo weave run 10.0.1.1/24 -d crosbymichael/redis
```

次に別のホストからは以下のようにredis-cliコンテナを立てて接続する．

```bash
$ C=$(sudo weave run 10.0.1.2/24 -i -t relateiq/redis-cli -h 10.0.1.1)
$ docker attach $C
redis 10.0.1.1:6379> ping
PONG
```

ただ上の例のように直接redisコンテナやredis-cliコンテナを立てるような使い方は違っていて，Ambassadorコンテナを挟むのが良い使いかたかなと思う．

### 参考

 - [Weaveを試してみた - SlideShare](http://www.slideshare.net/jacopen/weave-40871981)
- [複数のDockerサーバで独自ネットワークを構築する「Weave」を試す！ - さくらのナレッジ](http://knowledge.sakura.ad.jp/tech/2522/)
- [ZettioがDocker用ネットワークシステムのWeaveをリリース](http://www.infoq.com/jp/news/2014/09/zettio_releases_weave)

## Kubernetes (マルチホスト)

Dockerコンテナの管理として最も注目を浴びているのが[GoogleCloudPlatform/kubernetes](https://github.com/GoogleCloudPlatform/kubernetes)である．コンテナの接続という視点でみると，Kubernetesは，Serviceというコンポーネントがコンテナへのアクセスを可能にする．Kubertetesは複数のコンテナをPodという単位でまとめて管理するが，それらへのラウンドロビンや環境変数による他Podからの接続を担うのがServiceである．

![](https://github.com/GoogleCloudPlatform/kubernetes/raw/master/docs/services_detail.png)

[https://github.com/GoogleCloudPlatform/kubernetes/raw/master/docs/services_detail.png](https://github.com/GoogleCloudPlatform/kubernetes/raw/master/docs/services_detail.png)

Serviceを実現するため，Kubernetesはweaveと似たようなことをしている．つまり，ホストごとにサブネットワークをアサインし（例えば，ホストAには10.0.1.0/24を，ホストBには10.0.2.0/24）ことで，ポートマッピングの複雑さを低減している．

で，これはGCEでしか使えなかったが，このネットワークモデルを他のプラットフォームでも使えるようにしたのが，[coreos/flannel](https://github.com/coreos/flannel)である．これを以下のようなモデルで実現している．

![https://github.com/coreos/flannel/raw/master/packet-01.png](https://github.com/coreos/flannel/raw/master/packet-01.png)

[https://github.com/coreos/flannel/raw/master/packet-01.png](https://github.com/coreos/flannel/raw/master/packet-01.png)

flannelでは，まずそれぞれのホストにどのようなレンジでIPをアサインするかを設定する．例えば，10.100.0.0/16を使い，それぞれの/24のサブネットをアサインする．するとホストAは10.100.5.0/24，ホストBは10.100.18.0/24といったネットワークがアサインされる．flannelはこれらの情報をetcdに保存しており，実際のIPとのマッピングを管理する．

.. ただKubernetesはまだまだ絶賛試し中なので，また別の記事を書きたいなと思う．

### 参考

- [Introducing flannel: An etcd backed overlay network for containers](https://coreos.com/blog/introducing-rudder/)

## まとめ

ざっとここ1年のトレンドを紹介した．まとめると，現状で一番良いモデルは，複数ホストになっても，それらの存在を意識せず，つまり，Datacentar as a computer的にコンテナの接続，デプロイができるのが良い．

なので，KubernetesとCoreOSであるなーと思う．他にもいろいろツールは出てるが，ガチで使うならこの2つに任せた！って感じだ．








