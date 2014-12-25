---

title: 'プロビジョニングの終了をiOS/Androidに通知するVagrantのpluginつくった'
date: 2014-02-19
comments: true
categories: vagrant
---

[tcnksm/vagrant-pushover](https://github.com/tcnksm/vagrant-pushover)

Vagrantのプロビジョニングはものすごく時間がかかる．その時間を使って美味しい珈琲を淹れたい．でも，席を外したらいつプロビジョニングが終わったかわからない．プロビジョニングの終了を告げる通知が欲しい．

少し前から[Pushover](https://pushover.net/)というiOS/Androidアプリで遊んでいる．シンプルなHTTP POSTを介してアプリに通知が送れる（詳しくは，["Pushover使ってみた"](http://deeeet.com/writing/2014/02/09/pushover/)に書いた）．メールで通知でもよかったんだけど，せっかくなので，Pushoverに通知が送れるVagrantプラグインを作った．

以下のような通知を受け取ることができる．

<img src="/images/vagrant-pushover.png" class="image">

## インストール

Vagrantのプラグインとしてインストールする．

```bash
$ vagrant plugin install vagrant-pushover
```

## 使い方

以下のようにVagrantfileに設定を記述するだけ．

```ruby
Vagrant.configure("2") do |config|
    config.pushover.set do |p|
        p.user  = "YOUR KEY"
        p.token = "YOUR APP TOKEN"
    end
end                        
```

`user`はPushoverにサインアップ後に[Dashboard](https://pushover.net/)から，`token`はアプリケーションの登録をすると取得できる．

既存コマンドのフックとして記述してあるので，他に特別なことをする必要はなく，いつも通りにコマンドを実行するだけでよい．通知が行われるのは，プロビジョニングが行われる以下の場合のみ．

- `vagrant up`
- `vagrant up --provision`
- `vagrant reload --provision`
- `vagrant provision`

ただし`vagrant up`は，マシンの状態が`:running`でない場合，プロビジョニングが一度も行われていない場合に通知が行われる．

他にも，通知のメッセージのタイトルや本文，通知音もVagrantfileの設定から行うことができる．API通りに実装してあるので，詳しくは[公式ドキュメント](https://pushover.net/api)を参照してください．

## Vagrantfileを共有したい場合

`token`や`user`がベタ書きされているのはよろしくないので，別ファイルとして記述できるようにもしてある．

以下のコマンドで設定ファイルを吐き出す．

```bash
$ vagrant pushover-init
```

設定ファイルは，`.vagrant/pushover.rb`として吐き出されるので，中身を編集して`token`と`user`を記述する．設定の読み込みを有効にするには，Vagrantfileを以下のように記述するだけ．

```ruby
Vagrant.configure("2") do |config|
    config.pushover.read_key
end
```

以上．

Vagrantのプラグインを作るのはとても簡単（実際2日もかかってない）．また，プラグインを作ることでVagrantの内部でどのようなことが行われているのか大分理解できる．作成には，["実践Vagrant"](http://www.amazon.co.jp/%E5%AE%9F%E8%B7%B5-Vagrant-Mitchell-Hashimoto/dp/4873116651)を参考にした．[公式ドキュメント](http://docs.vagrantup.com/v2/plugins/)も充実している．すべてのVagrantのコマンドはプラグインとして実装されているので，作るときは参考になる．Mitchell Hashimotoさんが自らつくったプラグイン[vagrant-aws](https://github.com/mitchellh/vagrant-aws)も参考になった．プラグインの作り方は，そのうちまとめる．

Pushoverを使ってるひとにしか使えないかなりニッチなプラグインだけど，プロビジョニング中に美味しい珈琲を淹れたいひとは是非使ってください．バグなどはGithubのissueか[@deeeet](https://twitter.com/deeeet)までお願いします．

参考

- [東京サードウェーブコーヒー](http://deeeet.com/writing/2014/01/21/third-wave-tokyo/)


