---

title: 'serverspecとdocker-apiでDockerfileをTDD'
date: 2014-01-06
comments: true
categories: docker
---

いくつかDockerfileを書いてきた．今書いているDockerfileは短くてシンプルなものばかりだが，もっと長く複雑化した時に不安になりそうだ．不安を解消するにはテストしかない．さらにテスト駆動的にDockerイメージを開発できたら素敵だ．つまり，

- テストを書く
- Dockerイメージを作成して，テストの実行 -> `RED`
- Dockerfileの編集
- Dockerイメージを作成して，テストの実行 -> `GREEN`
- テストを...

の流れができるとよい．

ということで，RSpecを使ってTDDでDockerfileを開発するというのをやってみた，[tcnksm/docker-rspec](https://github.com/tcnksm/docker-rspec)．今回実現したのは以下．

- [Docker Remote API](http://docs.docker.io/en/latest/api/docker_remote_api/)でDockerfile特有のコマンド(e.g, `CMD`や`EXPOSE`)のRSpecテスト
- [serverspec](http://serverspec.org/)でパッケージのインストールのRSpecテスト

これらをOSX上からやれるようにした．これでDockerfileの記述内容は網羅的にテストできると思う．

## 準備 (Vagrant)

今回は，VagrantのVM上でDockerを動かす．OSはUbuntu12.04．`Vagrantfile`は以下．

```
Vagrant.configure("2") do |config|
    config.vm.box = "precise64"
    config.vm.box_url = "http://files.vagrantup.com/precise64.box"
    config.vm.network :private_network, ip: "192.168.50.4"
    config.vm.provision :docker do |d|
        d.pull_images "base"
    end
end
```

やっていることは以下

- Vagrant VMにIPアドレス"192.168.50.4"を割り当て
- Dockerのbaseイメージをpull

Vagrant VMはあらかじめ起動しておく．

```
vagrant up
```

また，Vagrant VMへのsshの設定を書き出しておく．

```
vagrant ssh-config --host docker-vm >> ~/.ssh/config
```

## Docker Remote APIによるテスト

まず，Docker Remote APIを使って，Dockerfile特有のテストをする．例えば，イメージが存在しているか，外部に向けたポートが設定されているか(`EXPOSE`)など．これは，主に[Experimenting with test driven development for docker](http://blog.wercker.com/2013/12/23/Test-driven-development-for-docker.html)を参考にした．

### 準備

Docker Remote APIは，デフォルトでunix:///var/run/docker.sockをlistenしており，rootユーザによるローカルからの接続のみしか許容していない ([参考](http://docs.docker.io/en/latest/use/basics/#bind-docker))．外部からのアクセスを許容するため，`/etc/init/docker.conf`の`DOCKER_OPTS`を書き換え，起動時にバインドアドレスを指定する．

```
# docker.conf
script
    DOCKER=/usr/bin/$UPSTART_JOB
    DOCKER_OPTS="-H 0.0.0.0:5422"
    if [ -f /etc/default/$UPSTART_JOB ]; then
        . /etc/default/$UPSTART_JOB
    fi
    "$DOCKER" -d $DOCKER_OPTS
end script
```

設定を有効にするために，Docker demonを再起動する．

また，このDocker Remote APIをrubyで使うために[swipely/docker-api](https://github.com/swipely/docker-api)をインストールしておく．

```bash
$ gem install docker-api
```

`spec_helper.rb`は以下のようにする．

```ruby
require "docker"
Docker.url = "http://192.168.50.4:5422"
```

Dockerが動作しているVagrant VMのIPアドレスに`Vagrantfile`で指定した値を，portにはRemote APIにバインドさせたportを指定する．


### テストを書く


簡単にtcnksm/sampleという名前のイメージが存在しているかをテストする．

```ruby
# dockerfile_spec.rb

require "spec_helper"

describe "Sample Images" do
    before(:all) do
        @image = Docker::Image.all.detect{|image| image.info["Repository"] == "tcnksm/sample"}
    end

    it "should exist" do
        expect(@image).not_to be_nil
    end
end
```

### テストを実行する (RED)

現時点ではtcnksm/sampleというイメージは存在しないため，テストはこける．

```bash
$ rspec
F

Failures:

  1) Sample Images should exist
       Failure/Error: expect(@image).not_to be_nil

           expected: not nil
                got: nil
       # ./spec/dockerfile_spec.rb:10:in `block (2 levels) in <top (required)>'

Finished in 0.82098 seconds
1 example, 1 failure
```

### イメージを作成する

以下のようなDockerfileを準備してイメージを作成してみる．

```
FROM base
MAINTAINER tcnksm "https://github.com/tcnksm"
```

ssh越しにdocerコマンドを実行し，イメージを作成する．

```
$ ssh docker-vm "docker -H :5422 build -t tcnksm/sample /vagrant/."
```


### テストを実行する (GREEN)

tcnksm/sampleイメージは既に作られているため，rspecテストは通る．

```bash
$ rspec
.

Finished in 0.8131 seconds
1 example, 0 failures
```

### テストの自動化

自動化は言えないが，イメージのビルドやテストの実行を毎回打つのは億劫なのでシェルスクリプトにしておく．

```
#!/bin/bash

echo "Build docker image:"
ssh docker-vm "docker -H :5422 build -t tcnksm/sample /vagrant/."
echo

echo "Run rspec test:"
rspec
echo
```

### 他のテストの書き方

イメージの存在をテストする以外にもDockerfile特有のコマンドのテストができる．以下にそれらをまとめておく．

外部向けのポートが設定されているか(`EXPOSE`)

```ruby
it "should expose the default port" do
    expect(@image.json["config"]["ExposedPorts"].has_key?("22/tcp")).to be_true
end
```

起動コマンドが設定されているか(`CMD`)

```ruby
it "should have CMD" do
    expect(@image.json["config"]["Cmd"]).to include("/usr/bin/wc", "--help")
end
```

環境変数が設定されているか(`ENV`)

```ruby
it "should have environmental variable" do
    expect(@image.json["config"]["Env"]).to include("TEST=test")
end
```

ワークディレクトリが設定されているか(`WORKDIR`)

```ruby
it "should have working directory" do
    expect(@image.json["config"]["WorkingDir"]).to eq("/root")
end
```

## serverspecによるテスト

次に，serverspecを使ってDockerfileによるパッケージのインストールのテストをする．テストの仕方としては，ssh接続が可能なコンテナを準備することで行う．こちらは，主に[Docker の Retmote API + serverspec で CI - naoyaのはてなダイアリー](http://d.hatena.ne.jp/naoya/20130621/1371790990)を参考にした．

### 準備 (ssh, sudoer)

serverspecを動かすには，sshによるログインとsudo権限をもったユーザが準備されている必要がある．以下のような`Dockerfile`を準備して，これを満たすイメージを準備する．

```
FROM base

# Install ssh
RUN apt-get update
RUN apt-get install -y openssh-server

# Setting ssh
RUN mkdir /var/run/sshd
RUN /usr/sbin/sshd
CMD ["/usr/sbin/sshd", "-D"]

# Create user and set sudo password
RUN useradd tcnksm
RUN echo tcnksm:**** | chpasswd

# Setting ssh login without sudo
RUN mkdir -p /home/tcnksm/.ssh
RUN chown tcnksm /home/tcnksm/.ssh
RUN chmod 700 /home/tcnksm/.ssh
ADD ./id_rsa.pub /home/tcnksm/.ssh/authorized_keys
RUN chown tcnksm /home/tcnksm/.ssh/authorized_keys
RUN chmod 700 /home/tcnksm/.ssh/authorized_keys

# Setting sudoers
RUN echo "tcnksm   ALL=(ALL)   ALL" > /etc/sudoers.d/tcnksm
```

イメージをビルドする

```bash
$ ssh docker-vm "docker -H :5422 build -t tcnksm/sample /vagrant/."
```

コンテナの起動

```bash
$ ssh docker-vm docker -H :5422 run -p 7654:22 -d tcnksm/sample /usr/sbin/sshd -D
```

`-p 7654:22`のオプションをつけるとVagrant VMの7654 portがDockerコンテナの22 portにport forwardされる．`Vagrantfile`と合わせると，localhost (OSX) からIPアドレス" "192.168.50.4"に7654 portでsshすると，Dockerコンテナの22 portに接続されることになる．

### 準備 (serverspec)

serverspecをインストールする．

```bash
$ gem install serverspec
```

`serverspec-init`は以下のようにする．

```bash
$ serverspec-init
Select OS type:

  1) UN*X
  2) Windows

Select number: 1

Select a backend type:

  1) SSH
  2) Exec (local)

Select number: 1

Vagrant instance y/n: n
Input target host name: 192.168.50.4
```

hostnameは`Vagrantfile`でVagrant VMに割り当てたIPアドレスにする．`spec_helper.rb`はそのまま利用する．

`~/.ssh/config`の設定をする．

```
Host 192.168.50.4
  HostName 192.168.50.4
  User tcnksm
  Port 7654
  UserKnownHostsFile /dev/null
  StrictHostKeyChecking no
  PasswordAuthentication no
  IdentityFile /Users/tcnksm/.ssh/id_rsa
  IdentitiesOnly yes
  LogLevel FATAL
```

次に，Dockerfileで設定したDockerコンテナ上のsudoユーザのパスワードを設定する．

```bash
$ export SUDO_PASSWORD="****"
```

### テストを書く

サンプルとしてgitがインストールされているかチェックするテストを書く．

```ruby
require 'spec_helper'

describe package('git') do
  it { should be_installed }
end
```

### テストを実行する (RED)

gitはまだインストールしていないため，テストはこける．

```bash
$ rspec
F

Failures:

  1) Package "git" should be installed
       Failure/Error: it { should be_installed }
              sudo dpkg-query -f '${Status}' -W git | grep '^install ok installed$'

