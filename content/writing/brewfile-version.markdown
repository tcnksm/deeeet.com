---

title: 'Brewfileでバージョンを指定する'
date: 2014-05-13
comments: true
categories: 
---

個人用に使うBrewfileなら最新版をインストールするだけでいいと思うんだけど，プロジェクトやチームでBrewfileを共有する場合，ある程度特定のバージョンで揃えたい．

Brewfileだと，Gemfileのように特定のバージョンをがっちり指定してインストールすることはできない．

```ruby
gem 'rails', '4.0.5'
```

例えば，深淵な理由によりtomcat 6で開発環境を揃えたいとする．Brewで複数バージョンを使うには`homebrew/versions`を`tap`する．そして，以下でバージョンを検索する．

```bash
$ brew tap homebrew/versions
$ brew search tomcat
tomcat           tomcat-native    tomcat6
```

あとはそれをBrewfileに書いて共有するだけ．

```ruby
# Brewfile
update || true
tap homebrew/versions || true
install tomcat6 || true
```

欲しいバージョンがない場合は[Homebrew/homebrew-versions](https://github.com/Homebrew/homebrew-versions)にPull Requestを投げてしまう（FomulaはただのDSL）．もしくは，自分たちでtapをつくってしまうのが良いかも．

最近見かけたチーム用のtapをつくるってエントリはBoxenよりさらっとできそうで良いなと思った．

- [Homebrew vs Boxen を比較して，brewproj に着手 - ja.ngs.io](http://ja.ngs.io/2014/05/08/homebrew-boxen/)

### 参考

- [BrewfileでHomebrewパッケージを管理する](http://deeeet.com/writing/2013/12/23/brewfile/)
