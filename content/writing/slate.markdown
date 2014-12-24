---

title: 'Window management application: slate'
date: 2013-10-28
comments: true
categories: 
---
<div class="vc"><iframe src="http://player.vimeo.com/video/78074896" width="500" height="281" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div> <p><a href="http://vimeo.com/78074896">Using slate</a> from <a href="http://vimeo.com/user5121880">deeeet</a> on <a href="https://vimeo.com">Vimeo</a>.</p>

slateはOSX向けのwindow manage system．上は使ってみた動画．ウィンドウのサイズを変えて，iTermを起動，ChromeとiTermをそれぞれ画面の半分にリサイズして配置．これらをすべてキーボードから行うことができる．ブラウザ観ながらコーディングなどはよくあるのでとても便利．

設定は，~/.slateと~/.slate.js（自分の設定[tcnksm/dotfiles/slate](https://github.com/tcnksm/dotfiles/tree/master/slate)）．書き方はREADMEが詳しい．Javascriptで設定を書くことができて自由度は高い．例えば，iTermを起動する，iTermにフォーカスするとかは以下のよう書ける．

``` javascript

// alt + returnで起動
S.bind("return:alt", function(win) {
    S.shell("usr/bin/open -n -a iTerm")
})

// alt + i でフォーカス
S.bind('i:alt', function (win) {
    win.doOperation(S.operation('focus', { app: 'iTerm' }));
});

```

参考

- [jigish/slate](https://github.com/jigish/slate)
- [jigishのslate.js](https://github.com/jigish/dotfiles/blob/master/slate.js)
- [OS Xで作業効率を5%上げるSlateの紹介 | 株式会社インフィニットループ技術ブログ](http://www.infiniteloop.co.jp/blog/2013/08/osx_slate/)

