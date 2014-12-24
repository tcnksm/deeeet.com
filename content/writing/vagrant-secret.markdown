---

title: '他人に共有したくない設定をVagrantfileに書くためのpluginつくった'
date: 2014-02-24
comments: true
categories: vagrant
---

（追記）[dotenv](https://github.com/bkeepers/dotenv)というもっと便利なツールがありました．僕のは，pluginを作る際の参考にしてください．dotenvとvagrantの連携は，glidenoteさんの["dotenvを利用して環境ごとでVagrantfileの設定値を変更してみる"](http://blog.glidenote.com/blog/2014/02/26/vagrant-dotenv/)を参考にしてください．

[vagrant-secret](https://github.com/tcnksm/vagrant-secret)

例えば，VagrantでDigital Oceanを使う場合，以下のように`client_id`や`api_key`のような他人には共有したくない設定をVagrantfileに記述する．

```ruby
Vagrant.configure('2') do |config|
    config.vm.provider :digital_ocean do |provider, override|
        provider.client_id = '****'
        provider.api_key   = '****'
    end
end
```

ローカルで自分だけが使う場合は問題ないが，Githubに上げて他人に共有した場合は面倒になる．[vagrant-secret](https://github.com/tcnksm/vagrant-secret)を使えば，専用のyamlファイルに設定を分けて記述することができる．


## インストール

Vagrantのpluginとしてインストールする．

```bash
$ vagrant plugin install vagrant-secret
```

## 使い方

まず，以下のコマンドで設定ファイルを書き出す．

```bash
$ vagrant secret-init
```

すると，`.vagrant/secret.yaml`が生成されるので，そこに公開したくない設定を記述する．例えば，以下のようにDigital Oceanで必要な`client_id`と`api_key`を記述する．

```ruby
client_id: "*******"
api_key: "********"
```

後は，これらをVagrantfileで使うだけ．yamlのkeyが`Secret`という専用のクラスのクラス変数に割り当てられ，それを通してvalueを取り出すことができる．

```ruby
Vagrant.configure('2') do |config|
    config.vm.provider :digital_ocean do |provider, override|
        provider.client_id = Secret.client_id
        provider.api_key   = Secret.api_key
    end
end
```

`.vagrant/`以下は普通はgitignoreするので，`secret.yaml`をわざわざgitignoreする必要はない．

バグなどはGithubのissueか[@deeeet](https://twitter.com/deeeet)までお願いします．

参考

- [VagrantとSSDなVPS(Digital Ocean)で1時間1円の使い捨て高速サーバ環境を構築する](http://blog.glidenote.com/blog/2013/12/05/digital-ocean-with-vagrant/)
- [プロビジョニングの終了をiOS/Androidに通知するVagrantのpluginつくった](http://deeeet.com/writing/2014/02/19/vagrant-pushover/)










