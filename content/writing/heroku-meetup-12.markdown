---

title: 'Heroku Meetup #12でLTしてきた+Heroku on Docker'
date: 2014-05-23
comments: true
categories: docker
---

<script async class="speakerdeck-embed" data-id="8c6ce790c3cf0131b3ad163a5c5b95ea" data-ratio="1.33333333333333" src="http://speakerdeck.com/assets/embed.js"></script>

["Go Web ApplicationをHerokuにデプロイ + Heroku on Docker #herokujp"](https://speakerdeck.com/tcnksm/go-web-applicationwoherokunidepuroi-plus-heroku-on-docker-number-herokujp)

[Heroku Meetup #12](http://herokujp.doorkeeper.jp/events/10902)でLTをしてきた．[Martini](http://martini.codegangsta.io/)をつかったGo Web ApplicationをHerokuにぶっ込んでみたという内容で，基本は["Martini(+Ginkgo)をWerckerでCIしてHerokuにデプロイ"](http://deeeet.com/writing/2014/04/23/martini/)が基になっている．

せっかく最近Dockerを使っているので，HerokuとDockerを絡めた話がしたいなと思い，["building"](https://github.com/CenturyLinkLabs/building)を使ってDocker Container上にHerokuと同じ環境を作るという話を追加した．以下はその補足．

## Heroku on Docker

[Heroku on Docker | CenturyLink Labs](http://www.centurylinklabs.com/heroku-on-docker/)

CenturyLink Labsが開発した["building"](https://github.com/CenturyLinkLabs/buildin)というツールを使えば，Herokuのbuildpackを使うアプケーション用のコンテナを簡単に立ち上げることができる．つまり，ローカルで気軽にHerokuと同様の環境をつくることができる．

似たようなツールに["dokku"](https://github.com/progrium/dokku)というツールがある．dokkuはbuildpackとDockerを使ってmini Herokuを作ることができるツール．dokkuを立てたサーバに対してアプリケーションを`git push`すると，新しくDockerコンテナが起動し，アプリケーションのビルドが行われる（["Inside Dokku in 5 minutes"](http://banyan.me/slides/20140116/slides.html)が詳しい）．

buildingは，dokkuをシンプルにしたツール．カレントディレクトリのアプリケーションをdokkuのbuildstepというスクリプトを使ってビルドしたDockerイメージをつくり，それを使ってコンテナを立ち上げるということをやってくれる．dokkuのようにサーバを立ててssh鍵を通すといった設定なしで使える．

buildingはdokkuをカジュアルに使えるようにしたツールであると言える．

### buildingの使いどころ

以下のような場合に使える．

- ローカルにHerokuと同じ環境をつくりたい
- Cleanな環境でHerokuアプリケーションをビルドしたい
- buildpackのテストをしたい

buildingはHeroku同様にThird partyのbuildpackの追加も可能なので，それがちゃんと動作するかをテストすることもできる．

### buildingを動かす

まず，インストール．Rubygemsとして配布されている．

```bash
$ gem install building
```

あとは，動かしたHerokuアプリケーション（Rails，Node，HHVM，WordPress，Go）のディレクトリ内で以下を実行するだけ．

```bash
$ building -p 3000 tcnksm/app
```

`-p`で解放したいポート番号を指定する．`tcnksm/app`は作成したいDockerイメージ名．

これだけで，

- 専用の`Dockerfile`の作成
- イメージのビルド
- コンテナの起動

をやってくれ，ローカルにHerokuと同じ環境でアプリケーションが立ち上がる．

### buildingの動作

buildingがつくる`Dockerfile`は以下のような感じ．

```bash
FROM ctlc/buildstep:ubuntu13.10

ADD . /app
RUN /build/builder
CMD /start web
```

たいしたことはしていない．カレントディレクトリのアプリケーションを`ADD`してそれに対して，`builder`というコマンドを実行しているだけ．

builderは`ctlc/buildstep:ubuntu13.10`イメージに含まれており，dokkuの[buildstep](https://github.com/progrium/buildstep)というスクリプトの一部．これがアプリケーションの言語を判断し，その言語のBuildpackを使ってアプリケーションのビルドを行う．

## まとめ

`ctlc/buildstep:ubuntu13.10`という肝となるDockerイメージがあり，それの立ち上げ等を支援するというbuildingは新しいアプリケーションの形であるなあと思った．

最後に，Heroku Meetupで発表する機会を与えてくださった[@ayumin](https://twitter.com/ayumin)さん，ありがとうございました．がちゃぴん先生のLXCの話もとても面白く勉強になりました．


### 参考

- [Introduce of building/Docker // Speaker Deck](https://speakerdeck.com/udzura/docker)
- [【個人メモ】buildingを使って気軽にDocker containerをつくろう - Qiita](http://qiita.com/futoase/items/21167e9d064b0e336e8f)
