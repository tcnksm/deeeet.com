---

title: 'OSXでboot2dockerを使う'
date: 2014-01-28
comments: true
categories: docker
---

[公式のDocker Client for OSXがリリース](http://deeeet.com/writing/2014/01/10/docker-from-osx/)されて，OSXでDockerを使うのはちょっと楽になった．ただ，Docker自体はVritualBoxなどのVM上で実行する必要があり，VMの起動には時間がかかるので寿命が縮む．[boot2docker](https://github.com/steeve/boot2docker)を使うと，他と比べて断然早くVMを起動でき，すぐにDockerが使える．

[boot2docker](https://github.com/steeve/boot2docker)というのは，[Tiny Core Linux](http://tinycorelinux.net/)をベースにしたDocker実行のみに特化した軽量版のLinuxディストリビューション．特化しているため起動はとても[速い](http://www.youtube.com/watch?v=QzfddDvNVv0)．前からあるが，VirtualBoxをわざわざ起動する必要があったりなど，ちょっと使うのはめんどくさかった．

Vagrantの作者であるMitchell HashimotoさんがPackerを使って[boot2dockerのVagrant Box](https://github.com/mitchellh/boot2docker-vagrant-box)を作ったため，Vagrant経由で簡単にboot2dockerを使うことができるようになった．

ということで，使ってみた．

[tcnksm/boot2docker-osx](https://github.com/tcnksm/boot2docker-osx)

`Vagrantfile`は以下．

```ruby
DOCKER_PORT = 5422

Vagrant.configure("2") do |config|
  config.vm.box = "boot2docker-0.4.0"
  config.vm.box_url = "https://github.com/mitchellh/boot2docker-vagrant-box/releases/download/v0.4.0/boot2docker.box"
  config.vm.network "forwarded_port", guest: DOCKER_PORT, host: DOCKER_PORT
  config.vm.provision :shell, :inline => <<-PREPARE
  INITD=/usr/local/etc/init.d/docker
  sudo sed -i -e 's/docker -d .* $EXPOSE_ALL/docker -d -H 0.0.0.0:#{DOCKER_PORT}/' $INITD
  sudo $INITD restart
  PREPARE
end
```

OSXのDockerクライアントを使うためにport fowardingの設定と，Docker deamonのバインドアドレスの変更のみをしている．

あとは起動（`vagrant up`）するだけ，大体20秒くらいで立ち上がる．例えば，[Ubuntu precise 64 box](http://www.vagrantbox.es/)+docker provisionと比べると，半分以下の時間で立ち上がる．

問題がないわけではなく，いくつかVagrantのprovisioningが使えない．例えば，自分が触った中では，private IPの設定やdocker provisioningなどが使えなかった．imageのビルドもちょっと遅い．それでも起動は速いので，とりあえず軽くコマンド叩きたいとか，で使うのが良さそう．がっつり開発するときは，普通のBox使ってる．

ちなみに，OSXからDockerを使うためのヘルパーはたくさん出てきている．例えば，[docker-osx](https://github.com/noplay/docker-osx)や，今回のboot2dockerを使った[dvm](https://github.com/fnichol/dvm)などがある．でも，今回のように簡単なVagrantfileさえ準備できれば簡単に使えるから自分は使わないかなと．








