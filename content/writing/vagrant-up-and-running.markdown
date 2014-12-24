---

title: '"実践Vagrant"を読んだ'
date: 2014-02-25
comments: true
categories: Reading vagrant
---

[O'Reilly Japan - 実践 Vagrant](http://www.oreilly.co.jp/books/9784873116655/)

Vagrantは普通に問題なく使えているし，本をわざわざ読む必要もないと思ったが，以下のようなモチベーションで購入．

- Mitchell Hashimoto氏の設計思想的な部分を知りたかった
- プラグインをつくりたかった
- 落ち穂拾い

まず，設計思想．1章に"Vagrant道"という節があり，ユースケースというか，Vagrantを使った高レベルなワークフローが説明されている．開発者や運用技術者からみて，普段のプロジェクトの中でVagrantがどのような役割を果たすのかが簡単にまとめられている．Vagrantが近年の開発環境にあまりに自然に入り込んできたのは，このようなビジョンがあってからこそだと思う．誰もが理解できるビジョンを掲げ，それをコードに落とし込むところがMitchell氏のすごさなんだと改めて認識した．開発者としても，ビジョン->コードの流れを参考にしたい．

## プラグインの開発

次にプラグイン．これを読んでからいくつかプラグインを作ってみた．公開したのは以下．

- [プロビジョニングの終了をiOS/Androidに通知するVagrantのpluginつくった](http://deeeet.com/writing/2014/02/19/vagrant-pushover/)
- [他人に共有したくない設定をVagrantfileに書くためのpluginつくった](http://deeeet.com/writing/2014/02/24/vagrant-secret/)

プラグインを作るのはとても簡単．本書でカバーされているのは，以下．

- 新しいサブコマンドの開発 (command)
- 新しい設定オプションの開発 (config)
- `config.vm.provision :docker`のような新しいプロビジョナーの開発 (provisioner)
- `vagrant up`のような既存動作を変更 (hook)

プラグインはrubygemsとして開発する．rubygemを作ったことがあるひとであればすんなりと開発できる．詳しくは書かないが，基本はrubyのDSLによる簡単な記述し，そのDSLの戻り値を決められたメソッドを実装したクラスにするだけ．

すこしハマった部分．本書や公式ドキュメントだと`Vagrantfile`に`Vagrant.require_plugin "my_plugin"`を記述してプラグインのテストを行うように書かれているが，自分の環境だとうまく動かなかった．そのため，プラグインをビルドして，直接システムのVagrantに読み込ませてテストを行った．毎回コマンド打つのは億劫なので，以下のようなRakeタスクを作った．

```ruby
require "vagrant-secret"
require "bundler/gem_tasks"

version = VagrantPlugins::Secret::VERSION

desc "Install plugin to system vagrant."
task :install_plugin do
    system("git add -u")
    Rake::Task[:build].execute
    system("/usr/bin/vagrant plugin install pkg/vagrant-secret-#{version}.gem")
end

desc "Uninstall plugin"
task :uninstall_plugin do
    system("/usr/bin/vagrant plugin uninstall vagrant-secret")
end

# alias
task :i => :install_plugin
task :u => :uninstall_plugin
```

ちょっとTips．プラグイン定義の先頭に以下を記述して，プラグインが実際にVagrantの中で動作しているかを確認するのがよい．これは，本書のコラムに書かれていた内容．他のVagrant pluginのプロジェクトにも採用されている．

```ruby
begin
    require "vagrant"
rescue LoadError
    raise "The Vagrant plugin must be run within Vagrant."
end
```

また，本書には書かれていないけど，プラグインはVagrantfileに直接書くことができる．例えば，OSXからDockerを簡単に使えるようにするプロジェクトである[dvm](https://github.com/fnichol/dvm/blob/master/Vagrantfile)の`Vagrantfile`でやられてたりする．本書の`apt-get`プロビジョナーを`Vagrantfile`に直接書くと，[こうなる](https://gist.github.com/tcnksm/39be2506b8a5e846cd59)．ものすごい単純なプラグインをつくる場合や，試しにつくってみたい場合はこれで足りる．

公式にも丁寧な[ドキュメント](http://docs.vagrantup.com/v2/plugins/development-basics.html)がある．また，Vagrantのコマンドそのものもプラグインとして[実装されている](https://github.com/mitchellh/vagrant/tree/master/plugins/commands)ので参考になった．

## 落ち穂拾い

最後に落ち穂拾い．ざっと読んで自分が知らなかったや，試してなかったことなどをまとめておく．

まず，ネットワークの設定について．`forward_port`や`private_network`はよく使うが，`public_network`もある．これを使うと，仮想マシンを物理マシン上のデバイスにして，仮想マシンをネットワーク上の別の物理マシンであるかのように見せることができるようになる．

これができると何が良いかというと，`private_network`のようにアクセス可能なIPを持たせるだけでなく，隔離されないので，ゲストマシンが提供するWebサイトをモバイルから確認したり，他のひとと共同作業ができるようになる．設定を有効にし，`vagrat up`してブリッジしたいデバイスを選択するだけ．

次に，複数マシン構成のクラスタのモデリング．以下のようにすれば，Webアプリ用のマシンとDB用のマシンをそれぞれ立ち上げることができる．

```ruby
Vagrant.configure("2") do |config|
    config.vm.box = "precise64"

    config.vm.define :web do |web|
        web.vm.network :private_network, ip: "192.168.50.4"
    end

    config.vm.define :db do |db|
        db.vm.network :private_network, ip: "192.168.50.5"
    end
end
```

新しいサブマシンを定義するブロックは，単にVagrantfileを作成するときの設定ブロックがもうひとつあるだけ．webやdbというのはただの設定変数．また，サブマシンの設定は，プログラミングの変数スコープのように全体的な設定（上で言うと`config.vm.box`）を引き継ぐ．

`vagrant up`や`vagrant reload`といったコマンドは，対象マシンの名前を指定して実行できるようになる．例えば，`vagrant provision web`とすれば，webと名付けられたサブマシンのみのプロビジョニングが実行される．複数のサブマシンが存在するとき，引数なしでコマンドを実行すると全てのマシンが対象となる．

複数のサブマシンを同一のネットワーク上に配置することができる．Vagrantはデフォルトで，255.255.255.0というサブネットマスクを使用するため，上の例のように最初の3つの部分（オクテット）が同じであれば，マシンは同一ネットワーク上に存在することになる．

```bash
$ vagrant ssh web
$ ping 192.168.50.5
vagrant@precise64:~$ ping 192.168.50.5
PING 192.168.50.5 (192.168.50.5) 56(84) bytes of data.
64 bytes from 192.168.50.5: icmp_req=1 ttl=64 time=0.483 ms
64 bytes from 192.168.50.5: icmp_req=2 ttl=64 time=0.374 ms
64 bytes from 192.168.50.5: icmp_req=3 ttl=64 time=0.327 ms
```

最後にボックス．Vagrantのボックスは，拡張子こそ`.box`となっているが，単なるtarファイルに過ぎない．以下のファイルが含まれる．

- `box-disk.vmdk`: VirtualBoxのエクスポートで得られる．圧縮されたハードディスク．
- `bok.ovf`: VirtualBoxのエクスポートで得られる．マシンを動作させるための仮想ハードウェア．
- `Vagranfile`: 普段使うものと同じ．デフォルト値などを記述する．
- `metadata.json`: Vagratに対して，このボックスが使うシステムを伝える．

プロビジョナーを走らせたり，手動であれこれセットアップしたVagrant環境をboxとして吐き出すことができる．以下のようにするだけ．これで`package.box`が作成される．

```bash
$ vagrant package
```

VirtualBoxを使って，スクラッチで新しいボックスを生成することもできる．Vagrantユーザの作成やSSHサーバのインストールなどが必要になる．

以上．

わかったつもりでいても知らない設定などが多く含まれていたのでよかった．Vagrantを既に使っている人は，公式のドキュメントやその他のブログポストなどで十分足りると思う（それがVagrantというツールのすごいところでもある）．なぜ，Vagrantが良いのかわからないレベルだと本書はとても最適な一冊だと思う．また，プラグインを作りたいひとにもおすすめできる．デブサミの会場で先行販売されてたので思わず購入したが，発売日に電子版の販売がアナウンスされてた．

あるべきなのになかなかなかった．なければしんどいのに，あれば空気のように当然のものとして使ってしまう．それがVagrant．


