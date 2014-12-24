---

title: 'Docker Meetup Tokyo #2 でLTしてきた + DigitalOceanとGCEでもDocker Applicationを動かしてみた'
date: 2014-04-13
comments: true
categories: docker
---

<script async class="speakerdeck-embed" data-id="21343140a3970131166e024e11a95d47" data-ratio="1.33333333333333" src="http://speakerdeck.com/assets/embed.js"></script>

["Docker ApplicationをDaaSにデプロイ #dockerjp // Speaker Deck"](https://speakerdeck.com/tcnksm/docker-applicationwodaasnidepuroi-number-dockerjp)

[Docker Meetup Tokyo #2](http://connpass.com/event/5640/)でLTをしてきた．Docker as a Service (DaaS) でDocker Application（Rails）を動かしてみたという内容で，基本は["OrchardにDockerアプリケーションをデプロイ"](http://deeeet.com/writing/2014/03/22/docker-orchard/)に書いたことをプレゼンにした．

発表時間は5分だけで，当日までにいろいろ試したことすべてを話すことができなかったので少し追記しておく．

LTではDockerコンテナ専用のホスティングサービスの話をしたが，それ以外のホスティングサービスでもDockerのサポートがされ始めている．例えば，DigitalOceanやGoogle Compute Engineなどがある．これらでもDocker Applicationを動かしてみた．まさに[@naoya_ito]()さんが話してたような，Build Once, Run Anywhereをやってみた感じ．

## 概要

動かすDocker ApplicationはLTで話したのと同様にRailsコンテナ（[tcnksm/rails](https://github.com/tcnksm/sample-docker-orchard/blob/master/Dockerfile)）と，DBにPostgresqlのコンテナ（[orchard/postgresql]()）で，それぞれ立ち上げて連携する．なおどちらもDocker Registryにあらかじめpushしておく．

これをローカル環境，Docker as a Service（Orchard），DigitalOcean，Google Compute Engingeで動かしてみる．

## ローカル環境

ローカル環境（OSX）では，boot2dockerを使う．

あらかじめ，Port Forwardingした上で，VMを立ち上げる．

```bash
$ boot2docker init
$ VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port3000,tcp,,3000,,3000"
$ boot2docker up
```

後は，以下でコンテナを起動するだけ．

```bash
$ docker run -d -p 5432:5432 -e POSTGRESQL_USER=docker -e POSTGRESQL_PASS=docker --name pg orchardup/postgresql
$ docker run -d -p 3000:3000 --link pg:db --name web -t tcnksm/rails 'rake db:create && rake db:migrate && rails s'
```

[http://localhost:3000]()でアクセスできる．

## Orchard（Docker as a Service）

Orchardの場合は，あらかじめログインしてホストを立ち上げておく必要がある．

```bash
$ orchard hosts create
```

あとは，以下でコンテナを起動するだけ，違いは先頭に`orchard`をつけるところ．


```bash
$ orchard docker run -d -p 5432:5432 -e POSTGRESQL_USER=docker -e POSTGRESQL_PASS=docker --name pg orchardup/postgresql
$ orchard docker run -d -p 80:3000 --link pg:db --name web -t tcnksm/rails 'rake db:create && rake db:migrate && rails s'
```

ちなみに，Docker as a Serviceについては，[@nyarla](https://twitter.com/nyarla)さんが["Docker as a Serviceの比較(2014年4月版)"](http://qiita.com/nyarla/items/2015840bb6ed955d0250)で比較されているので，参考に．

## Google Compute Engine

GCEの場合は，インスタンスを立ち上げて，Dockerをインストールする必要がある．やりかたは，公式にドキュメントがある（["Installation on Google Cloud Platform - Docker Documentation"](http://docs.docker.io/en/latest/installation/google/)）．

まず，インスタンスを立てる．

```bash
$ gcloud auth login
$ gcutil addinstance docker-playground --image=backports-debian-7
```

ログインしてdockerをインストール＆起動する．

```bash
$ gcutil ssh docker-playground
$ curl get.docker.io | bash
$ sudo update-rc.d docker defaults
```

後は，コンテナを起動するだけ．

```bash
$ sudo docker run -d -p 5432:5432 -e POSTGRESQL_USER=docker -e POSTGRESQL_PASS=docker --name pg orchardup/postgresql
$ sudo docker run -d -p 80:3000 --link pg:db --name web -t tcnksm/rails 'rake db:create && rake db:migrate && rails s'
```

インスタンスに外部からアクセスできるようにするためには，ポートを解放しておく必要がある．

```bash
$ gcutil addfirewall http --allowed=tcp:80
```

ちなみにGCEが提供している[GoogleCloudPlatform/docker-cloud](https://github.com/GoogleCloudPlatform/docker-cloud)を使うと，Proxy噛ましてローカルからコマンドを叩けるようになる．

## DigitalOcean

DigitalOceanの場合は，以下のようなVagrantfileを準備する．

```ruby
Dotenv.load

Vagrant.configure('2') do |config|
    config.vm.hostname = "#{ENV['VM_HOSTNAME']}"

    config.vm.provider :digital_ocean do |provider, override|
        override.ssh.private_key_path = '~/.ssh/id_rsa'
        override.vm.box = 'digital_ocean'
        override.vm.box_url = "https://github.com/smdahlen/vagrant-digitalocean/raw/master/box/digital_ocean.box"
        provider.client_id = "#{ENV['CLIENT_ID']}"
        provider.api_key   = "#{ENV['API_KEY']}"
        provider.image     = 'CentOS 6.4 x64'
        provider.region    = 'San Francisco 1'
        provider.size      = '512MB'
        provider.ca_path   = '/usr/local/opt/curl-ca-bundle/share/ca-bundle.crt'
        provider.ssh_key_name = "#{ENV['SSH_KEY_NAME']}"
    end

    config.vm.provision :docker do |d|
        d.run "pg", image: "orchardup/postgresql", args: "-d -p 5432:5432 -e POSTGRESQL_USER=docker -e POSTGRESQL_PASS=docker"
        d.run "web", image: "tcnksm/rails", args: "-p 80:3000 -link pg:db", cmd: "'rake db:create && rake db:migrate && rails s'"
    end
end
            
```

あとは，立ち上げるだけ．

```bash
$ vagrant up --provider=digital_ocean
```

## まとめ

いろいろ試してみたがまだまだ分からんというのが現状．自分的にはOrchardの軽さは好きだし，DigitalOceanはVagrantで使い慣れてて好きってのもある．LTの最後にも話したようにまだまだ立ち上げることばかりを考えすぎていて，実際の運用のことが抜けている．こういうホスティングサービスの選択も運用のことや実現したいことが明確になってくれば自然と決まってくるのかなと思う．

ただ，Docker Applicationのポータビリティは実際に手を動かしてみてすごいなと実感できた．

最後にDocker Meetupで，LTする機会をつくって頂いた，主催者の[@mainyaa](https://twitter.com/mainyaa)さんと[@kazunori_279](https://twitter.com/kazunori_279)さん，他のスタッフのみなさんありがとうございました．楽しかったです．


### 参考

- ["Dockerアプリケーションのポータビリティを考える #dockerjp // Speaker Deck"](https://speakerdeck.com/naoya/dockerapurikesiyonfalsepotabiriteiwokao-eru-number-dockerjp)
- ["Docker Meetup Tokyo #2 を主催＆話してきた #dockerjp - Happy New World"](http://d.hatena.ne.jp/mainyaa/20140411/p1)
- ["Docker Meetup Tokyo #2　まとめ - /dev/null"](http://gitpub.hatenablog.com/entry/2014/04/12/020901)






