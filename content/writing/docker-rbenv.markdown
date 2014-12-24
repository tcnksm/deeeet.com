---

title: 'Dockerで複数バージョンのrubyがインストールされたイメージを作る'
date: 2013-12-12
comments: true
categories: docker
---

[tcnksm/docker-rbenv](https://github.com/tcnksm/docker-rbenv)

これにより，rbenvにより複数バージョンのrubyがインストールされたイメージをつくることができる．

イメージはdocker.ioに置いてある（[tcnksm/rbenv](https://index.docker.io/u/tcnksm/rbenv/)）ためすぐに使うことができる．

```
$ docker pull tcnksm/rbenv
```

もしくはDockerfileで

```
FROM tcnksm/rbenv
```

とするだけ．

具体的な使い方は，[Dockerで継続的インテグレーション](http://deeeet.com/writing/2013/12/13/ci-with-docker/)に書いた．例えば，[guard](https://github.com/guard/guard)と連携して，複数バージョンに対するrspecテストをローカルで実現するなど．

## Dockerfile

以下では，このイメージを作成するためのDockerfileの詳細な説明とオリジナルのイメージを作成する方法について書く．Dockerfileは以下．

```
FROM base

MAINTAINER tcnksm "https://github.com/tcnksm"

# Install packages for building ruby
RUN apt-get update
RUN apt-get install -y --force-yes build-essential curl git
RUN apt-get install -y --force-yes zlib1g-dev libssl-dev libreadline-dev libyaml-dev libxml2-dev libxslt-dev
RUN apt-get clean

# Install rbenv and ruby-build
RUN git clone https://github.com/sstephenson/rbenv.git /root/.rbenv
RUN git clone https://github.com/sstephenson/ruby-build.git /root/.rbenv/plugins/ruby-build
RUN ./root/.rbenv/plugins/ruby-build/install.sh
ENV PATH /root/.rbenv/bin:$PATH
RUN echo 'eval "$(rbenv init -)"' >> /etc/profile.d/rbenv.sh # or /etc/profile

# Install multiple versions of ruby
ENV CONFIGURE_OPTS --disable-install-doc
ADD ./versions.txt /root/versions.txt
RUN xargs -L 1 rbenv install < /root/versions.txt

# Install Bundler for each version of ruby
RUN echo 'gem: --no-rdoc --no-ri' >> /.gemrc
RUN bash -l -c 'for v in $(cat /root/versions.txt); do rbenv global $v; gem install bundler; done'
```

基本的には普段rbenvとruby-buildによるインストールと同じことをしている．つまり，

1. ベースイメージを持ってくる(`FROM base`)
1. rubyのビルドに必要なパッケージのインストール(`RUN apt-get ...`)
1. [rbenv](https://github.com/tcnksm/docker-rbenv/tree/master)のダウンロード
1. [ruby-build](https://github.com/sstephenson/ruby-build)のダウンロード
1. rbenvの環境変数を設定(`ENV PATH /root/.rbenv/bin:$PATH`)
1. ログインコマンドの設定(`RUN echo 'eval "$(rbenv init -)"' >> /etc/profile.d/rbenv.sh`)
1. インストールしたいrubyのバージョンを記述した`versions.txt`をイメージ内に配置
1. `versions.txt`に記載されたバージョンを`rbenv install`でインストール
1. `versions.txt`に記載されたバージョンごとに`bundler`をインストール

別のバージョンがインストールされたイメージを作りたい場合は`verions.txt`を編集するだけ．


さらに，Gemfileをもとに基本的なrubygemsをインストールしたい場合はDockerfileを以下のようにする．

```
ADD ./Gemfile /root/Gemfile
RUN bash -l -c 'cd /root/; for v in $(cat rubies.txt); do rbenv global $v; bundle install; done'
```

イメージの作成は以下のコマンドで行う．

``` bash
docker build -t USERNAME/IMAGENAME .
```

docker.ioに上げたい場合は以下を実行する．

``` bash
docker login
docker push USERNAME/IMAGENAME 
```

参考

- [Docker for Rubyists](http://www.sitepoint.com/docker-for-rubyists/)
- [docker-plenv-vanilla](https://github.com/miyagawa/docker-plenv-vanilla)
- [Docker虎の巻](https://gist.github.com/tcnksm/7700047)








