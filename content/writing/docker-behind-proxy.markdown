---

title: 'Proxy環境下でDockerを動かす'
date: 2014-07-01
comments: true
categories: docker
---

Docker1.0がリリースされたことで，プロダクションレディ感もあり，企業でもDockerを使う機運が高まっている．でも，実際はまだまだ本番環境ではなく，テスト環境などで使われることが多い．

Dockerによるテスト環境構築でまず思い浮かぶのは[dokku](https://github.com/progrium/dokku)．dokkuはDockerを使ったbash実装のPaaS．プライベートPaaSを持たない，かつHerokuなどを気軽に使えない企業のテスト環境として今後使われる機会がありそう．

ただ，個人での利用とは違い企業などでDockerやdokkuを使う場合は，Proxyに阻まれることがある（というか今日阻まれた）．ので，Proxy環境下でのDocker，dokkuの使い方を簡単にまとめておく．まず，Docker全般に関して，次にdokku特有の問題についてProxyの問題を解決しなければならない状況とその解決方法を説明する．

## Proxy環境下でのDocker

Dockerを使う中で，外部ネットワークとのやりとりが必要になるのは，以下の3つの場合が考えられる．

- DockerHub（Docker Index）とのやりとり
- Dockerfile
- Dockerコンテナ

これらの解決方法をそれぞれ説明する．

### DockerHub（Docker Index）

まずは，DockerHub（Docker Index）とのやりとりを行う場合．例えば，`docker pull`などでイメージを取得する場合など．

この場合は，dockerデーモンを起動する際に`http_proxy`環境変数を設定すればよい．例えば，Ubuntuの場合は，Upstartの設定ファイル`/etc/default/docker`に`export http_proxy=<HTTP_PROXY>`を記述すればよい．

### Dockerfile

次に，Dockerfileで外部ネットワークとやりとりを行う場合．例えば，`apt-get`などでパッケージをインストールする場合など．

この場合は，`ENV`コマンドを使ってDockerfile内で環境変数を設定すればよい．

```bash
FROM ubuntu:13.10
ENV http_proxy <HTTP_PROXY>
ENV https_proxy <HTTPS_PROXY>
RUN apt-get -y update
```

### Dockerコンテナ

最後は，`docker run`でコンテナを起動した後に，コンテナ内から外部ネットワークとやりとりをする場合．例えば，サードパーティー製のDockerイメージをそのまま使う場合など．

この場合は，`-e`オプションを使って`http_proxy`環境変数を設定してコンテナを起動すればよい．

```bash
$ docker run -d \
    -e "http_proxy=<HTTP_PROXY>" \
    progrium/buildstep /build/builder
```

## Proxy環境下でのdokku

dokkuのインストール以外で，dokkuが外部ネットワークとやりとりするのは以下の2カ所．

- dokku専用のDockerイメージ[progrium/buildstep](https://github.com/progrium/buildstep)のpull
- Buildpackを使ったアプリケーションのビルド

1つ目は上記のDockerHubとのやりとりで示した方法で解決できる．2つ目は若干のハックが必要になる．

dokkuはHerokuと同様にアプリケーションのビルドにBuildpackを使用し，依存パッケージ等のインストールを行う．このビルドは，dokku専用のDockerイメージ[progrium/buildstep](https://github.com/progrium/buildstep)を使い，そのコンテナ内で実行される．よって，そのときにProxyが設定されている必要がある．これは上記のDockerコンテナで示した方法で解決できる．

dokkuは，bash実装なので，`/usr/local/bin/dokku`を直接編集してしまえばよい．編集するのは，`build/builder`コマンドと共にコンテナを起動するところ．そこで`-e`オプションを使って環境変数を設定すればよい．

具体的には，

```bash
id=$(docker run -d -v $CACHE_DIR:/cache $IMAGE /build/builder)
```

を以下のようにする．

```bash
id=$(docker run -d -v $CACHE_DIR:/cache -e "http_proxy=<HTTP_PROXY>" -e "https_proxy=<HTTP_PROXY>" $IMAGE /build/builder)
```

でも，ソースいじるのはあれだから良い方法があれば教えてください．







