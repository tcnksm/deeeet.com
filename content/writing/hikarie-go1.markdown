---

title: 'hikarie.goでLTしてきた+Hashicorpのクールなツール配布'
date: 2014-06-17
comments: true
categories: golang
---

<script async class="speakerdeck-embed" data-id="540e7720d83f013190131630294e6fbc" data-ratio="1.77777777777778" src="http://speakerdeck.com/assets/embed.js"></script>

["複数プラットフォームにGo言語のツールを配布する"](https://speakerdeck.com/tcnksm/fu-shu-puratutohuomunigoyan-yu-falseturuwopei-bu-suru-number-hikarie-go)

[hikarie.go](http://connpass.com/event/6579/)でLTをしてきた．hikarie.goは[A Tour of Go](http://go-tour-jp.appspot.com/#1)と[Go研](https://github.com/goken/goken)の溝を埋めるために，[@7yan00](https://twitter.com/7yan00)さんと[@yosuke_furukawa](https://twitter.com/yosuke_furukawa)さんによって始まったイベント．今後Go言語を始めたばかりのGopher達の良い拠り所になっていきそう．

今回自分が話したのは，以下の記事がもとになっている．

- ["複数プラットフォームにGoアプリケーションを配布する"](http://deeeet.com/writing/2014/05/19/gox/)
- ["HomeBrewで自作ツールを配布する"](http://deeeet.com/writing/2014/05/20/brew-tap/)

まとめると，[Goはクロスコンパイルが簡単](http://unknownplace.org/archives/golang-cross-compiling.html)なので，バイナリでちゃんと配布して，自分のつくったツールを使ってもらうための敷居を下げていこう！という内容．

この辺のやり方は，Mitchell Hashimoto氏の[Hashicorp](http://www.hashicorp.com/)のやり方を参考にした．Hashicorp製のツールは基本的に公開当初からOSX，Linux，Windows，Debian，FreeBSDに向けて配布される．あれだけのツールを作っているのに，ユーザがすぐ使えるようにという視点を忘れてないところは本当に素晴らしい．Hashicorpのすごいところは，複数プラットフォームに対応する，始めから豊富なドキュメントを揃える（とくにあのVS.の項が素晴らしいと思う），といった当たり前のことを当然のようにやってくるところだと思う．

開発者としてそういうところと勝負していくには，すごいすごいと言っているだけではなく，良い部分はどんどん取り入れていかないといけないと思う（もちろんバイナリ配布はモバイルアプリの配布と同じようにどんどんアップデートしにくいなど考慮することは多いが）．得に自分はCLIツールをつくるのが好きで，Hashicorp製のツールはインターフェースや設定ファイルのあり方など参考になることがとても多い．

Go言語でいくつかツールはつくってみたけど，まだまだ書き方とかなってなくてクソなので，もっと精進していきたい．

最後に，発表の機会をつくっていただいた[@7yan00](https://twitter.com/7yan00)さんと[@yosuke_furukawa](https://twitter.com/yosuke_furukawa)さん，ありがとうございました！
