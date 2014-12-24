---

title: '公式のDocker client for OSXがリリース'
date: 2014-01-10
comments: true
categories: docker
---

2014.01.02にOSXのdocker clientが[リリースされた](https://github.com/dotcloud/docker/blob/master/CHANGELOG.md#073-2014-01-02)．DockerはGoで書かれているので，OSX上で[自分でビルドして使ってる人もいた](https://coderwall.com/p/r6ivdq)が，今回は公式のバイナリリリース．さらに，Homebrewのhomebrew-binaryレポジトリにFormulaも[追加され](https://github.com/Homebrew/homebrew-binary/commit/9cbb003caab046c36aaa19c01a5357c296306198)，すぐに使えるようになった．

clientなので，VMもしくはリモートに立てたDocker deamonに対してローカルからコマンドが叩けるようになったということ．とりあえず，ローカルにVM立てて触ってみた．

[tcnksm/docker-osx](https://github.com/tcnksm/docker-osx)

まず，dokcer clientのインストール．

```
$ brew update
$ brew tap homebrew/binary
$ brew install docker
```

Vagrantfileは以下のようにする（VagrantはDocker provisioningが有効な1.4以上を使うこと）．

```
#Vagrantfile

DOCKER_URL = "192.168.50.4"
DOCKER_PORT = 5422

Vagrant.configure("2") do |config|
  config.vm.box = "precise64"
  config.vm.box_url = "http://files.vagrantup.com/precise64.box"
  config.vm.network :private_network, ip: DOCKER_URL
  config.vm.provision :docker do |d|
    d.pull_images "base"
  end
  config.vm.provision :shell, :inline => <<-PREPARE
    sudo sed -i -e 's/DOCKER_OPTS=/DOCKER_OPTS=\"-H 0.0.0.0:#{DOCKER_PORT}\"/g' /etc/init/docker.conf
    sudo service docker stop
    sudo service docker start
  PREPARE
end
```

やってることは以下．

- Vagrant VMにIPアドレス”192.168.50.4”割り当て
- Dockerのbaseイメージをpull
- `/etc/init/docker.conf`を書き換えてDocker deamonのバインドアドレスを変更

VMを立ち上げる．

```bash
$ vagrant up
```

次に，dockerの動くホストの場所を示す環境変数を設定する．このIPとPORTはVagrantfileの`DOCKR_URL`と`DOCKR_PORT`で変更できる．

```
export DOCKER_HOST="192.168.50.4:5422"
```

これだけで使える．

```
$ docker build -t tcnksm/sample .
```

以前はssh越しにコマンド叩くなどしていたが，大分楽になった．[boot2docker](https://github.com/steeve/boot2docker)を使った[dvm](https://github.com/fnichol/dvm)も良さそう．あとで試してみる．

参考

- [Introducing dvm - Docker in a box for Unsupported Platforms, like the Mac](http://hw-ops.com/blog/2014/01/07/introducing-dvm-docker-in-a-box-for-unsupported-platforms/)



