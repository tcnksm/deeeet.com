+++
date = "2014-12-25T01:34:57+09:00"
title = "OctopressからHugoへ移行した"
cover_image = "hugo.png"
+++

このブログは2年ほど[Octopress](http://octopress.org/)を使って生成してきたが，不満が限界に達したので，Go言語で作られた[Hugo](http://gohugo.io/)に移行した．

Octopressへの不満は，とにかく生成が遅いこと．100記事を超えた辺から耐えられない遅さになり，最終的には約150記事の生成に40秒もかかっていた．ブログは頻繁に書くのでかなりストレスになっていた．

Hugoのうりは生成速度．試しに使ったところ，明らかに速く，すぐに移行を決めた．最終的な生成時間は以下．爆速．

```bash
$ time hugo
hugo  0.30s user 0.06s system 296% cpu 0.121 total
```

他に良いところを挙げると，まずとてもシンプル．Octopressと比べても圧倒的に必要なファイルは少ない．また，後発だけあって嬉しい機能もいくつかある．例えば，`draft`タグを記事のヘッダに書いておけば，ローカルでは生成されても，本番用の生成からは外されるなどなど．


## インストール

Go言語で書かれているので`go get`して，デザインテーマをCloneするだけで動かせる．バイナリも配布されてるので，Go言語の環境がなくても使える（この楽さもRuby製のOctopressと比べて良い）．

```bash
$ go get -v github.com/spf13/hugo
```

```bash
$ git clone --recursive https://github.com/spf13/hugoThemes themes
```

使いかたは公式に十分な[ドキュメント](http://gohugo.io/overview/introduction)がある．

## 移行方法

Octopressからの移行はとても簡単だった．`source/_posts`内の記事を移せばとりあえず動く．以下ではこれ以外の移行作業を簡単にまとめておく．

まず，設定ファイルは，yamlもしくは，toml，json形式で書く．ブログの移行でめんどくさいのはURLの維持だが，Octopressと同様に`permalink`を設定できる．例えば，tomlを使う場合は以下のように書く．

```
[permalinks]
    post = "/:year/:month/:day/:filename/"
```

次に記事のヘッダ．OctopressとHugoでは日付フォーマットが若干異なる．Octopressの場合は，`2014-12-25 01:34`でHugoの場合は`2014-12-25T01:34:57`となる．これでも動くが，うまくパースされない．とりあえず，時刻を消せばちゃんとパースされるので，以下のようなワンライナーを書く．

```bash
$ find . -type f -exec sed -i "" -e 's/date: \([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\).*$/date: \1/g' {} \;
```

最後にOctopressのタグ（e.g., `{% img ...%}`）．OctopressのタグはHugoでは使えない．これもワンライナーを使ってHTMLタグに変換する．例えば，イメージタグを変換は以下のようにした．

```bash
$ find . -type f -exec sed -i "" -e 's/{%.*img.*\/images\/post\/\(.*\) .*%}/<img src=\"\/images\/\1\" class=\"image\">/g' {} \;
```

移行で特別にやったのは以上．すぐに終わった．

## まとめ

Hugoの欠点も上げておくと，Octopressと比べて圧倒的にデザインテーマが少ない．自分の場合は，移行そのものよりも新しいデザインのためのscssの修正の方に時間が取られた．

でも，それも最初だけなので．日々のブログ活動のことを考えるとHugoの速度は圧倒的に良い．年末の大掃除と一緒にHugoへの移行，オススメです！

### 参考

- [tcnksm/deeeet.com](https://github.com/tcnksm/deeeet.com)
- [Migrating to Hugo From Octopress | I care, I share, I'm Nathan LeClaire.](http://nathanleclaire.com/blog/2014/12/22/migrating-to-hugo-from-octopress/)

