---

title: 'BrewfileでHomebrewパッケージを管理する'
date: 2013-12-23
comments: true
categories: 
---

この記事は[1分で実現できる有用な技術 Advent Calendar 2013](http://qiita.com/advent-calendar/2013/one-minute)の24日目の記事です．


Brewfileを使えば，Bundlerでrubygemsを管理するようにHomebrewのパッケージを管理できる．Brewfileのあるディレクトリで

```bash
$ brew bundle
```

とすれば，Brewfileに書かれたパッケージがすべてインストールされる．これはHomebrew公式のコマンドであり，特別なインストール等は必要なく，最新版にアップデートすればすぐに使うことができる．

これを使えば，dotfilesに加えて自分のbrewパッケージを管理しておくこともできるし（[tcnksm/dotfiles/Brewfile](https://github.com/tcnksm/dotfiles/blob/master/Brewfile)），imagemagickのようにプロジェクトで必要になるパッケージをBrewfileとして共有しておくこともできる．自分は，Boxenをやめてこちらに切り替えた．

Brewfileの基本の文法は，以下のように`install ...`とインストールしたいパッケージを記述するだけ．`brew update`や`brew clean`といったコマンドも記述できる．

```
# Homebrewを最新版にアップデート
update

# Formulaを更新
upgrade

# パッケージのインストール
install zsh
install git
install install coreutils

# 不要なファイルを削除
clean
```


とするだけ．Brewfileに書かれたHomebrewパッケージがインストールされる．

公式以外のレポジトリを追加してインストールすることも可能．以下のように記述する．

```
tap homebrew/binary
install packer
```

(追記) 以前は，同じレポジトリに対してbrew tapを実行すると，Errorとなり実行が停止してしまったため，原始的記述が必要だったが，[@sonots](https://twitter.com/sonot)さんのpullreqでWarningに変更となった([https://github.com/Homebrew/homebrew/pull/25617](https://github.com/Homebrew/homebrew/pull/25617))．ありがとうございます．

また，レポジトリに存在しないAppをダウンロードする際は，自分でFormulaを書いたレポジトリを準備して，それをtapすればよい．詳しくは，[こちら](http://blog.livedoor.jp/sonots/archives/35251881.html)．

Google ChromeやVagrantといったdmgでの配布Appも，[homebrew-cask](https://github.com/phinze/homebrew-cask)を使えば，Brewでインストールできるようになるが，それもBrewfileに記述することができる．

```
# homebrew-caskのインストール
tap phinze/homebrew-cask
install brew-cask

# インストール
cask install google-chrome
cask install kobito
cask install virtualbox
cask install vagrant
```

参考

- [Homebrew's new feature: Brewfiles](https://coderwall.com/p/afmnbq)
- [The Homebrew Brewfile - Rob and Lauren](http://robandlauren.com/2013/11/27/homebrew-brewfile/)














