---

title: 'golang勉強会でGo製ツールの配布方法について話してきた'
date: 2014-08-11
comments: true
categories: golang
---

<script async class="speakerdeck-embed" data-id="1e6e28a001af013285ba2abb871a81a5" data-ratio="1.77777777777778" src="http://speakerdeck.com/assets/embed.js"></script>

["Ship your CLI tool built by golang to your user #golangstudy"](https://speakerdeck.com/tcnksm/ship-your-cli-tool-built-by-golang-to-your-user-number-golangstudy)

["Golang勉強会"](http://connpass.com/event/7814/)で発表してきた．Go言語で作成したツールをクロスコンパイルして，複数プラットフォームに配布する方法について話してきた．自分がGoをはじめた理由の一つがクロスコンパイルによる配布のしやすさであり，いろいろ実践したりそれ用のツールを作ったりしてきたのでそれをまとめた．

以下の視点で話したつもり，

- 自動化により開発者の負担を減らす
- ユーザがツールを使うまでの負担を減らす

["わかりやすいREADME.mdを書く"](http://deeeet.com/writing/2014/07/31/readme/)にも似たようなことを書いたけど，自分のような無名なエンジニアの作ったツールであってもユーザに使ってもらうには，2点目のような視点を大切にしないといけないと思う．

発表は以下の記事をもとにしている．

- ["HerokuとGithubを使った統一的なツール配布"](http://deeeet.com/writing/2014/08/07/github-heroku-dist/)
- ["高速に自作パッケージをGithubにリリースするghrというツールをつくった"](http://deeeet.com/writing/2014/07/29/ghr/)
- ["Go言語のツールをクロスコンパイルしてGithubにリリースする"](http://deeeet.com/writing/2014/07/23/github-release/)
- ["HomeBrewで自作ツールを配布する"](http://deeeet.com/writing/2014/05/20/brew-tap/)

## 感想

特に以下の2つの発表が面白かった．

- ["GOとライセンス"](https://speakerdeck.com/nabeken/go-and-license)
- "How To Think Go"

まず，ライセンスの話．自分でバイナリ配布のことをいろいろやっておきながら，このことを全く考慮してなかった．ソースコードとバイナリではライセンス異なることを知らなかった．めんどくせえけど大事だと思います．参考文献読みます．

あと[@lestrrat](https://twitter.com/lestrrat)さんの"How to Think Go"．最高でした．
rebuild.fmの["Rebuild: 42: When in Golang, Do as the Gophers Do (lestrrat)"](http://rebuild.fm/42/)で話していたことを発表としてさらにパワーアップさせたという印象（これ5回以上聴いたので）．
特に自分のためになったのが「Goで構造体設計」の話．今まで見たGoでのモデリングの説明で一番しっくりきた．
「オブジェクトの階層を作ろうという考え方をしない（'動物'を作ろうとしない）」，「'草食動物'ではなく'草を食べる'というinterfaceを考えてメソッドをそろえる」
などなど，いかにオブジェクト思考的な考え方からGo的な思考に変えていくかという説明の仕方がとてもわかりやすかった．
今までの書いたコードは完全に失敗してるのでちゃんと書き直していきたい．

## 最後に

発表する機会を与えて下さった[@bto](https://twitter.com/bto)さん，ありがとうございました．
さらなるモチベーションに繋がるとても良い勉強会でした．質疑の質もとても高かった．次に機会があれば是非参加したいです．

### 参考

- [HDE Incで開催のGo勉強会で話してきた : D-7 <altijd in beweging>](http://lestrrat.ldblog.jp/archives/40268722.html)
- [Go lang勉強会でgo-socket.ioの話してきた - from scratch](http://yosuke-furukawa.hatenablog.com/entry/2014/08/11/095157)
- [Go lang勉強会に参加した感想 - きょこみのーと](http://kyokomi.hatenablog.com/entry/2014/08/10/110909)
