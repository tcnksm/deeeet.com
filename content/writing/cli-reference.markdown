---

title: 'コマンドラインツールを作るときに参考にしている資料'
date: 2014-08-27
comments: true
categories:
---

[コマンドラインツールについて語るときに僕の語ること - YAPC::Asia Tokyo 2014](http://yapcasia.org/2014/talk/show/b49cc53a-027b-11e4-9357-07b16aeab6a4)

コマンドラインツールが好きで昔からつくってきた．
今年のYAPCで，そのコマンドラインツールをつくるときにどういうことを意識して作っているのか？どのような流れで開発しているのか？といったことを語る機会をもらえた．
具体的な内容については，是非トークを聴きに来てもらうとして，
スライドをつくるにあったって過去に読んだ資料や，よく参考にしている記事を集め直したので，その一部を参考資料としてまとめておく．

## UNIXという考え方

[UNIXという考え方](http://www.amazon.co.jp/UNIX%E3%81%A8%E3%81%84%E3%81%86%E8%80%83%E3%81%88%E6%96%B9%E2%80%95%E3%81%9D%E3%81%AE%E8%A8%AD%E8%A8%88%E6%80%9D%E6%83%B3%E3%81%A8%E5%93%B2%E5%AD%A6-Mike-Gancarz/dp/4274064069)

Mike GancarzによるUNIXの思想や哲学をまとめた本．古いが全然色あせてない．
コマンドラインツールの作り方を書いた本ではないが，これらの思想の上で動くツールはこの思想に準拠して作られるべきだと思う．何度も読んで考え方を染み付かせた．

- 小さいものは美しい
- 一つのプログラムには一つのことをうまくやらせる
- できるだけ早く試作する
- 効率より移植性を優先する
- データをフラットなテキストデータとして保存する
- ソフトウェアを梃子（てこ）として使う
- シェルスクリプトによって梃子の効果と移植性を高める
- 過度の対話インターフェースを避ける
- 全てのプログラムをフィルタとして設計する

### 小定理

- 好みに応じて自分で環境を調整できるようにする
- オペレーティングシステムのカーネルを小さく軽くする
- 小文字を使い，短く
- 木を守る（ドキュメント）
- 沈黙は金（エラーメッセージの出力について)
- 同時に考える（並列処理）
- 部分の総和は全体よりも大きい（小さな部品を集めて大きなアプリケーションを作る）
- 90パーセントの解を目指す
- 劣る方が優れている
- 階層的に考える

## GNU標準インターフェース

[Standards for Command Line Interfaces](https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html)

コマンドラインツールには長い歴史がある．つまり慣習がある．慣習を外れない簡単な方法は，標準に従うこと．
普段からコマンドラインツールは使っているので，インターフェースはわかりきっていると思うかも知れないが，いざ自分がつくるとなると見落としていることは多い．

また，オプションは短オプション（e.g., `-f`）と長オプション（e.g., `--force`）の両方を準備するべきだが，長オプションの名前に迷うときがある．そういうときのために，GNUでよく使われている長オプションが以下にまとめられている．

[Table of Long Options](https://www.gnu.org/prep/standards/html_node/Option-Table.html#Option-Table)

## Build Awesome Command-line tool

[Build Awesome Command-Line Applications in Ruby 2: Control Your Computer, Simplify Your Life](https://pragprog.com/book/dccar2/build-awesome-command-line-applications-in-ruby-2)

David Copeland氏によるAwesomeなコマンドラインツールの作り方の本．サンプルコードや紹介されているライブラリは全てRubyだが，
他のどの言語でも適応できることばかり．「コマンドラインツールのつくりかた」としては一番参考になった．
コマンドラインツールを作る上での抑えるべき基礎が網羅されている．

この本におけるAwesomeなコマンドラインツールとは？

- Easy to use（簡単に使える）
- Helpful（役に立つ）
- Play with others（他ツールと協調できる）
- Has sensible defaults but is configurable（適切なデフォルト値を持ち，設定できる）
- Install painlessly（苦痛なくインストールできる）
- Gets new features and bug fixes easily（新機能の追加やバグの改修が簡単にできる）
- Delights users（ユーザを喜ばせる）


## Building a Ruby Library

<script async class="speakerdeck-embed" data-id="4fca431e928d7202ab009b70" data-ratio="1.33333333333333" src="http://speakerdeck.com/assets/embed.js"></script>

VagrantやConsulの作者である[Mitchell Hashimoto](https://github.com/mitchellh)氏が[Aloha Ruby Conf 2012](http://www.confreaks.com/events/aloharuby2012)で語った良いRubyライブラリを作るための方法論．内容はRubyのライブラリについてだが，これもどんな言語であっても大切なことが語られている．

この発表における良いRuby Libraryとは？

- Intuitive API (直感的なAPI)
- Configurable（設定が可能）
- Logged（ログが出せる）
- Exceptions（適切な例外処理）
- Documentation（ドキュメントが揃っている）
- Support（サポートがある）

ファンタスティックなツールの作り方とかではなくて，タイトルにもあるように，誰も語らないような泥臭い部分をしっかりとやる大切さを語っている．
Hashicorpが出してくるプロダクトはどれも素晴らしいけど，こういう泥臭い，みんながやりたがらない，でも当たり前なことをしっかりこなすことが土台になっていると思う．
特にドキュメントに対する考え方とか一貫しているなあと思う．
