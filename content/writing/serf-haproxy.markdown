---

title: 'SerfでHAProxyの更新 on Vagrant'
date: 2014-04-01
comments: true
categories: serf
---

Serfの典型的な使い方として紹介されることの多い，HAProxyの登録/更新をやってみた．これは既に何人かの方が試みているし，SerfのGithubのdemoページでも紹介されている．

- [hashicorp/serf/demo/web-load-balancer](https://github.com/hashicorp/serf/tree/master/demo/web-load-balancer)
- ["Serf+HAProxyで作るAutomatic Load Balancer"](http://blog.glidenote.com/blog/2013/10/30/serf-haproxy/)
- ["Synapse と Serf でサービスディスカバリ"](http://blog.ryotarai.info/blog/2014/04/01/service-discovery-by-syanpse-with-serf/)

これらが何をやっているかを簡単に書くと，1つのProxyサーバ（ロードバランサ）と複数のWebサーバという構成において，Webサーバの増減に応じてロードバランサの設定を自動で書き換えるというもの．

これをVagrantで複数サーバを立ち上げて，自分で手を動しつつ触ってみた．

[tcnksm/sample-serf-haproxy](https://github.com/tcnksm/sample-serf-haproxy)

Vagrantさえあれば誰でもすぐ試せるようになっている．

## Vagrantの準備

以下のようなVagrantfileを準備する．

```ruby
# Serfのインストール
# すべてのホストで実行する
$script = <<SCRIPT
sudo apt-get install -y unzip
cd /tmp/
wget https://dl.bintray.com/mitchellh/serf/0.5.0_linux_amd64.zip -O serf.zip

unzip serf.zip
chmod +x serf
mv serf /usr/bin/serf

SCRIPT

Vagrant.configure("2") do |config|
  config.vm.box = "precise64"
  config.vm.box_url = "http://files.vagrantup.com/precise64.box"
  config.vm.provision :shell, inline: $script

  # proxyサーバのプロビジョニング
  # (1) HAProxyのインストール
  # (2) HAProxyの有効化
  # (3) HAProxyの初期設定の書き出し
  # (4) HAProxyの起動
  config.vm.define :proxy do |proxy|
      proxy.vm.network "private_network", ip: "172.20.20.10"
      proxy.vm.provision :shell, inline: <<SCRIPT
apt-get -y install haproxy
sed -i -e 's/ENABLED=0/ENABLED=1/' /etc/default/haproxy

cat <<EOF >/tmp/haproxy.cfg
global
    daemon
    maxconn 256

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

listen stats
    bind *:9999
    mode http
    stats enable
    stats uri /
    stats refresh 1s

listen http-in
    bind *:80
    balance roundrobin
    option http-server-close
EOF

mv /tmp/haproxy.cfg /etc/haproxy/haproxy.cfg

/etc/init.d/haproxy start

SCRIPT
  end

  # webサーバのプロビジョニング
  # (1) nginxのインストール
  # (2) 初期画面の準備
  # (3) nginxの起動
  config.vm.define :web1 do |web|
      web.vm.network "private_network", ip: "172.20.20.111"
      web.vm.provision :shell, inline: <<SCRIPT
apt-get -y update
apt-get -y install nginx
echo '<h1>web1</h1>' > /usr/share/nginx/www/index.html
/etc/init.d/nginx start
SCRIPT
  end

  config.vm.define :web2 do |web|
      web.vm.network "private_network", ip: "172.20.20.112"
      web.vm.provision :shell, inline: <<SCRIPT
apt-get -y update
apt-get -y install nginx
echo '<h1>web2</h1>' > /usr/share/nginx/www/index.html
/etc/init.d/nginx start
SCRIPT
  end
end

```

ホストは全部で3つ立てる．ロードバランサ用のホスト`proxy`を172.20.20.10で，Webサーバ用のホスト`web1`と`web2`を172.20.20.111と172.20.20.112で立てる．Webサーバはどれだけ増やしてもよい．

Serfは全てのホストにインストールする．`proxy`ではHAProxyのインストールと初期設定を，`web`ではnginxをインストールと初期画面の準備，設定を行う．

起動する．

```bash
$ vagrant up
```

## Serfの設定ファイルの準備

Serfを起動するたびにコマンドを打つのはめんどくさいので共通部分は設定ファイルにしておく．設定ファイルの書き方は[公式](http://www.serfdom.io/docs/agent/options.html)を参考に．

まず，Proxyサーバの設定ファイル．

```ruby
# proxy.json
{
    "tags": {
            "role": "lb"
    },

    "node_name": "proxy",

    "bind": "172.20.20.10",

    "event_handlers": [
            "ruby handler.rb"
    ]
}
```

次に，Webサーバの設定ファイル．

```ruby
# web.json
{
    "tags": {
            "role": "web"
    },
                
    "start_join": [
            "172.20.20.10"
    ]
}
```

join先をProxyサーバにしておくと楽．


## イベントハンドラの準備

イベントハンドラがやることは単純に`/etc/haproxy/haproxy.cfg`の書き換え

1. `member-join`を受け取ったら，サーバの情報の追記
1. `member-leave`を受け取ったら，該当するサーバ情報の削除

以下のようになる．

```ruby
# handler.rb

require 'fileutils'

# 設定ファイル
CONFIGFILE = "/etc/haproxy/haproxy.cfg"
TMP_CONFIGFILE = "/tmp/haproxy.cfg"

exit 0 if ENV["SERF_TAG_ROLE"] != "lb"

# サーバ情報の取得
def member_info
  info = {}
  STDIN.each_line do |line|
    info[:node], info[:ip], info[:role], _ = line.split(' ')
  end
  info
end

info = member_info
exit 0 if info[:role] != "web"

case ENV["SERF_EVENT"]

# サーバ情報の追記
when 'member-join'
  File.open(CONFIGFILE,"a") do |f|
      f.puts "    server #{info[:node]} #{info[:ip]}:80 check"
  end
  
# 該当サーバ情報の削除
when 'member-leave'
  target = "    server #{info[:node]} #{info[:ip]}:80 check"
  FileUtils.rm(TMP_CONFIGFILE) if File.exist?(TMP_CONFIGFILE)
  File.open(TMP_CONFIGFILE,"w") do |f|
    File.open(CONFIGFILE,"r").each do |line|
      next if line.chomp == target
      f.write(line)
    end
  end
  FileUtils.mv(TMP_CONFIGFILE, CONFIGFILE)
end

system("/etc/init.d/haproxy reload")
```

このイベントハンドラはProxyサーバのみで設定する．

## 動かしてみる

実際に動かしてみる．

まず，Proxyサーバで最初のAgentを立ち上げる．

```bash
$ vagrant ssh proxy
$ cd /vagrant
$ sudo serf agent -config-file=proxy.json
```

`-config-file`に上で準備した設定ファイルを指定する．

アクセスしてみる．

```bash
$ curl http://172.20.20.10/
<html><body><h1>503 Service Unavailable</h1>
No server is available to handle this request.
</body></html>
```

まだ一つもバランシングされていない．

次に，`web1`でAgentを立ち上げて，クラスタにjoinする．

```bash
$ vagrant ssh web1
$ cd /vagrant
$ serf agent -config-file=web.json -node web1 -bind 172.20.20.111
```

設定ファイルに加えて，ノード名とホストのIPを指定する．

これで`web1`がバランシングされるようになる．

```bash
$ curl http://172.20.20.10/
<h1>web1</h1>
$ curl http://172.20.20.10/
<h1>web1</h1>
```

さらに，`web2`でAgentを立ち上げて，クラスタにjoinする．

```bash
$ vagrant ssh web2
$ cd /vagrant
$ serf agent -config-file=web.json -node web2 -bind 172.20.20.112
```

これで`web2`にもバランシングされるようになる．

```bash
$ curl http://172.20.20.10/
<h1>web1</h1>
$ curl http://172.20.20.10/
<h1>web2</h1>
```

このとき，`/etc/haproxy/haproxy.cfg`は以下のようになる．

```
...
listen http-in
    bind *:80
    balance roundrobin
    option http-server-close
    server web1 172.20.20.111:80 check
    server web2 172.20.20.112:80 check
```

クラスタから離脱してみる．`web1`を停止する．

すると，`web1`にはバランシングされないようになる．

```bash
$ curl http://172.20.20.10/
<h1>web2</h1>
$ curl http://172.20.20.10/
<h1>web2</h1>
```

最終的な`/etc/haproxy/haproxy.cfg`は以下のようになる．

```
...
listen http-in
    bind *:80
    balance roundrobin
    option http-server-close
    server web2 172.20.20.112:80 check
```

文章ではなかなか伝わらないけど，実際に動かしてみると感動するので是非．

