---

title: 'RubyのコマンドラインツールのMan Pageをつくる'
date: 2014-03-17
comments: true
categories: ruby
---

コマンドラインツールでは，`--help`オプションで簡単に使い方やオプションの説明を出力する．単純に使ってもらう分にはこれで足りる．ただ，さらにそのコマンドラインツールを使ってもらいたい場合には，詳細なドキュメントや使い方の例，簡単なチュートリアルをコマンドライン上で提供できるのがよい．単純に`Optparse`などでこれをやろうとすると，スペースが足りないし，ちょっとヘルプを見たいだけのユーザには邪魔になる．

伝統的なUNIXコマンドは，`man`コマンドを通じてそのような詳細な情報を提供している．例えば，`man ls`と打てば，`ls`コマンドの詳細が見れる．RubyでつくったコマンドラインツールでもMan Pageを通じて，同様の情報を提供できるとよい．

しかし，Rubygems.orgを通してコマンドラインツールを配信する場合，標準の`man`コマンドを通じてMan pageを提供するのは難しい．GithubのChris Wanstrath氏による[gem-man](https://github.com/defunkt/gem-man)を使えば，`gem man`コマンドを通じて標準の`man`と同様のMan Pageを簡単に提供できる．

さらに，Man Pageは，[nroff](http://ja.wikipedia.org/wiki/Roff)という専用の言語で書かれており，わざわざ習得するのはめんどい．これも，[rtomayko/ronn](https://github.com/rtomayko/ronn)を使えば，MarkdownでMan pageを書いて，nroff形式に変換することができる．

## TL;DR

- `gem man`でrubyでつくったコマンドラインツールのMan Pageを提供する
- [ronn](https://github.com/rtomayko/ronn)でMarkdown形式をMan Pageのnroff形式を吐き出す

以下のようなものをつくる．

```bash
$ gem man your_app

NAME
    your_app - Sample of gem-man and ronn

SYNOPSIS
    your_app [options]

DESCRIPTION
    your_app is a simple command-line tool for ...

OPTIONS
    -h, --help
      Show help page.
etc...      
```

## Install

Gemとして`gem-man`と`ronn`をインストールする．

```bash
$ gem install gem-man ronn
```

Rubygemsとして配布する場合は，gemspecに以下を追記する．

```ruby
# your_app.gemspec
spec.add_dependency "gem-man"
spec.add_development_dependency "ronn"
```

Man Pageのソースは，プロジェクトのルートの`man`ディレクトリに配置し，ファイル名は`your_app.1.ronn`とする．

```bash
$ mkdir man
$ touch man/your_app.1.ronn
```

`.1`というファイル名は必須でMan Pageのセクション番号を示す．

## ronnでMan Pageをつくる

ronnを使えば，Man PageをMarkdown形式で書き，nroff形式で吐き出すことができる．例えば，以下のように書く．

```
your_app(1) - Sample of gem-man and ronn
====

## SYNOPSIS

`your_app` [options]

## DESCRIPTION

**your_app** is a simple command-line tool for ...

## OPTIONS

  * -h, --help
      Show help page.

## Exmaple
...
```

`##`でセクションの始まり，`*`でリストなど，普段`README.md`などで書いてるのと同じ感じで作成できる．また，`<>`で囲めばリンクとなり，`man/index.txt`を準備すれば，他のMan Pageにリンクを貼ることもできる．

後は，以下のコマンドでnroff形式で吐き出すだけ．

```bash
$ ronn man/your_app.1.ronn
roff: man/your_app.1
html: man/your_app.1.html                                     
```

同時にHTML形式も吐き出される（例えば，ronnだと[こんな感じ](http://rtomayko.github.io/ronn/ronn.1.html)のページが生成される）．生成結果は，標準の`man`を使ってプレビューできる．

```
$ man man/your_app.1
```

## gem-manを使う

後は，上で作成したmanディレクトリを一緒にgemとして配布すれば，ユーザは以下のコマンドで作成したMan Pageを表示できるようになる．

```
$ gem man your_app
```

UNIXの他のコマンドと同様に扱いたい場合は，以下のようなAliasを設定すればよい．

```bash
$ alias man='gem man -s'
```

Man Pageがあれば，わざわざブラウザを立ち上げることなく，詳細のドキュメントをユーザに提示でき，より親切なコマンドラインツールをつくれる．

## 参考

- [Build Awesome Command-Line Applications in Ruby](http://pragprog.com/book/dccar/build-awesome-command-line-applications-in-ruby)
- [tcnksm/rbdock](https://github.com/tcnksm/rbdock)






