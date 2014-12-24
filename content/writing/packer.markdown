---

title: 'Packer雑感'
date: 2014-03-02
comments: true
categories: packer
---

[Packerを使ってChef/Puppet/AnsibleでDockerのイメージをつくる](http://deeeet.com/writing/2014/03/02/build-docker-image-by-packer/)

で初めて[Packer](http://www.packer.io/)を使った．そのときの思ったことをざっと書き留めておく．

Packerは，Vagrantの作者であるMitchell Hashimoto氏によって開発が進められているVirtualBoxやVMWare，Amazon EC2などの仮想マシンのイメージの作成を行うツール．VagrantのVirtualBox用のBoxを作るveeweeに置き換わるツールとして知られている．

[リリース時から](http://mitchellh.com/packer)PackerはVagrantのBoxを作る専用ツールとしてのイメージが強かった．実際，box作るときはベースboxを基にvagrantのプロビジョニング機能を使って`vagrant package`で済むし，ヘビーにVagrantを使うユーザのためのツールだと思っていた．また，ネット上にあるPacker関連の記事はこの用途を対象にしたものが多い．

だから，今回も基礎としてVagrantのboxの作成からやり始めた．が，正直途中で心が折れた．というのも，VirtualboxのVagrantのboxを作るときはisoイメージをベースに始めるため，KickStartとかPreseedの知識を要求される．その辺りはなじみがなくて辛かった．Redhat系のKickstartはまだ読めたが，Debian系のPreseedはしんどかった．Packerとは関係のないところで，理解が追いつかなかったために，Packerそのものの理解にたどり着くのが大変だった．

ただ，[Dockerのイメージ作成](http://deeeet.com/writing/2014/03/02/build-docker-image-by-packer/)や[Amazon EC2のAMIの作成](http://www.ryuzee.com/contents/blog/6760)をやり始めると，VirtualBoxのbox作成と比べてシンプルであり，なじみもあるため理解が進んだ．そして，**Packerはものすごくシンプルかつ強力なツール**だということがわかった．Packerを自分なりの言葉でまとめてみると，

1. builderで仮想マシンのテンプレート（ベース）の設定をする．
2. ShellscriptやChef，Puppet，Ansibleで共通のプロビジョニングをする．
3. post-processorで決められた形式（boxかdocker imageか）で仮想マシンを書き出す．

の一連の流れを自動化するツール．このとき1)と3)は基本的にはテンプレで，大体やることは決まっていると思う．自由度があるのは2)で，どのプロビジョニングツールを使って，どのようなセットアップをするかをユーザが自由に決めることができる．ちょっとしか触ってないが，2)ができることがPackerの強力な部分ではないかを思っている．

まとめると，Packerの入門をするときは，Vagrantの用のboxを作るツールという概念を捨てて，DockerイメージやAMIから始めると良いと思う．そうすれば，Packer特有の概念である，builderやpost-processorsが理解しやすい．

最後に参考文献．Packerの日本語の記事だと[ryuzeeさん](https://twitter.com/ryuzee)が既に駆け抜けている．["実践Vagrant"](http://deeeet.com/writing/2014/02/25/vagrant-up-and-running/)にもPackerの付録があり，理解の助けになった．

