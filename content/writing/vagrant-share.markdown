---

title: 'Vagrant shareとngrokを使ってみた'
date: 2014-03-11
comments: true
categories: vagrant
---

[Vagrant 1.5 and Vagrant Cloud](http://www.vagrantup.com/blog/vagrant-1-5-and-vagrant-cloud.html)

Vagrant shareを使ってみた．今までは`private_network`によるローカルマシンから仮想マシンへのアクセスや，`public_network`によるLAN内のマシンから仮想マシンへのアクセスが可能だった．今回のアップデートで，外部ネットワークのマシンから，ローカルに立てた仮想マシンへのアクセスが可能になった．

主なアクセスは以下の2つ．

- 仮想マシン内に立てたHTTPサーバーへのアクセス
- SSHによる仮想マシンへのログイン

試してみた．

## 準備

[Vagrant Cloud](https://vagrantcloud.com)でアカウントを作成し，ログインする．

```bash
$ vagrant login
```

また，例として以下のようなVagrantfileを準備し，仮想マシンを起動しておく．

```ruby
Vagrant.configure("2") do |config|
    config.vm.box = "precise64"
    config.vm.box_url = "http://files.vagrantup.com/precise64.box"
    config.vm.network :forwarded_port, guest: 80, host: 8080
    config.vm.provision :shell, :inline => <<-PREPARE
apt-get -y update
apt-get install -y apache2
PREPARE
    end
```

```bash
$ vagarnt up
```

（やっているのは，8080->80のport forwardとapacheのインストールのみ）

## HTTP Access

まず，PulicなHTTP URLを介して仮想マシン内のHTTPサーバにアクセスする方法．この場合は，共有相手のマシンにVagrantがインストールされている必要はない．

以下を実行する．

```bash
$ vagrant share
...
==> default: Your Vagrant Share is running! Name: terrible-moose-1613
==> default: URL: http://terrible-moose-1613.vagrantshare.com
```

すると，[http://terrible-moose-1613.vagrantshare.com](http://terrible-moose-1613.vagrantshare.com)のような一時的なURLが発行される（現在はアクセス不可）．

あとは，そのURIを共有するだけ． 共有相手はブラウザから仮想マシン内のHTTPサーバにアクセスできる．

以下のように，[vagrantshare.com](vagrantshare.com)からローカルマシンまでTCPセッションを確立して，それをそのまま仮想マシンにport forwardすることで実現している．

```
http://terrible-moose-1613.vagrantshare.com -> 127.0.0.1:8080 (Host) -> 127.0.0.1:80 (Guest) 
```


## SSH Access

ローカルで`vagrant ssh`で仮想マシンにログインするように，外部ネットワークのマシンからローカルに立てた仮想マシンにsshでログインすることもできる．この場合は，共有相手のマシンにVagrant 1.5以上がインストールされている必要がある．

以下を実行する．今回は，sshログインのためのパスワードの入力が要求される．

```
$ vagrant share --ssh
==> default: Your Vagrant Share is running! Name: bulky-mitchell-9363
==> default: URL: http://bulky-mitchell-9363.vagrantshare.com
```

すると，同様に`bulky-mitchell-9363`のようなshare nameが発行されるので，その名前と入力したパスワードを共有する．

共有相手は以下を実行することでsshで仮想マシンにログインする．

```
$ vagrant connect --ssh bulky-mitchell-9363
```

セキュリティ的に不安な場合は，共有の際に以下のようにすれば，共有相手は一度しかsshでログインできなくなる．

```bash
$ vagrant share --ssh --ssh-once
```

## Disable HTTP URL Access

[http://terrible-moose-1613.vagrantshare.com](http://terrible-moose-1613.vagrantshare.com)のようなpublicなHTTP URLを無効にした共有もできる．この場合も共有相手にVagrant 1.5以上がインストールされている必要がある．

以下を実行する．

```bash
$ vagrant share --disable-http
==> default: Your Vagrant Share is running! Name: hopeful-kangaroo-2431
```

すると，`hopeful-kangaroo-2431`のようなshare nameのみが発行されるので，それを共有する．

共有相手は，以下を実行する．

```bash
vagrant connect hopeful-kangaroo-2431
==> connect: SOCKS address: 127.0.0.1:53298
==> connect: Machine IP: 172.16.0.2
```

すると，共有相手には，固定のIPが割り振られ，ローカルネットワーク内に仮想マシンが存在しているように見える（ローカルで`private_network`で`vagrant up`した感じかな）．

共有相手は，[172.16.0.2](172.16.0.2)でブラウザから仮想マシン内のHTTPサーバーにアクセスできる．

## ngrok

twitterを眺めていたら，同様の技術に[ngrok](https://ngrok.com/)というものがあるのを知った．ローカルに立てたサーバを[ngrok.com](https://ngrok.com/)を介して外部に晒すことができる．こちらも試してみた．

まずサーバを立てる．

```bash
$ python -m SimpleHTTPServer
```

あとは，以下を実行するだけ．

```bash
$ ngrok 8000
```

すると，[http://3d0dbc48.ngrok.com](http://3d0dbc48.ngrok.com)のようなURLが発行され，以下のようにforwardingされる．

```
http://3d0dbc48.ngrok.com -> 127.0.0.1:8000
```

URLを共有すると，サーバを実行したローカルディレクトリがURLを介して外部に晒される（ファイルの共有とかできちゃう）．

## まとめ

Vagrant share素晴らしい．リモートで働いているときとか便利そう（社内なら`public_network`で事足りそう）．SSHアクセスはエンジニアとの共同作業に，HTTP Accessはエンジニア以外のひとに成果物を見せるときに使えそうだなと思った．

