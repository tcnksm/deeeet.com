---

title: 'カーネル読書会 #111でLTしてきた+Dockerによる次世代のPaaS'
date: 2014-05-30
comments: true
categories: docker
---

<script async class="speakerdeck-embed" data-id="231be5a0ca170131569646e151884671" data-ratio="1.33333333333333" src="https://speakerdeck.com/assets/embed.js"></script>

["DockerでPaaSをつくる #ylug_111"](https://speakerdeck.com/tcnksm/dockerdepaaswotukuru-number-ylug-111)

[@hyoshiok](https://twitter.com/hyoshiok)さんにカーネル読書会でLTをする機会をいただいた．内容はDockerの応用の１つでOSSのPaaSをつくるというもの．Herokuの内部実装を説明しつつ，Dockerによりいかに簡単にPaaSを作れるようになったかを話した．

最後にちょっと話した，次世代のPaaSもしくはHeroku++を目指す[Flynn](https://flynn.io/)は，野心的ですごく面白い．簡単にいうとFlynnはHerokuの簡便さとAmazon EC2のような自由度を兼ね備えたPaaSを目指している．Flynnは以下の2つのレイヤーで構成される．

- **layer0**：CoreOSのetcdによるサービスディスカバリー層
- **layor1**：Herokuのようなアプリケーションのデプロイ+管理層

このプロジェクトには[dokku](https://github.com/progrium/dokku)の作者である[@progrium](https://github.com/progrium)さんも関わっている．dokkuは単にProof of conceptで，実際にこの辺のコミュニティが目指してるのはFlynnのような次世代のPaaSなんだろうなと思う（詳しくは["The Start of the Age of Flynn"](http://progrium.com/blog/2014/02/06/the-start-of-the-age-of-flynn/)を参考）．

Flynnについては最近いろいろ調べたりしているので，そのうちちゃんとまとめたい．とりあえず，参考文献だけ載せる．

- [PaaSに何が起きているのか？](http://www.infoq.com/jp/news/2014/02/paas-future)
- [The Start of the Age of Flynn](http://progrium.com/blog/2014/02/06/the-start-of-the-age-of-flynn/)
- [Flynn vs. Deis: The Tale of Two Docker Micro-PaaS Technologies | CenturyLink Labs](http://www.centurylinklabs.com/flynn-vs-deis-the-tale-of-two-docker-micro-paas-technologies/)
- [Welcome to Flynn](https://github.com/flynn/flynn)
- [5by5 | The Changelog #99: Flynn, Tent, open source PaaSes and more with Jeff Lindsay and Jonathan Rudenberg](http://5by5.tv/changelog/99)
- [5by5 | The Changelog #115: Flynn updates with Jonathan Rudenberg and Jeff Lindsay](http://5by5.tv/changelog/115)


