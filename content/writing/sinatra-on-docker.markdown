---

title: 'Vagrant + DockerでSinatraを動かす'
date: 2013-12-27
comments: true
categories: docker
---

[tcnksm/docker-sinatra](https://github.com/tcnksm/docker-sinatra)

簡単なsinatraアプリケーションをDocker上で動かしてみた．

まずはsinatraアプリケーション．特別なことはなく，`Procfile`と`config.ru`を準備して，`foreman`で動かす．外部からのアクセスを有効にするため，ListenAddressを指定しておく．

```bash
#Procfile
web: bundle exec rackup config.ru -p 4567 -s thin -o 0.0.0.0
```

次に，Vagrantの設定．VagrantはDockerのprovisioningが有効な1.4を利用する．vagrantのインストールは以下のBrewfileを準備して，`brew bundle`する．

```
tap phinze/homebrew-cask
install brew-cask

cask install virtualbox
cask install vagrant
```

Vagrantfileは以下．

```
Vagrant.configure("2") do |config|
    config.vm.box = "precise64"
    config.vm.network :forwarded_port, guest: 4567, host: 4567
    config.vm.provision :docker do |d|
        d.pull_images "ubuntu"
    end
end
```

Port fowardでホストからアクセス可能なポート番号を指定しておく．後は，dockerのprovisioningでubuntuイメージを取得しておく．

次に，Dockerイメージの作成．Dockerfileは以下．

```
FROM base

# Install packages for building ruby
RUN apt-get update
RUN apt-get install -y --force-yes build-essential wget git
RUN apt-get install -y --force-yes zlib1g-dev libssl-dev libreadline-dev libyaml-dev libxml2-dev libxslt-dev
RUN apt-get clean

# Install ruby
RUN wget -P /root/src ftp://ftp.ruby-lang.org/pub/ruby/2.0/ruby-2.0.0-p247.tar.gz
RUN cd /root/src; tar xvf ruby-2.0.0-p247.tar.gz
RUN cd /root/src/ruby-2.0.0-p247; ./configure; make install

# Install bundler
RUN gem update --system
RUN gem install bundler

# Clone sinatra app 
RUN git clone https://github.com/tcnksm/docker-sinatra /root/sinatra
RUN cd /root/sinatra; bundle install

# Set run command
EXPOSE 4567
CMD ["/usr/local/bin/foreman","start","-d","/root/sinatra"]
```

やっていることは単純で

1. ベースイメージを持ってくる(`FROM base`)
1. rubyのビルドに必要なパッケージのインストール(`RUN apt-get ...`)
1. rubyのソースを取得してコンパイル
1. Bundlerのインストール
1. Githubからsinatraアプリケーションをcloneして依存gemsのインストール
1. 外部に晒すportの設定(`EXPOSE 4567`)
1. コンテナ実行時のコマンドの設定(`CMD ...`)

自分のSinatraアプリを使いたい場合は，cloneするURLだけ変えれば動くはず．試していないが，単純なrailsアプリも動くはず(`bundle install`して`foreman`で起動というフローが同じであれば)．

イメージの作成は以下．

```bash
docker build -t sinatra /vagrant/.
```

コンテナの起動は以下．ポートのマッピングをして起動する．

```
ID=$(docker run -p 4567:4567 -d sinatra)
```

これで，ホストOS上から[http://localhost:4567/](http://localhost:4567/)にアクセスできるようになっている．

ログを確認するには，

```bash
docker logs $ID
```

停止するには，

```bash
docker stop $ID
```

以上．とても簡単にできた．

コンテナを殺すとログも消えてしまうので，次は簡単にコンテナ内のログを取得できるようにする．あとは，Google Compute Engineでも動かしてみたい．

参考

- [OSX, Vagrant, Docker, and Sinatra | DYLI.SH](http://dyli.sh/2013/08/23/OSX-Vagrant-Docker-Sinatra.html)
- [Sinatra deployment with Docker](http://haanto.com/sinatra-deployment-with-docker/)
