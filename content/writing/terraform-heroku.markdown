---

title: 'TerraformでHerokuアプリのセットアップ'
date: 2014-08-04
comments: true
categories: terraform
---

ちょうど新しくHerokuでアプリケーションを作り始めたので，[Terraform](http://www.terraform.io/)を使ってセットアップをしてみた．

## Terraformとは

[Terraform](http://www.terraform.io/)は[Hashicorp](http://www.hashicorp.com/)の新作．インフラの構成をコード（テンプレートファイル）に落とし込んで，構築/変更することができる．インフラの構成は，複数のプロバイダやツール，例えば，AWSやConsul，DigitalOcean，Herokuなどにまたがって記述することができる．

Terraformが良いのは，各設定値を変数としてサービス間で共有できるところ．例えば，Herokuでアプリケーションを立ち上げた際に自動で割り振られるホスト名を，DNSimpleの設定項目に渡してCNAMEを設定するといったことが1つのファイルに書けてしまう（[Cross Provider - Terraform](http://www.terraform.io/intro/examples/cross-provider.html)）

他に良い点は，

- 依存関係をグラフで管理しており，依存がない部分を並列で実行するため速い
- 実行する前にDry-run的に実行計画を出力できる
- ワークフロー（コマンド）がとてもシンプルである

## 簡単な例

[tcnksm/re-dist-ghr・Github](https://github.com/tcnksm/re-dist-ghr)

実際に，Terraformを使ってHerokuに新規アプリケーションをセットアップし，作成中のGo言語のWebアプリをデプロイしてみた．

まず，設定ファイルである`heroku.tf`は以下．

```ruby
variable "heroku_email" {}
variable "heroku_api_key" {}

provider "heroku" {
  email = "${var.heroku_email}"
  api_key = "${var.heroku_api_key}"
}

resource "heroku_app" "default" {
  name = "ghr"
  stack = "cedar"
  config_vars {
    BUILDPACK_URL="https://github.com/kr/heroku-buildpack-go.git"
  }
}
```

やっているのは以下．

- `provider`で`heroku`を指定し，APIを利用するための設定を記述する
- `resource`で`heroku_app`を指定し`default`アプリケーションを作成し，アプリケーションの名前，利用するStack，環境変数（今回は利用するbuildpack）を記述する

作成前に以下で実行計画（どんな変数が設定されるかなど）を確認することができる．

```bash
$ terraform plan \
    -var heroku_email=$HEROKU_EMAIL \
    -var heroku_api_key=$HEROKU_API_KEY
```

例えば，今回だと以下のような出力が得られる．

```bash
+ heroku_app.default
    config_vars:                 "" => "<computed>"
    config_vars.#:               "" => "1"
    config_vars.0.BUILDPACK_URL: "" => "https://github.com/kr/heroku-buildpack-go.git"
    git_url:                     "" => "<computed>"
    heroku_hostname:             "" => "<computed>"
    name:                        "" => "ghr"
    region:                      "" => "<computed>"
    stack:                       "" => "<computed>"
    web_url:                     "" => "<computed>"
```

Herokuを使ったことがあれば，馴染みのある変数が並んでいる．最初の立ち上げなので，各変数には値はなく`""`からの変更が表示されているのみ．`<computed>`は自動で設定される値になる（これらの値も`heroku_app.default.XXX`という形式で他のサービスの設定に渡すことができる）．試してないが，既に存在しているアプリケーションも，上の変数を指定すれば，Terraformの管理下に置けるはず．

あとは，以下を実行すれば，アプリケーションがセットアップされる．30秒以内で完了する．

```bash
$ terraform apply \
    -var heroku_email=$HEROKU_EMAIL \
    -var heroku_api_key=$HEROKU_API_KEY
```

セットアップが完了したら`git_url`へいつも通りアプリケーションをデプロイすればよい．

```bash
$ git remote add heroku <git_url>
$ git push heroku master
```

設定を変更したいときは`heroku.tf`を更新し，`terraform plan`で変更を確認して，`terrafrom apply`で適用すればよい．以後，これをひたすら繰り返していく．とても簡単．

## 雑感

Herokuでアプリケーションをセットアップするだけという非常な単純なことしかやってない（Terraformの利点である複数サービスの連携もしてない）けど，ワークフローがとても良い感じになった．まとめると，

- 基本的なセットアップ（Toolbeltで頑張っていたこと）はTerraformで
- アプリケーションのデプロイはgitで

と分けることができるようになる．toolbeltでやりたいことは簡単にできるけど，毎回コマンドとかを手順としてメモったりしていて，それをコード（設定ファイル）として残せるようになった．

さらに，これから例えばこのアプリケーションに独自のDNSを設定したくなったり，HerokuのAdd-onを追加したくなっても，コード（設定ファイル）にそれを記述するだけでそれを実現できる．つまり，サービスの複雑なスケールさえもコードで記述，管理できるようになる．

Terraformの究極的な目標はまだ見えていないが，自分のような数台程度のサーバーで，小規模（中規模）なサービスを作ってる開発者にとっても全然素敵なツールではと感じた．

## 参考

- [Terraform - HashiCorp](http://www.hashicorp.com/blog/terraform.html)
- [Terraform簡易チュートリアル on AWS - Qiita](http://qiita.com/zembutsu/items/93e546df765f8b2c4f32)
- [Rebuild: 52: TLDR Driven Development (Naoya Ito)](http://rebuild.fm/52/)
