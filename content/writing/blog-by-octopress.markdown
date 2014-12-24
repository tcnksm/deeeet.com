---

title: "Octopressへ移行"
date: 2013-01-13
comments: true
categories: 
---

[Octopress](http://octopress.org/)に移行した．
自分のエディタで手元で書いて，Rsyncでdeployできる．
デザインは，CompassとSassで作られているので，いじりやすい．


### インストール
必要なのは，gitとruby1.9.3．
```
$ git clone git://github.com/imathis/octopress.git octopress
$ cd octopress
$ gem install bundler
$ bundle install
$ rake install
```
`rake install`でデザインテーマがインストールされる．


### 設定ファイルの記述
ブログの名前などの設定は`_config.yml`に記述する．
詳細は，Jekyllの[ドキュメント](https://github.com/mojombo/jekyll/wiki/Configuration)を参照．

今回は，ホスティングにさくらのVPSを使う．
Rsyncでdeployするための設定を`Rakefile`に記述する．
事前に，公開鍵をサーバーの`~/.ssh/authorized_keys`に追加しておくこと．
```
ssh_user        =  "user@domain.com"
document_root   =  "~/website.com/"
rsync_delete    =  true
deploy_default  =  "rsync"
```
`document_root`は，apacheの設定と一致させる．
以下のコマンドでホスト先にdeployされる．
```
$ rake generate
$ rake deploy
```


### 記事を書く
記事を書くときは，以下でテンプレートを作り，それを編集する．

```
$ rake new_post\[title\]
```
ローカルで表示を確認するときは，以下を実行し，
ブラウザで[http://localhost:4000/](http://localhost:4000/)にアクセスする．
```
$ rake preview
```


### バーション管理
GitとGithubを使ってバージョン管理をする．[レポジトリを作って](https://github.com/new)
から以下を行う．ちなみに，このブログのレポジトリは[https://github.com/tcnksm/sota](https://github.com/tcnksm/sota)にある．
```
$ git remote rename origin octopress
$ git remote add origin (your repository url)
$ git config branch.master.remote origin)
```
以上．簡単ですね．














