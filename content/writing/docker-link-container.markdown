---

title: 'Dockerコンテナ間のlink，database.ymlの書き方'
date: 2014-03-20
comments: true
categories: docker
---

DockerはLinksというコンテナ同士の連携を簡単に行う仕組みをもつ．
これは，DB用のコンテナとアプリケーション用のコンテナの連携を行いたいときなどに有用になる．

例えば，1337ポートが`EXPOSE`された`container1`という名前のコンテナとの連携を行いたいとする．
このとき以下のように，`-link 連携したいコンテナ名:エイリアス名`で新しいコンテナを起動すると，
そのコンテナ内に連携したいコンテナのポート番号やIPをもった環境変数が現れる．

```bash
docker run -d -link container1:alias user/sample bash
root@48408a38c9b2:/# env
ALIAS_PORT_5432_TCP_ADDR=172.17.0.2
ALIAS_PORT=tcp://172.17.0.2:5432
ALIAS_PORT_5432_TCP=tcp://172.17.0.2:5432
ALIAS_PORT_5432_TCP_PORT=5432
...
```
この環境変数を使えば，コンテナからコンテナへのデータの送信などの連携が可能になる．これがLinksの機能．

## PostgresqlコンテナとRailsコンテナの連携

例として，postgresqlコンテナとRailsコンテナを連携させてみる．
postgresqlのイメージには，dockerコンテナのホスティングサービスである[Orchard](https://orchardup.com/)が提供する[orchardup/postgresql]()が使いやすいのでそれを利用する．

まず，postgresqlコンテナを`pg`という名前で起動する．

```bash
$ docker run -d -p 5432:5432 -e POSTGRESQL_USER=docker -e POSTGRESQL_PASS=docker -name pg orchardup/postgresql
```

Railsからこのコンテナのデータベースにアクセスするには，`config/database.yml`を以下のようにしておく．

```ruby
development:
  adapter: postgresql
  template: template0
  encoding: unicode
  database: my_app_development
  pool: 5
  username: docker
  password: docker
  host: <%= ENV.fetch('DB_PORT_5432_TCP_ADDR') %>
  port: <%= ENV.fetch('DB_PORT_5432_TCP_PORT') %>
```

あとは，エイリアス名を`db`として，Railsコンテナを起動する．

```bash
docker run -i -p 3000:3000 -link pg:db -name web -t tcnksm/rails 'rake db:create && rake db:migrate && rails s'
```

参考

- [Docker虎の巻](https://gist.github.com/tcnksm/7700047)
