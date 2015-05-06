+++
date = "2015-05-06T19:08:55+09:00"
draft = true
title = "HerokuのDocker対応について"
+++

[Introducing 'heroku docker:release': Build & Deploy Heroku Apps with Docker](https://blog.heroku.com/archives/2015/5/5/introducing_heroku_docker_release_build_deploy_heroku_apps_with_docker)

HerokuがDockerの利用を始めた．一通り触ってコードもちょっと読んでみたので現時点でできること，内部の動きについてまとめる．

## TL;DR

- Herokuの本番環境とローカル開発環境を一致させることができる（プラグインによるDockerコマンドの抽象化）
- Buildpackなしで`Dockerfile`からSlugを作れる

自分の好きなDockerイメージをHeroku上で動かせるようになるわけではない．

## 何ができるのか

まず何ができるようになったのかについて簡単に書く．プラグインをインストールするとDockerコマンドが使えるようになる．

```bash
$ heroku plugins:install heroku-docker
```

カレントディレクトリの言語/フレームワークに応じた`Dockerfile`を生成する．

```bash
$ heroku docker:init
Wrote Dockerfile (ruby)
```

上記で作成した`Dockerfile`をもとにDockerコンテナを起動してコンテナ内でアプリケーションを起動する．

```bash
$ heroku docker:start
...
web process will be available at http://192.168.59.103:3000/
```

起動したコンテナ内でOne-offコマンドを実行する．

```bash
$ heroku docker:exec bundle exec rake db:migrate
```

開発が終わったら上記のDockerイメージから[Slug](https://devcenter.heroku.com/articles/slug-compiler)（アプリケーションのソースとその依存関係を全て含めた`.tar`）を作成してそれをそのままHeroku上にデプロイすることができる．デプロイされるとそれは通常通りに[Dyno](https://devcenter.heroku.com/articles/dynos#the-dyno-manager)になりアクセスできるようになる．

```bash
$ heroku docker:release
$ heroku open
```

以下の制約を満たせば生成された`Dockerfile`を自分なりに編集することもできる．

- `heroku:cedar`イメージをベースにする
- `/app`ディレクトリ以下に変更が含まれる

詳しくは以下で説明する．

## 内部の仕組み

上記のワークフローで実際に何が行われているのかをコード/コマンドレベルで追ってみる．プラグインのソースは[https://github.com/heroku/heroku-docker](https://github.com/heroku/heroku-docker)にある．

### init

まず`docker:init`による`Dockerfile`の生成．これはカレントディレクトリのソースコードからプラットフォームを判別し，プラットフォーム専用のテンプレートから生成する．テンプレートは[heroku/heroku-docker/platforms](https://github.com/heroku/heroku-docker/tree/master/platforms)以下にある．現在はRuby，Node，Scalaがサポートされている．

プラットフォーム判別はBuildpackと同じ仕組み．例えばRubyの場合は以下のように`Gemfile`の有無により判別する．

```js
detect: function(dir) {
      if (exists.sync(path.resolve(dir, 'Gemfile'))) return true;
      if (exists.sync(path.resolve(dir, 'Gemfile.lock'))) return true;
}
```

生成される`Dockerfile`を見ると大体以下のことをしている．

- ベースイメージとして`heroku/cedar:14`を利用する
- `/app`以下に各種言語のRuntimeや依存パッケージをインストールする
- `ONBUILD`でカレントディレクトリのソースを`/app`に取り込む

[Cedar](https://devcenter.heroku.com/articles/cedar)というのはHeroku上でDynoを動かすプラットフォーム．ベースはUbunutで[cedar-14.sh](https://github.com/heroku/stack-images/blob/master/bin/cedar-14.sh)スクリプトで作られる（つまり，DockerでローカルにHerokuプラットフォームを再現してその上にアプリケーションを載せている感じになる）．

自分でスクラッチで`Dockerfile`を書くこともできる．以下で最小限の`Dockerfile`を生成できる．

```bash
$ heroku docker:init --template minimal
```

### start

次に`docker:start`コマンドによるアプリケーションコンテナの起動．このコマンドでは以下の3つのことを行う．

- ベースイメージのビルド
- アプリケーションを含めたイメージのビルド（`ONBUILD`）
- 作成したイメージをもとにコンテナの起動

まずベースイメージのビルドは以下のコマンドを叩いている．

```bash
$ docker build --force-rm --file="${dockerfile}" --tag="${id}" "${dir}"
```

タグ名は`heroku-docker-${hash}`でHash値はDockerfileの内容から生成される（ので`Dockerfile`を更新していなければビルドは走らない）．

次にアプリケーションを含めたイメージのビルド．これは以下のように新しく一時的な`Dockerfile`を生成してビルドする（`execImageId`はタグ名）．

```js
var contents = `FROM ${execImageId}`;
var imageId = `${execImageId}-start`;
var filename = `.Dockerfile-${uuid.v1()}`;
```

上で見たように生成された`Dockerfile`においてアプリケーションのコードをイメージに含める部分は`ONBUILD`が使われていた．このステップは`ONBUILD`を実行するために行われる．この仕組みにより，同じ`Dockerfile`＋同じ言語のアプリケーションである場合にベースイメージの再度ビルドが不要になる（つまりアプリケーションコードの追加と依存関係の解決のみが走る）．

最後にコンテナの起動は以下のコマンドが実行される．

```bash
docker run -w /app/src -p 3000:3000 --rm -it ${mountComponent} ${envArgComponent} ${imageId} sh -c "${command}"
```

`"${command}"`には`Procfile`の内容が使われる．DBのURLなどは`.env`ファイルに環境変数を書いておけばよい．このファイルはここで読み込まれて`-e KEY=VALUME`形式で`${envArgComponent}`に展開される．

以上の仕組みでローカル環境でアプリケーションが起動する．

### release

最後に`docker:release`コマンドでslugがHerokuにデプロイされる仕組み．このコマンドでは以下の3つのことを行う．

- Slug（`slug.tgz`）の作成
- 起動コマンド（`process_types`）の設定
- Slugのアップロード


Slugの作成は`docker:start`コマンドでDockerコンテナを起動し，そのコンテナに対して以下のコマンドを実行する．

```bash
$ docker run -d ${imageId} tar cfvz /tmp/slug.tgz -C / --exclude=.git --exclude=.heroku ./app
$ docker wait ${containerId}
$ docker cp ${containerId}:/tmp/slug.tgz ${slugPath}
```

`/app`以下を`tar`で固めて`cp`コマンドでそれを取り出しているだけ．なので独自の`Dockerfile`を書く時は注意が必要で`/app`以下に依存をちゃんと含めるように書く必要がある．

例えば[GraphicsMagick](http://www.graphicsmagick.org/)を依存に含めたいときは以下のように`Dockerfile`を書いて`/app`以下に変更が加わるように意識しなければならない．

```bash
RUN curl -s http://78.108.103.11/MIRROR/ftp/GraphicsMagick/1.3/GraphicsMagick-1.3.21.tar.gz | tar xvz -C /tmp
WORKDIR /tmp/GraphicsMagick-1.3.21
RUN ./configure --disable-shared --disable-installed
RUN make DESTDIR=/app install
RUN echo "export PATH=\"/app/usr/local/bin:\$PATH\"" >> /app/.profile.d/nodejs.sh
ENV PATH /app/usr/local/bin:$PATH
```
（Go言語で書かれた静的リンクされたバイナリを使うのは楽そうだな）

起動コマンド（process_types）の設定とSlugのアップロードはPlatform APIを叩いているだけ，詳しくは["Creating Slugs from Scratch"](https://devcenter.heroku.com/articles/platform-api-deploying-slugs)を参考．

## まとめ

Dockerを使えるようにするというよりは，Dockerを使うことでHerokuアプリの開発をやりやすくしたという印象．SlugはHeroku上で作られて一体どうなっているのかわからなかったけど手元で同じものを再現できるのは強い．Buildpackとの連携も進むのではないか（Buildpack+Dockerだと[building](http://www.centurylinklabs.com/heroku-on-docker/)かなあ）．

ローカル開発環境にDocker（boot2docker）はあるっしょという前提でツールを提供する流れだ．Dockerコマンドをラップするとかね．

## 参考

- [Introduction: Local Development with Docker](https://devcenter.heroku.com/articles/introduction-local-development-with-docker)
