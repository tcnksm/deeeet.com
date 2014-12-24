---

title: 'Packerを使ってChef/Puppet/AnsibleでDockerのイメージをつくる'
date: 2014-03-02
comments: true
categories: docker packer
---

[Packer](http://www.packer.io/)は，Vagrantの作者であるMitchell Hashimoto氏によって開発が進められているVirtualBoxやVMWare，Amazon EC2などの仮想マシンのテンプレートの作成を行うツール．VagrantのVirtualBox用のBoxを作るveeweeに置き換わるツールとして知られている．最近のアップデートでDockerのイメージのビルドをサポートした．

## TL;DR

[Packerを使えばDockerのイメージをDockerfileを使わずビルドすることができる](http://www.packer.io/docs/builders/docker.html#toc_4)

つまり，Dockerfileの特有な記述を使わず，今まで慣れ親しんできたChefやPuppet，Ansibleのようなプロビジョニングツールを使ってDockerのイメージをビルドできる．

参考

- [DockerイメージのビルドにPackerを使うべき理由](http://deeeet.com/writing/2014/03/03/why-building-docker-by-packer/)

## サンプル

[tcnksm/packer-docker](https://github.com/tcnksm/packer-docker)

サンプルコードは全て上のレポジトリにある．ChefとPuppetとAnsibleで最小限で単純なサンプルを試した．

## 準備（Vagrantfile）

実行はすべてVagrantのVM上で行う．Vagrantの1.4以上がインストールされていれば，以下のVagrantfileを使えばすぐに試せる．

```ruby
Vagrant.configure("2") do |config|
    config.vm.box = "precise64"
    config.vm.box_url = "http://files.vagrantup.com/precise64.box"
    # 
    config.vm.provision :docker do |d|
        d.pull_images "ubuntu"
    end
    
    config.vm.provision :shell, :inline => <<-PREPARE
apt-get -y update
apt-get install -y wget unzip curl

mkdir /home/vagrant/packer
cd /home/vagrant/packer
wget https://dl.bintray.com/mitchellh/packer/0.5.2_linux_amd64.zip
unzip 0.5.2_linux_amd64.zip
echo "export PATH=$PATH:/home/vagrant/packer" > /home/vagrant/.bashrc
PREPARE

end
```

DockerとPackerの最新版のインストールしているだけ（注: PackerはOSX上でも動くが，OSXのDocker Clientの[バグ](https://github.com/dotcloud/docker/issues/4023)のためにうまく連携できなったので，PackerもVagrant上で実行している）．

## 準備（Chef）

ここでは例として，apacheのインストールを行うクックブックとレシピを準備する．

```
$ knife cookbook create apache -o site-cookbooks
```

```
# site-cookbooks/apache/recipes/default.rb
execute "apt-get update"
package "apache2" do
    action :install
end
```

## テンプレート

Packerは，json形式での設定ファイルを基に仮想マシン/イメージのビルドを行う．ここでは，Ubuntuベースイメージから上で作成したChefのレシピを使ってDockerのイメージを作成する．

```json
# machine_chef.json
{
    "builders":[{
        "type": "docker",
        "image": "ubuntu",
        "export_path": "image.tar"
    }],
    
    "provisioners":[
    {
        "type": "shell",
        "inline": [
            "apt-get -y update",
            "apt-get install -y curl"
        ]
    },
    {
        "type": "chef-solo",
        "cookbook_paths": ["site-cookbooks"],
        "run_list": ["apache::default"]
    }
    ],
    
    "post-processors": [{
        "type": "docker-import",
        "repository": "tcnksm/packer-chef",
        "tag": "0.1"
    }]
}
```

Packerの設定ファイルは以下の3つの要素からなる．

- builders
- provisioners
- post-processors

**builders**には，主に作成されるテンプレートの種類や詳細の設定を記述する．作りたいマシンの種類，つまり，isoからVagrantのBoxを作りたいのか，Amazon EC2のAMIを作りたいのか，DigitalOcean用のイメージを作りたいのかによって記述は大きく異なる．例では，タイプをDockerとして，ベースイメージにubuntuを指定している．

**provisioners**には，プロビジョニングの設定を記述する．どの種類のマシンを作成する場合であっても，ShellscriptからChef，Puppet，Ansibleとった慣れ親しんだプロビジョニングツールが使える．Packerのすごいのはこの部分ではないかと思っている．Vagrantのプロビジョニングを利用したことある人には読みやすいと思う．例では，inline shellによるプロビジョニングとChefによるプロビジョニングを指定している．

（注: 現時点では，ChefのプロビジョニングのみChefのインストールまで自動で行ってくれる．ただし，その際にcurlを使うのでそれだけは自分でインストールしている．PuppetやAnsibleは事前に自分でインストールする必要がある．詳細は[サンプルコード](https://github.com/tcnksm/packer-docker)を参照．）

**post-processors**には，作成したテンプレートに対する後処理の設定を記述する．VagrantのBoxであればBoxの名前を指定する．今回の例では，Dockerイメージのレポジトリ名とタグ名を指定している．

## イメージのビルド

以下を実行するだけ．

```bash
$ packer build machine_chef.json
```

終了すれば，`tcnksm/packer-chef:0.1`というDockerイメージが作られている．

```bash
$ docker images
```

以上．

## まとめ

今まで使ってきたプロビジョニングツールを使えるのはすごくよい．というもの，まだまだChefやPuppetといったツールは使われていくだろうし，知見も多く蓄積されているから．また，Dockerfileはdockerに特有なので他のツールに移植するといったこと難しい．

かといってDockerfile使われなくなるか，というと全然そんなことはなささそう．現時点でのPackerでDockerのイメージをビルドする際の欠点は，Stepごとのスナップショットをとるといったdockerの良さが使えない（ただ，[将来サポートされる予定らしい](http://deeeet.com/writing/2014/03/03/why-building-docker-by-packer/)）ことや，`EXPOSE`とかが簡単に書けないことなどがある．

- [ssig33.com - Docker をプロダクトのデプロイに使う](http://ssig33.com/text/Docker%20%E3%82%92%E3%83%97%E3%83%AD%E3%83%80%E3%82%AF%E3%83%88%E3%81%AE%E3%83%87%E3%83%97%E3%83%AD%E3%82%A4%E3%81%AB%E4%BD%BF%E3%81%86)
- [Docker, Mesos, Sensu等を利用したBlue-Green Deploymentの仕組み - $shibayu36->blog;](http://shibayu36.hatenablog.com/entry/2013/12/23/153019)

とかを見てると，とインフラレイヤーやアプリケーションレイヤーにわけて差分ビルドをしている．変更が少ないかつ，Chefやpuppetの知見が多くありそうなインフラレイヤーのイメージのビルドにはPacker+Chef，Puppetを使い，変更が多くありそうなアプリケーションレイヤはDockerfileで直接書くとかにすると良さそうと思った．


参考

- [Docker builder](http://www.packer.io/docs/builders/docker.html)
- [DockerイメージのビルドにPackerを使うべき理由](http://deeeet.com/writing/2014/03/03/why-building-docker-by-packer/)
- [Packer雑感](http://deeeet.com/writing/2014/03/02/packer/)
