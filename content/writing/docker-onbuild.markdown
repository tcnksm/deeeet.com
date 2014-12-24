---

title: 'DockerfileのONBUILD'
date: 2014-03-21
comments: true
categories: docker
---

Docker 0.8において`ONBUILD`というDockerfile用のコマンドが導入された．0.8ではOSXのdocker clientが脚光を浴びたが，この`ONBUILD`はかなり強力な機能．リリースノートは[こちら](http://blog.docker.io/2014/02/docker-0-8-quality-new-builder-features-btrfs-storage-osx-support/)．`ONBUILD`の公式ドキュメントは[こちら](http://docs.docker.io/en/latest/reference/builder/#onbuild)．

`ONBUILD`を使うと，次のビルドで実行するコマンドをイメージに仕込むことができるようになる．つまり，ベースイメージに`ONBUILD`によるコマンドを仕込み，別のDockerfileでそのベースイメージを読み込みビルドした際に，そのコマンドを実行させるということが可能になる．要するに，`親Dockerfile`のDockerfileコマンドを`子Dockerfile`のビルド時に実行させることができる機能．

これは，アプリケーション用のイメージを作るときや，ユーザ特有の設定を組み込んだデーモン用のイメージを作るときなどに有用になる．また，オリジナルのHerokuのBuildpack的なものを作ることもできる．

言葉では伝えられないので簡単に動作例を示す．例えば，以下のような`Dockerfile.base`を準備する．

```bash
# Docekerfile.base
FROM ubuntu
ONBUILD RUN echo "See you later"
```

これを`tcnksm/echo_base`という名前でビルドする．

```bash
$ docker build -t tcnksm/echo_base - < Dockerfile.base
Step 0 : FROM ubuntu
Pulling repository ubuntu
...
f323cf34fd77: Download complete
---> 9cd978db300e
Step 1 : ONBUILD RUN echo "See you later"
---> Running in 9e42ede94d60
---> e18fdd8d9fa8
```

`RUN echo`は実行されていない．

次に，この`tcnksm/echo_base`を基にした別のイメージを作成する`Dockerfile`を準備する．

```bash
FROM tcnksm/echo_base
```

`tcnksm/echo`という名前でビルドする．

```bash
$ docker build -t tcnksm/echo .
Uploading context 3.584 kB
Uploading context
Step 0 : FROM tcnksm/base
# Executing 1 build triggers
Step onbuild-0 : RUN echo "See you later"
---> Running in cddf3cf85ff8
See you later
---> 9f0189c1e902
---> 9f0189c1e902
Successfully built 9f0189c1e902
```

ベースイメージ`tcnksm/echo_base`で仕込んだ`RUN echo ..`が実行された．これが`ONBUILD`の機能．

では，実際の開発プロセスにおいてどのように使えるか．

## Apache base image

/var/www以下のhtdocsを表示する単純なDockerアプリーションを作るとする．この場合`Dockerfile`には，apacheのインストール，Apacheの起動コマンドの登録，/var/www/以下へのhtdocsの追加などを書くことになる．あとはこの`Dockerfile`をコピーしてビルドすれば，どこでもこのアプリケーションを動作させることができる．

新しくhtdocsを更新したい場合は，ビルドし直す，`scp`できるようにしてファイルをコンテナ内にぶっ込む，`volume`機能を使ってファイルをマウントする，などが考えられる．

`ONBUILD`を使えば，ファイルの更新を考慮したイメージを作成することができる．つまり，`親Dockerfile`でApacheのインストールなどの基本的なConfigurationを行う一方で，更新がかかるhtdocsの/var/www/への追加は`子Dockerfile`のビルド時に実行させることが可能になる．これを実現する`親Dockerfile`は以下のようになる．

```bash
# Dockerfile.base
FROM ubuntu:12.04

RUN apt-get update
RUN apt-get install -y apache2

ENV APACHE_RUN_USER www-data
ENV APACHE_RUN_GROUP www-data
ENV APACHE_LOG_DIR /var/log/apache2

ONBUILD ADD . /var/www/

EXPOSE 80
ENTRYPOINT ["/usr/sbin/apache2"]
CMD ["-D", "FOREGROUND"]
```

カレントディレクトリを`/var/www`に追加する部分を`ONBUILD`で記述する．あとは，ベースイメージをビルドし，レジストリに`push`しておく

```bash
$ docker build -t tcnksm/apache_base - < Dockerfile.base
$ docker push
```

## Apache application image

htdocsを開発する．

```bash
$ echo "<h1>Hello, docker</h1>" > index.html
```

開発が終了したら，以下のような`Dockerfile`を準備しビルドする．

```bash
FROM tcnksm/apache_base
```

```bash
$ docker build -t tcnksm/apache .
```

ビルドすると，`親Dockerfile`で記述した`ONBUILD`が実行され，カレントディレクトリのhtdocsがイメージの/var/www/以下に追加される．あとは，このイメージを好きなところにデプロイして起動するだけ．

```bash
$ docker run -p 80:80 tcnksm/apache
```

## 開発方法

htdocsの開発中に実際にapacheを起動して，ブラウザで動作確認などができるとよい．以下のように`volume`でカレントディレクトリをベースイメージの/var/wwwにマウントして起動すれば，リアルタイムで更新を確認しつつ開発を進めることができる．

```bash
$ docker run -p 80:80 -v $(pwd):/var/www -t tcnksm/apache_base
```

`vagrant share`のように外部の開発者とやり取りしつつ開発したいなら，ngrokを使って[Docker share](http://deeeet.com/writing/2014/03/12/docker-share/)的なこともできる．

開発が終了したら，上のDockerfileを使って最終イメージをビルドし，イメージをデプロイする．例えば，[Orchard](https://orchardup.com/)にデプロイするには以下のようにする（Orchardの使い方は，["OrchardにDockerアプリケーションをデプロイ"](http://deeeet.com/writing/2014/03/22/docker-orchard/)に書いた）．

```bash
$ orchard docker build -t tcnksm/apache .
$ orchard docker run -d -p 80:80 tcnksm/apache
```

## 参考

- [A reveal.js Docker Base Image with ONBUILD](http://mindtrove.info/a-reveal.js-docker-base-image-with-onbuild/)
- [Docker quicktip #3 – ONBUILD](http://www.tech-d.net/2014/02/06/docker-quicktip-3-onbuild/)
- ["Toward FutureOps: Stable, repeatable, environments from dev to prod"](http://www.slideshare.net/profyclub_ru/8-mitchell-hashimoto-hashicorp)