dpkg-query: no packages found matching git
       expected Package "git" to be installed
            # ./spec/192.168.50.4/git_spec.rb:4:in `block (2 levels) in <top (required)>'

Finished in 0.90756 seconds
1 examples, 1 failure
```

### イメージを作成する

gitのインストールを上記の`Dockerfile`に追記する．

```
RUN apt-get install -y git
```

### テストを実行する (GREEN)

もう一度テストを実行する前に先ほど起動したDockerコンテナを削除しておく．

```
ssh docker-vm "docker -H :5422 stop `ssh docker-vm docker -H :5422 ps -l -q`"
ssh docker-vm "docker -H :5422 rm `ssh docker-vm docker -H :5422 ps -l -q`"
```

再びイメージを作成し，コンテナを起動してからテストを実行する．今回は，gitが既にインストールされているためテストは通る．

```bash
$ rspec
.

Finished in 0.90842 seconds
1 examples, 0 failures
```

### テストの自動化

イメージの作成，コンテナの起動，テストの実行，コンテナの破棄の流れをシェルスクリプトにしておく．

```
#!/bin/bash

echo "Build docker image:"
ssh docker-vm "cd /vagrant; docker -H :5422 build -t tcnksm/sample ."
echo

echo "Run container:"
ssh docker-vm docker -H :5422 run -p 7654:22 -d tcnksm/sample /usr/sbin/sshd -D
echo

