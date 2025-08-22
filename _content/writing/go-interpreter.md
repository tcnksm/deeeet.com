+++
date = "2017-01-12T17:06:29+09:00"
title = "Writing An Interpreter In Goを読んだ"
+++

[Thorsten Ball](https://twitter.com/thorstenball)による["Writing An Interpreter In Go"](https://interpreterbook.com/)を読んだ．

技術界隈のブログを見ているとたまにSteve Yeggeの「If you don’t know how compilers work, then you don’t know how computers work」という言葉に出会う．その度に学生のときにコンパイラの授業を受けなかったこと後悔し，社会人になって挑戦しようとして挫折したことを思い出して悲しい気持ちになる．[@rui314](https://twitter.com/rui314)さんの[Cコンパイラをスクラッチから開発してみた](http://qiita.com/ruiu/items/4d471216b71ab48d8b74)を読んではかっこいいなと思いつつ僕には無理だなあと心が折れていた．

どの言語を書いていてもコンパイラ（もしくはInterpreter）は切っても離せないものであり内部の動きがどうなっているかを知っておきたいという欲求はプログラマーなら誰しもあると思う（少なくとも僕にはある）．では他にも学ぶことがたくさんあるという時間制約の中でベストな学習リソースは何かと言われると自分の観測範囲ではなかなか良いものに出会うことはなかった．[Dragon Book](https://en.wikipedia.org/wiki/Compilers:_Principles,_Techniques,_and_Tools)は重すぎるしLispの処理系をx行のRubyで書いて見ました系ブログは軽すぎる．

本書["Writing An Interpreter In Go"](https://interpreterbook.com/)はその1000ページのコンパイラ本と個人ブログのギャップを埋めるために書かれた本である．紙の本にした200ページ程度でさっと読める．なんちゃって言語を実装するのではなくMonkeyという本書のためにデザインされたある程度まともな言語（C言語っぽい）を実装する．スクラッチから初めてLexer，Parser， Evaluationを実装していく（HostにGolangを使うのでアセンブラなどまでは踏み込まない）．テストまでちゃんと書くとだいたい2000行程度で実装できた（時間にするとだいたい1週間程度）．

本書の利点を挙げると，

- サンプルコードがGolangで書かれている（かつ標準パッケージのみが使われている）．Golangはとにかく言語仕様のシンプルであるため本書のサンプルコードを読むのはとても簡単である．また自分の好きな言語に移植するのも容易であると思う．
- サンプルコードを動かしながら読み進めることができる．最新のGolangのruntimeで動かすことができるので環境を準備するのはたやすい．Lexerを書けばここまでできて，Parserを書けばここまでできて...と読むことができて理解度が高い．
- テスト駆動で書かれている．本書に登場するコードはすべてテストもセットになっている．テストのおかげで何を期待するのかをすぐに理解することができた．またテストはGolangのベストプラクティスである[Table Driven Tests](https://github.com/golang/go/wiki/TableDrivenTests)が採用されているため読みやすい（ただし途中でテストも写経するのはめんどくなった...）

これらの利点以上に感動したのが本書の書き方である．そもそも作者はコンパイラを職業にしているひとではない．個人的なpassionでコンパイラについて知識を深めてきたひとである（詳しくは作者が出演した[Go time #28](https://changelog.com/gotime/28) を参考）．そのために前提がとても優しい．僕のようなゴリゴリのCS出身ではないプログラマが疑問に思うことを一つ一つちゃんと拾ってくれる（書き方も柔らかくて「これ疑問に思ったっしょ？次にちゃんと説明するから！」的に書かれていて良い）．

表層的な部分だけでなくて内容に少し触れておくと，本書で一番面白かった・感動したのはParserの実装である．Paserは実装するのではなくyaccやbisonなどのParser generatorを使うのが一般的らしいが本書ではそれらのツールを使わない．すべて自分で1から実装する．特にExpressionをParseするための[Pratt parser](http://javascript.crockford.com/tdop/tdop.html)（JSLintで使われている）は他のParserを知らないため比較はできないがとにかくシンプルで感動した（デバッグとかしんどいしPaser generator使わなくてもシンプルにできるよという話もある[Handwritten Parsers & Lexers in Go](https://blog.gopheracademy.com/advent-2014/parsers-lexers/)．実際自分で書いたりGolangの実装を覗いたりしてみるとシンプルなものなら自分で書いても良いのでは?という気持ちにはなった）．

あとGolangを書いているひとにオススメなのはGolangのコンパイラ実装である[https://golang.org/pkg/go/](https://golang.org/pkg/go/)と合わせて読むこと．名前のつけ方が似てるので比較しながらコードを追うことができとても勉強になる．


## まとめ

コンパイラのことがわかったのかと言われるとまだまだ自信を持ってYesとは答えられない．が全く知らないという状況は抜け出したと思う．前よりも恐れがなくなったというか身近に感じている．これを入り口にしてさらに専門的な本を読んでみようという意欲も湧いている．とにかく読んでよかった．

少しでもコンパイラに興味があり入り口が見つけられない人は是非手にとると良いと思う．オススメです！