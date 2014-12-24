---

title: '初めてのOSSコミットはhomebrew-caskがいい感じ'
date: 2014-02-05
comments: true
categories: 
---

[BrewfileでHomebrewパッケージを管理する](http://deeeet.com/writing/2013/12/23/brewfile/)にも書いたが，homebrew-caskというのは，本家Homebrewではインストールできない，Google ChromeやVagrantといったdmg配布のアプリをBrewでインストール可能にするサイドプロジェクト．

先日koboのデスクトップアプリで本を読めるようになったが，まだhomebrew-caskではインストールできない状態だった．ということで，[homebrew-cask](https://github.com/phinze/homebrew-cask)，厳密にはhomebrew-caskで管理されるアプリの派生バージョンを管理している[homebrew-cask-versions](https://github.com/caskroom/homebrew-versions)に新しいCaskの追加のPull requestを送ってマージされた．この時，homebrew-caskは初めてのOSSコミットの経験にとても良いと感じた．

理由は以下の2点．

- Contributeの仕方がとても丁寧にまとめてあること（[CONTRIBUTING.md](https://github.com/phinze/homebrew-cask/blob/master/CONTRIBUTING.md)）
- Caskの追加はとても単純であること

1つ目は読めばわかるけど，cloneからpull requestまでこうしてくださいってのがとても丁寧に書いてある．コミットメッセージはこう書くべきだというアドバイスまである．2つ目の理由として，新しいCask（追加したいアプリのインストール元のURLやバージョンなどを記載する，Chefのレシピのようなもの）の追加は，rubyの単純なDSLを書くだけでいい．今回だと[こんな感じ](https://github.com/caskroom/homebrew-versions/blob/master/Casks/kobo-jp.rb)．しかも個々のCaskは独立しているので，conflictしたらどうしようとか，余計なことを考える必要がない．

これらの理由から，gitとGithubを使ったOSSコミットの一通りのフロー，cloneから，commitして，pullして最新版に追従して，squashして，適切なコミットメッセージ書いて，pushして，pull requestして，issueでやりとりして(今回だと[こんな感じ](https://github.com/caskroom/homebrew-versions/pull/95))，mergeされるまで，を経験するのにhomebrew-caskはとてもおすすめ．

自分が使ってるアプリでまだCaskに登録されてなければ，是非一度経験してみるといいと思う．

ちなみに，こんなことをtwitterでつぶやいていたらhomebrew-caskの作者にも[同意された](https://twitter.com/phinze/status/427527187915624449)．

参考

- [A Note About Git Commit Messages](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)




