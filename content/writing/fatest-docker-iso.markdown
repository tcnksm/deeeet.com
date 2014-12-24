---

title: '10秒でDockerを起動する'
date: 2013-12-09
comments: true
categories: docker
---

[boot2docker](https://github.com/steeve/boot2docker)

boot2dockerはDockerを実行することに特化した軽量版のLinuxディストリビューション．[Tiny Core Linux](http://tinycorelinux.net/)をベースにしている．isoイメージ自体もDockerから作られている．[デモ](http://www.youtube.com/watch?v=QzfddDvNVv0)を観るとその起動速度がわかる．現在バージョン0.3．

```bash
wget https://github.com/steeve/boot2docker/releases/download/v0.3.0/boot2docker.iso
```

あとはVirtualboxなどから起動すればすぐにDockerを使える．

めちゃめちゃ軽量なので，普段使っているパッケージがなかったり，そもそもそのパッケージを入れるのが大変だったりする．今のところDockerのコマンドを試したりするに良さそう．

参考

- [Boot Docker in 10 seconds on any VM or physical machine with this 30 MB ISO](https://news.ycombinator.com/item?id=6851850)
- [Tiny Core Linux, Micro Core Linux, 12MB Linux GUI Desktop, Live, Frugal, Extendable](http://tinycorelinux.net/)
- [Install TinyCore Linux on VirtualBox](http://machinelearning1.wordpress.com/2012/12/14/install-tinycore-linux-on-virtualbox-step-by-step/)
