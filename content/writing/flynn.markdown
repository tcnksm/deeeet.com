---

title: 'DockerによるマルチホストのPaaS flynnの概要とそのアーキテクチャー'
date: 2014-07-07
comments: true
categories: docker
---

<script async class="speakerdeck-embed" data-id="3e5fba00e59601314f771288f3080752" data-ratio="1.77777777777778" src="http://speakerdeck.com/assets/embed.js"></script>

["flynnの時代"](https://speakerdeck.com/tcnksm/flynnfalseshi-dai-number-dockerjp)

["Docker meetup tokyo #3"](http://connpass.com/event/6998/)で発表してきた．内容は，Dockerの応用の１つであるOSSでPaaSをつくる[flynn](https://flynn.io)というプロジェクトの概要とそのアーキテクチャーの紹介．このflynnというプロジェクトの中には，Dockerの面白い使い方がたくさん詰まってるため，今後Dockerを使う人が，その応用の際の参考になればという思いで紹介させてもらった．

今回の発表のために資料を集めまくり，理解できない部分は出来る限りコードも読んだ．発表スライドの補完にもなると思うので，そのメモ書き（一応体裁は整えた）を公開しておく．

## デモ

以下は，簡単なデモ．

{%img /images/post/flynn.gif %}

やっていることは以下．

- nodeのアプリケーションをデプロイ
- ルーティングの追加
- スケール

コマンドを含めた詳しい解説は以下で解説する．

## 前提知識 (Herokuの動作)

まず，前提知識としてPaaS (ここではHeroku) がどのように動作しているのかをそのワークフローとともにまとめておく．

```bash
$ heroku create
```
- Stackと呼ばれるベースとなるOSを準備する
    - e.g., Cedar stack

```bash
$ git push heroku master
```

1. アプリケーションがデプロイされる
1. slug compilerでアプリケーションをビルドしてslugを作成する
    - [slug compiler](https://devcenter.heroku.com/articles/slug-compiler)
        - 各言語のBuildpackの集合
        - 依存関係のインストール
            - e.g., RubyならGemfileをもとにrubygemsをインストール
    - [slug](https://devcenter.heroku.com/articles/platform-api-deploying-slugs)
        - ソースと依存ライブラリ，言語のランタイムを含んだ圧縮されたファイルシステム(SquashFS)
1. アプリケーションの実行環境（Dyno）を準備する
    - [Dyno](https://devcenter.heroku.com/articles/dynos)
        - **LXC**をベースにしたContainer環境
1. Dynoにslugをロードする
1. Procfileをもとにアプリケーションを起動する
    - [Procfile](https://devcenter.heroku.com/articles/procfile)
        - プロセスの起動コマンドを記述
            - e.g., `web: bundle exec rails server -p $PORT`

![](https://s3-eu-west-1.amazonaws.com/jon-assettest/dynos.jpg)

```bash
$ heroku ps:scale web=2
```

- プロセスモデル（上図を参考）に基づき`web`プロセスを増やす
- 実行Dynoの数を増やす


```bash
$ heroku run bash
```

- Dynoにログインする（一度限りのプロセスを実行する）
- 新しくDynoが準備され，最新のSlugが読み込まれる
- 変更は他の起動中のDynoに影響を与えない

Herokuの重要な要素はDynoとslugであることがわかる．これをDockerに置き換えるとslugはDockerイメージに，DynoはDockerコンテナと考えることができる．

## flynnとは何か？

[flynn](https://flynn.io)はDockerによるPlatform-as-a-Service．開発には，dokkuの作者である[@progrium](https://github.com/progrium)氏も関わっている．OSSかつクラウドファンディングを受けて開発が進められている．実装はGo言語．

### flynnが与えてくれるもの

flynnのトップページには，「The product that ops provides to developers」が掲げられている．flynnは開発者に対して以下のようなものを可能にしてくれる．

- 簡単かつ一貫した方法でデプロイできる
    - e.g., git pushで，Dockerコンテナで
- どんな言語/フレームワークでも動かせる
- 簡単にスケールできる
    - 新たにノードを追加するだけで

### 他のDockerによるOSSのPaaS

DockerによるOSSなPaaSプロジェクトは他にもある．例えば，[dokku](https://github.com/progrium/dokku)や[Deis](http://deis.io/)が挙げられる．

[dokku]()は，100行のbashで書かれたシンプルなPaaS．dokkuの内部実装は["Inside Dokku in 5 minutes"](http://banyan.me/slides/20140116/slides.html)が詳しい．flynnと比較すると，dokkuはシングルホストが前提となっているが，flynnはマルチホストに対応している点が異なる．分散システムの上にのったdokkuがflynnであると考えることもできる．

[Deis](http://deis.io)は，CoreOSを用いたマルチホストのDocker PaaS．Deisについては，DockerCoon14の発表["Deis: Evolution of a Docker PAAS"](http://gabrtv.github.io/deis-dockercon-2014/#/)が詳しい．flynnとDeisでできることはほとんど変わらない．敢えて比較するなら，DeisはCoreOSが前提であるが，flynnはOSを限定しない（現状はUbuntuが使われているが）．

## flynnのアーキテクチャーの概要

flynnのアーキテクチャーは，シンプルで理解しやすいようにデザインされている．ほとんどのコンポーネントがDockerコンテナとして動作する．すべてがコンテナで動作するため，flynnにデプロイされるサービスやアプリケーションは，flynnを構成するコンポーネントと同様であると見なすこともできる．また，コンポーネントはモジュラー的に実装されているため，再利用，変更，切り替えが容易になっている（すべてがDockerコンテナで動作する様子は，[flynn/flynn-demo](https://github.com/flynn/flynn-demo)の[Vagrantfile](https://github.com/flynn/flynn-demo/blob/master/Vagrantfile)を見るとわかる）．

flynnのアーキテクチャーは大きく分けて2つのレイヤーに分けることができる．

- **layer0 (The Grid)**
    - 低位なリソースフレームワーク層
    - この上に載る全てのアプリケーションやサービスの基礎
    - コンテナ管理, サービスディスカバリー, タスクスケジューラー, 分散型KVS（etcd）
- **layer1**
    - 高位なコンポーネント層
    - PaaSの基本的な機能
        - e.g., Git-receive，Heroku Buildpack，DB，HTTP Routing

## layer0 (The Grid)

layer0は[Apache Mesos](http://mesos.apache.org/)やGoogleの[Omega](http://eurosys2013.tudos.org/wp-content/uploads/2013/paper/Schwarzkopf.pdf)の影響を受けた，リソースフレームワーク層．以下の2つコンポーネントから成る．

- [flynn/discoverd](https://github.com/flynn/discoverd)
    - サービスディスカバリー
- [flynn/flynn-host](https://github.com/flynn/flynn-host)
    - コンテナ管理，タスクスケジューラー

この2つのコンポーネントは全てのホストで起動する．

### flynn/discoverd

discoverdはサービスディスカバリーを行う．具体的には，ホストのクラスタを構築し，メンバーの参加/離脱イベントを他のホストのメンバーに通知する等を行う．

discoverdには専用のクライアントである，[flynn/go-discoverd](https://github.com/flynn/go-discoverd)がある．このクライアントを通して，クラスタへのホストの登録/削除や，各ホストのアドレスやメタ情報，新しいホストの参加/離脱のイベントの購読を行う．

現在バックエンドには，CoreOSのetcdを利用している．これは，ZooKeeperなどに入れ替え可能にしていくとのこと．

### flynn/flynn-host

flynn-hostは，HTTP API経由でホストのDockerコンテナの管理を行う．flynn-hostには，リーダーとそれ以外という役割がある．リーダーは，クラスタ全体のホストの一覧とそれらが実行しているジョブの管理や新しいジョブの登録/依頼を行う．それ以外は，リーダから依頼されたジョブをDockerコンテナで実行/停止，実行中のジョブ，指定されたジョブの情報の返答を行う．

flynn-hostは，内部にGoogle Omegaの影響を受けたタスクスケジューラフレームワークである，[flynn/flynn-host/sampi](https://github.com/flynn/flynn-host/tree/master/sampi)を持っている．

## layer1

layer1には基本的なPaaSの機能がくる．また，実際にユーザにデプロイされるアプリケーションもlayer1に存在する（ユーザランドとしてのlayer2が存在しないのは，実際にデプロイされるアプリケーションとlayer1のコンポーネントに技術的な差がないため）．layer1のコンポーネントは以下．

- [flynn-controller](https://github.com/flynn/flynn-controller)
    - Flynn上で動いているアプリケーションをHTTP APIで管理する
    - HerokuのPlatfrom APIにインスパイアを受けている
- [flynn-cli](https://github.com/flynn/flynn-cli)
    - flynn-controller (HTTP API) のコマンドラインクライアント    
- [flynn-bootstrap](https://github.com/flynn/flynn-bootstrap)
    - 設定ファイルに基づきLayer1を起動する
- [flynn/gitreceived](https://github.com/flynn/gitreceived)
    - git pushをうけることに特化したSSHサーバ
    - git pushを契機にauthcheckerスクリプトとreceiverスクリプトを動かす
- [flynn/flynn-receive](https://github.com/flynn/flynn-receive)
    - gitreceivedをラップして認証とアプリケーションのビルド/実行を行う
- [flynn/slugbuilder](https://github.com/flynn/slugbuilder)
    - Dockerとbuildpackを使ってHeroku的なslugを作成する
- [flynn/slugrunner](https://github.com/flynn/slugrunner)
    - slugbuilderで作成されたslugを実行する
- [strowger](https://github.com/flynn/strowger)
    - HTTP/TCP のルータ（リバースプロキシ）
- [shelf](https://github.com/flynn/shelf)
    - シンプルなHTTPのファイルサービス
    - HTTPを通してファイルの読み出し／書き込み，削除のインターフェースを提供する
    - シンプルなS3
- [flynn-postgres](https://github.com/flynn/flynn-postgres)
    - flynn専用のPostgreSQL
    - 今後他のDBにも対応する予定
- [Taffy](https://github.com/flynn/taffy)
    - レポジトリをpullしてflynnにデプロイする

### flynn/gitreceived

gitreceivedはgit pushを受けるこをに特化したSSHサーバ．アプリケーションがgit pushによりデプロイされると，gitreceivedは以下を行う．

1. 認証キーとユーザ名を引数に`authchecker`スクリプトの実行
1. pushされたアプリケーションのソース(.tar)を引数に`receiver`スクリプトの実行

flynnはこれをflynn-receiveでラップして使っている．flynn-receiveでは，`receiver`スクリプトで以下をflynn-controllerに要請している．

1. slugbuilderでアプリケーションのビルド (slugの作成)
1. slugをslugrunnerで実行

### flynn/slugbuilder

slugbuilderはDockerとHerokuのbuildpackを使ってHeroku的なslugを作成する．具体的には以下を実行している．

```bash
$ id=$(git archive master | docker run -i -a stdin flynn/slugbuilder) 
$ docker wait $id
$ docker cp $id:/tmp/slug.tgz . # コンテナ内のslug.tgzを取り出す
```

flynn/slugbuilderというDockerコンテナにアプリケーションのソースを標準入力から突っ込み，コンテナ内部でHerokuのbuildpackを使ったビルドを実行する．ビルドが終わったら，`docker cp`で生成物を取り出す．

### flynn/slugrunner

slugrunnerはslugbuilderで作成された（Heroku的な）slugを実行する．具体的には以下を実行している．

```bash
$ cat myslug.tgz |
    docker run -i -a stdin -a stdout flynn/slugrunner start web
```

flynn/slugrunnerというDockerコンテナにslugを標準入力から突っ込み，`Procfile`に基づくwebプロセスを実行する．

### flynn/strowger

strowgerはTCP/HTTP ルータで，複数のslugrunnerに対するランダムロードバランシングのためのリバースプロキシとして動作する．サービスディスカバリーがバックで動いており，背後で何が起動したかを常に監視する．

HAProxyやnginxと比較した利点は，サービスディスカバリーをネイティブで持っていることで，動的な設定変更が可能である点（HAProxyやnginxは設定変更で新しくプロセスを作成する必要がある）．

## flynnの操作

flynnは専用のコマンドクライアントである[flynn/flynn-cli](https://github.com/flynn/flynn-cli)を使って操作する．

まず，サーバを登録する．以下を実行すると設定が`~/.flynnrc`に書き込まれる．

```bash
$ flynn server-add \
    -g lxr.flynnhub.com \ #githost
    -p XXXXXXXXXXXXXXXX \ # SHA256 of the server's TLS cert
    "flynn-demo" \ # server-name
    https://lxr.flynnhub.com \ # server url
    xxxxxxxxxxxxxxxxxxxxxxxx # key
```

次に，SSH-KEYを登録する．

```bash
$ flynn key-add
```

アプリケーションの作成は以下．git remoteを追加しつつ，flynn-controllerにそれを伝えている．

```bash
$ flynn create node-demo
```

アプリケーションのデプロイはHerokuと同様にgitを使う．これによりgitreceivedでアプリケーションのソースコードが受け取られ，slugbuilderでビルド，slugrunnerで実行，が行われる．

```bash
$ git push flynn master
```

ルーティングを確認するには以下．

```bash
$ flynn routes
ROUTE                            SERVICE        ID
http:node-demo.lxr.flynnhub.com  node-demo-web  http/65ae6884514622f0e7dcd85f71724814
```

新しいルーティングを追加するには以下．

```bash
$ flynn route-add-http docker-meetup.lxr.flynnhub.com
$ flynn routes
ROUTE                                SERVICE        ID
http:docker-meetup.lxr.flynnhub.com  node-demo-web  http/8aecdfad5adb70ddff6a2ac32b79da4d
http:node-demo.lxr.flynnhub.com      node-demo-web  http/65ae6884514622f0e7dcd85f71724814
```

不要になったルートはそのIDを使って削除する．

```bash
$ flynn route-remove http/baf06246e4ec7f3486a89a2e313205ba
```

プロセスを確認する (`docker ps`)．

```bash
$ flynn ps
```

ログはプロセスのIDで確認する (`docker log`)．

```bash
$ flynn log e4cffae4ce2b-8cb1212f582f498eaed467fede768d6f
```

スケールは以下で行う．これは単純にDockerコンテナの数を増やしているだけ．

```bash
$ flynn scale web=8
```

slug (コンテナ) に対してを直接コマンドの実行を要請することもできる．例えばbashを起動してコンテナの内部に入ることもできる．

```bash
$ flynn run bash
```

## 最後に

今回Docker meetupで発表の機会をもうけて頂いた[@stanaka](https://twitter.com/stanaka)さん，[@kazunori_279](https://twitter.com/kazunori_279)さんありがとうございました．他のスタッフのかたもありがとうございました．

帰りにゲストの[@philwhln](https://twitter.com/philwhln)を駅まで送って行き，Solomon Hykes氏によるlibswarm，Mitchell Hashimoto氏によるConsulのインタビューなどの話を聴けたのは良い思い出．

## 参考文献

- ["Flynn - Open source Platform as a Service powered by Docker"](https://flynn.io/)
- ["The Start of the Age of Flynn"](http://progrium.com/blog/2014/02/06/the-start-of-the-age-of-flynn/)
- ["Unveiling Flynn, a new PAAS based on Docker"](http://jpetazzo.github.io/2013/11/17/flynn-docker-paas/)
- ["5by5 | The Changelog #99: Flynn, Tent, open source PaaSes and more with Jeff Lindsay and Jonathan Rudenberg"](http://5by5.tv/changelog/99)
- ["5by5 | The Changelog #115: Flynn updates with Jonathan Rudenberg and Jeff Lindsay"](http://5by5.tv/changelog/115)
- ["Container Independence"](https://flynn.io/blog/container-indepedence)
- ["Bazooka: Continuous Deployment at SoundCloud - Google Slides"](https://docs.google.com/presentation/d/1ni1BFiVMTLN_8q34si-qPfl0F6w2W3oPVKqSMfcs_XA/edit#slide=id.p)
- ["Deis: Evolution of a Docker PAAS"](http://gabrtv.github.io/deis-dockercon-2014/#/)
- ["Flynn vs. Deis: The Tale of Two Docker Micro-PaaS Technologies | CenturyLink Labs"](http://www.centurylinklabs.com/flynn-vs-deis-the-tale-of-two-docker-micro-paas-technologies/)
- ["Inside Dokku in 5 minutes"](http://banyan.me/slides/20140116/slides.html)
- ["Discoverd - r7km/s"](http://r7kamura.github.io/2014/06/24/discoverd.html)
- ["Flynn Host - r7km/s"](http://r7kamura.github.io/2014/06/26/flynn-host.html)
- ["Beyond Flynn, or Flynn-as-a-Worldview"](http://progrium.com/blog/2014/07/01/beyond-flynn-or-flynn-as-a-worldview/)





