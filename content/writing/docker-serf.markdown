---

title: 'SerfでDockerコンテナのクラスタを形成する'
date: 2014-03-31
comments: true
categories: docker serf
---

["Serf虎の巻"](http://deeeet.com/writing/2014/03/23/serf-basic/)書いたし，Serf使っていろいろやってみるかということで，Dockerコンテナのクラスタ形成をやってみた．SerfとDockerの組み合わせについては，すでに[shiba_yu36]()さんが試みている（["serfとDockerでクラスタを組んでみる"](http://shibayu36.hatenablog.com/entry/2013/12/08/170547)）ので，もう少し踏み込んでクラスタへのjoinの仕方を模索してみた．

[tcnksm/sample-docker-serf](https://github.com/tcnksm/sample-docker-serf)

やってみたのは，Dockerコンテナのみでのクラスタの形成．

## 準備

Vagrant上で実行する．Vagrantfileは以下．

```ruby
$script1 = <<SCRIPT
echo Installing depedencies...
sudo apt-get install -y unzip

echo Fetching Serf...
cd /tmp/
wget https://dl.bintray.com/mitchellh/serf/0.5.0_linux_amd64.zip -O serf.zip

echo Installing Serf...
unzip serf.zip
sudo chmod +x serf
sudo mv serf /usr/bin/serf
SCRIPT

Vagrant.configure("2") do |config|
  config.vm.box = "precise64"
  config.vm.box_url = "http://files.vagrantup.com/precise64.box"

  config.vm.provision "shell", inline: $script1
  config.vm.network "private_network", ip: "172.20.20.10"

  config.vm.provision :docker do |d|
    d.pull_images "ubuntu"
  end
end
```

VagrantからもSerfを使いたいので事前にプロビジョニングでインストールしておく．またDockerプロビジョニングも有効にしておく．

次に，Dockerfileは以下．Serfをインストールするだけ．

```bash
FROM ubuntu

RUN apt-get -y install unzip wget

RUN cd /tmp/
RUN wget --no-check-certificat https://dl.bintray.com/mitchellh/serf/0.5.0_linux_amd64.zip -O serf.zip

RUN unzip serf.zip
RUN chmod +x serf
RUN mv serf /usr/local/bin/serf
```

イメージビルドしておく．

```bash
$ docker build -t tcnksm/serf .
```

## クラスタの形成

実際にDockerコンテナでクラスタを形成してみる．

まず，最初のAgentを起動する．

```bash
$ docker run -d -t \
    --name serf1 \
    -p 7979 \
    tcnksm/serf \
    serf agent -bind 0.0.0.0:7979
```

`serf1`という名前で，`7979`ポートをEXPOSEし，Bindアドレス（Serfのクラスタ同士が通信するアドレス）を`0.0.0.0:7979`としてコンテナを起動する．

クラスタにjoinするには，クラスタメンバーのどれか一つのIPを知らないといけない．それをどうやって取得するかが問題になる．

[shiba_yu36]()さんは，ホスト側でAgentを起動し，docker0ネットワークのinnet addrを利用してコンテナ側からホスト側のAgentにjoinしていた．以下は，**コンテナ側で立てたAgent**にjoinする方法．この方法ではホスト側にAgentを立てる必要はない．

### inspectを利用する

`docker inspect`を使うと，コンテナIDを基にコンテナのIPを取得できる．上で立てた`serf1`コンテナにjoinしてみる（例えば，`serf1`のコンテナIDが`06b0325f637`のとき）．

```bash
$ docker run -d -t \
    --name serf2 \
    tcnksm/serf \
    serf agent -join $(docker inspect --format '{% raw %} {{ .NetworkSettings.IPAddress }} {% endraw %}' 06b0325f6373):7979
```

`--format`指定するとIPだけを抜き出せる．

### linkを利用する

`link`機能を使うと接続したいコンテナのIPを，新たに起動するコンテナ内で環境変数として取得できる（詳しくは，["Dockerコンテナ間のlink，database.ymlの書き方"](http://deeeet.com/writing/2014/03/20/docker-link-container/)に書いた）．この環境変数は，`docker run`のときにも利用できる．`serf1`に立てたagentにjoinするには，以下のようにする．

```bash
$ docker run -d -t \
    --name serf2 \
    -p 7979 \
    --link serf1:serf \
    tcnksm/serf \
    /bin/bash -c 'serf agent -bind 0.0.0.0:7979 -join $SERF_PORT_7979_TCP_ADDR:7979'
```

`--link serf1:serf`とすれば，`$SERF_PORT_7979_TCP_ADDR`で`serf1`コンテナのIPが取得できる．

この方法では，わざわざコンテナのIDを取得する必要がない．全てのAgentをBindアドレス`0.0.0.0:7979`で起動し，コンテナは`7979`ポートをEXPOSEしておけば，コンテナの名前だけでクラスタにjoinできる．


### ホスト側からクラスタにjoinする

ホスト側（Vagrant）から，コンテナ内で立てたAgentにjoinすることもできる．Dockerコンテナは1プロセスでしか起動できないため，クラスタのメンバーの確認やクラスタへのカスタムイベント，クエリの伝搬にはコンテナだけでは限界がある．このため，ホストからクラスタにjoinできる必要がある．

ホスト側からみたコンテナのIPを取得するには，`docker port`を使う．コンテナの名前（もしくはID）とEXPOSEしているPORT番号で取得できる．以下のようにして，コンテナに立てたAgentに接続する．

```bash
$ serf agent -join $(docker port serf1 7979)
```

これで，ホスト側からクラスタに対していろいろ操作できる．

```bash
$ serf members
precise64     10.0.2.15:7946   alive
2912f653a2e5  172.17.0.3:7979  alive
06b0325f6373  172.17.0.4:7979  alive
108c21eb149a  172.17.0.2:7979  alive
```

### 参考

- [Decentralizing Docker: How to Use Serf with Docker | CenturyLink Labs](http://www.centurylinklabs.com/decentralizing-docker-how-to-use-serf-with-docker/)
