---

title: 'Dockerで継続的インテグレーション'
date: 2013-12-13
comments: true
categories: docker
---

[Dockerで複数バージョンのrubyがインストールされたイメージを作る](http://deeeet.com/writing/2013/12/12/docker-rbenv/)を使って，ローカルでTravis CI的なビルドテストを実現する方法を書く．

## 準備 (OS X)

Vagrantを使う．バージョン1.4からはDockerのprovisioningに対応してるのでそれを使う．
[Download Vagrant - Vagrant](http://www.vagrantup.com/downloads.html)より.dmgをダウンロードしてきてインストール.

インストールしたら，rubyプロジェクトに移動して以下を実行する．

``` bash
vagrant init precise64 http://files.vagrantup.com/precise64.box
```

Vagrantfileを以下のように編集する．ここでは，[docker-rbenv](https://github.com/tcnksm/docker-rbenv)で作成した，複数バージョンのruby (1.8,7と1.9.3，2.0.0)とそれぞれにbundlerがインストールされたDockerイメージ[tcnksm/rbenv-rubygems](https://index.docker.io/u/tcnksm/rbenv-rubygems/)を用いる．

``` ruby
Vagrant.configure("2") do |config|
    config.vm.box = "precise64"
    config.vm.provision :docker do |d|
        d.pull_images "tcnksm/rbenv"
    end
end
```

あらかじめ仮想サーバを起動しておく．

```
vagrant up
```

Dockerの実行は仮想サーバーへのssh経由で行う．

```
vagrant ssh-config --host docker-host >> ~/.ssh/config
```

(注: Vagrant1.4のバグでsshの設定以外の出力をすることがあるので，適宜`~/.ssh/config`を編集してそれを消す)


## 実行したいテストの記述

プロジェクトのルートに実行したいテストをシェルスクリプトで記述する．

``` bash
# docker.sh

for v in 1.8.7-p371 1.9.3-p392 2.0.0-p353
do
    rbenv global $v
    bundle
    rspec
done            
```

記述しているのはバージョンをそれぞれ1.8.7，1.9.3，2.0.0と切り替えて，それぞれに対してrubygemsをインストールして，rspecテストを実行している．(毎回bunldeを実行するのがたるい場合は，あらかじめbundleを実行してそれをコミットしてイメージを作ってしまえばよい，例えば，[Using Docker and Vagrant on Mac OS X with a Ruby on Rails application](http://blog.powpark.com/2013/11/11/using-docker-and-vagrant-on-mac-osx-for-a-ruby-on-rails-app/)も同様のことをしている)


## テストの実行

OS X

```
ssh docker-host docker run -v '/vagrant:/work' -w /work tcnksm/rbenv-rubygems sh -ex docker.sh
```

ssh経由で，dockerを実行する．

Linux

```
docker run -v "$PWD:/work" -w /work tcnksm/rbenv-rubygems sh -ex docker.sh
```


`-v`でプロジェクトのディレクトリをdockerのイメージ内にマウントする．`-w`でカレントディレクトリをマウントしたディレクトリに変更．後は，上で記述したテストを実行するだけ．コンテナは破棄されるのでこれらは何度も実行できる．しかもイメージのpullなどは済んでいるため，起動などの時間がない．テストの時間のみ．

## git-hook

`git push`もしくは`git commit`するたびにテストを走らせるには，`.git/hooks`内のファイルを編集すればよい．例えば，`git push`する度にテストを行いたい場合は，`.git/hooks/pre-push`を作成する．例えば, OSXの場合は以下のように記述する．

```
# pre-push
ssh docker-host docker run -v '/vagrant:/work' -w /work tcnksm/rbenv-rubygems sh -ex docker.sh
```

## Guard

Guardと連携して，.rbファイルが更新される度にテストを実行する場合は，`Guardfile`を以下のように編集する．

```
guard :rspec do
  watch(%r{^spec/.+_spec\.rb$}) { `ssh docker-host docker run -v '/vagrant:/work' -w /work tcnksm/rbenv sh -ex docker.sh` }
end
```

## まとめ

上記を簡単なプロジェクトを作成してやってみたが，爆速．guardを使っても勝手に走ってるので気にならない．これらを作るのはとても簡単だった．これは，rubyはノウハウが溜まっていて，これするときにはこれというのがほとんど定型的になっているからだと思う．コードに落としやすい．

## 今後の課題

- `.travis.yml`のような設定ファイルを準備するだけにしたい（シェルスクリプトを書くのはたるい）
- テストの実行結果を巧くキャッチしたい

## 参考

- [Docker for Rubyists - SitePoint](http://www.sitepoint.com/docker-for-rubyists/)
- [A Docker Dev Environment in 24 Hours!](http://blog.relateiq.com/a-docker-dev-environment-in-24-hours-part-2-of-2/)
- [miyagawa/docker-plenv-vanilla](https://github.com/miyagawa/docker-plenv-vanilla)
- [Rebuild: 14: DevOps with Docker, chef and serverspec (naoya, mizzy)](http://rebuild.fm/14/)
- [Docker 虎の巻](https://gist.github.com/tcnksm/7700047)

