---

title: 'HomeBrewで自作ツールを配布する'
date: 2014-05-20
comments: true
categories:
---

[複数プラットフォームにGoアプリケーションを配布する](http://deeeet.com/writing/2014/05/19/gox/)

上の記事で，Go言語で作ったツールを複数プラットフォーム向けにクロスコンパイルし，作成されたバイナリを[Bintray](https://bintray.com/)でホストするまではできた．あとは，ダウンロード・展開・PATHを通す，をやってもらえば，自分の作ったツールを使ってもらえる．

OSX向けにツールを配布する場合はHomeBrewのFormulaを作っておけば，これをもっと簡単にできる．

## TL;DR

以下でインストールできるようにする．

```bash
$ brew tap <ユーザ名>/<パッケージ名>
$ brew install <パッケージ名>
```

ただし作成したツールが，Githubのリリースページや[Bintray](https://bintray.com/)にホストされていることを前提とする．

## Formulaの作成

Formulaとは，HomebrewでインストールするパッケージのURLやビルドの手順が書かれたスクリプト．Homebrewでインストールできるツールは全てこのFormulaが準備されていて，それらは全て`/usr/local/Library/Formula`以下にある．Formulaは単純なRubyのDSLで簡単に書ける．

まず，Formulaの雛形をつくる．

```bash
$ brew create <URL>
```

これを実行すると，URLに基づいた名前でFormulaの雛形が作られる．例えば，`http://example.com/foo-0.1.tar.gz`だと，`foo.rb`が作られる．雛形は以下のようになる．

```ruby
require "formula"

class Foo < Formula
  url "http://example.com/foo-0.1.tar.gz"
  homepage ""
  sha1 "1234567890ABCDEF1234567890ABCDEF"

　# depends_on "cmake" => :build

  def install
      system "./configure", "--prefix=#{prefix}", "--disable-debug", "--disable-dependency-tracking"
      #system "cmake", ".", *std_cmake_args
      system "make install"
  end
end
```

あとは，これを編集するだけ．使えるDSLは[ここ](https://github.com/Homebrew/homebrew/wiki/Formula-Cookbook)を見るとよい．`system`が使えるのでやりたい放題といえばやりたい放題．

### DSLを書く

ここでは，最低限使えそうなものを紹介する．

Go言語のクロスコンパイルでは`amd64`と`386`のバイナリをそれぞれ作れるので，それに応じてインストールURLを変更できるようにする．これには`Hardware.is_64_bit?`を使う．以下のように書ける．

```ruby
if Hardware.is_64_bit?
    url "http://exmaple.com/foo_amd64.zip"
    sha1 "dce04210f14dcff0c7863e14695986e02ada4e02"
else
    url "http://exmaple.com/foo_386.zip"
    sha1 "3226bdbcaf982e03d88f881878a1076d6ffbe423"
end
```

バイナリをPATHが通っているディレクトリに配置するには`bin.install`を使う．パッケージは基本的に`/usr/local/Cellar`以下にダウンロード・展開される．`bin.install`は，Cellarから`/usr/local/bin`に対してシンボリックリンクを貼ってくれる．

```ruby
def install
    bin.install '<バイナリ名>'
end          
```

`/usr/local/etc`等にもリンクをはることができる．

インストール完了後に，メッセージを表示した場合は，`caveats`関数を準備する．例えば，「xxxを`.bashrc`や`.zshrc`に書いてください」といった文言を表示したいとき．

```ruby
def caveats
     msg = <<-EOF.undent
Add the following line to your ~/.bash_profile or ~/.zshrc file (and remember to source the file to update your current session):
[[ -s `brew --prefix`/etc/jj.sh ]] && . `brew --prefix`/etc/jj.sh
EOF
end
```


最終的に自分が書いたFormulaは[こちら](https://github.com/tcnksm/homebrew-jj/blob/master/jj.rb)

### テストする

Formulaができたらいつも通り`brew`コマンドを叩いてテストする．`brew install`を実行しても，`brew uninstall`すれば貼られたシンボリックリンクは消される．DSLを使う限り動作は全て`/usr/local/bin`で完結するので，調査もしやすい．Formulaそのものを消したければ`git checkout`してしまえばよい．


## Tap

公式のレポジトリに取り込んでもらいたい場合は，そのままブランチを切ってPull requestを送る．

公式に取り込まれるのに腰が引ける場合は，自分用のGithubレポジトリを作り，その中にFormulaをぶっ込む．レポジトリ名は`homebrew-<レポジトリ名>`とする．例えば，上の例で言うと，`foo.rb`を`homebrew-foo`レポジトリに入れて公開する．あとはユーザに以下を実行してもらえば，自分のFormulaをHomeBrewのインストール対象にすることができる．

```bash
$ brew tap <ユーザ名>/<レポジトリ名>
```

`tap`もやっていることは単純で，`/usr/local/Library/Taps`以下にレポジトリを`clone`してきて，`/usr/local/Library/Formula`に対してシンボリックリンクを貼っているだけ．