echo "Run rspec test:"
rspec
echo

echo "Delete container:"
ssh docker-vm "docker -H :5422 stop `ssh docker-vm docker -H :5422 ps -l -q`"
ssh docker-vm "docker -H :5422 rm `ssh docker-vm docker -H :5422 ps -l -q`"
```

## まとめ

Docker Remote APIとserverspecによるテストは同時に行うことができる．シェルスクリプトを使っているのが少し原始的だが，一度ループを作ってしまえば後はひたすら回すだけなのでそこまでの苦痛ではない．普段使っているRSpecの記法でDockerfileまでテストできるのは嬉しい．serverspecは初めて使ったが，とても簡単に使えた．素敵．

ただ，もっと簡単にDockerのイメージやコンテナをテストするフレームワークはそのうち出てきそうな気がしてる．


参考

- [serverspec - home](http://serverspec.org/)
- [Experimenting with test driven development for docker](http://blog.wercker.com/2013/12/23/Test-driven-development-for-docker.html)
- [serverspecでサーバ環境のテストを書いてみよう](http://www.slideshare.net/ikedai/serverspec)
- [Docker (土曜日に podcast します) - naoyaのはてなダイアリー](http://d.hatena.ne.jp/naoya/20130620/1371729625)
- [Dockerで立てたコンテナにsshで接続する - $shibayu36->blog;](http://shibayu36.hatenablog.com/entry/2013/12/07/233510)
