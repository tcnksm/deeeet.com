---

title: 'SQL*Plusがクソだったから'
date: 2013-11-06
comments: true
categories: 
---

使いづらい．GUIクライアントとかなら使いやすいんだろうけど．CUIの使いづらさは2分で理解できた．まずインストールがめんどくさい（[How to install oracle client to Ubuntu 12.04](https://gist.github.com/tcnksm/7316877)）．

Readlineによるコマンドライン入力に対応していないから，↑したりC-aすると`^[[A`とかなる．コマンドの補完もできない．

[rlwrap](http://utopia.knoware.nl/~hlub/rlwrap/)が良い（`$ sudo apt-get install rlwrap`でインストール）．rlwrapでラップして起動すると，↑でコマンドヒストリの参照ができたり，C-aやC-eでカーソル移動したりといつもの操作ができるようになる．入力履歴はファイルに記録されるため再起動してもコマンド履歴を参照できるようになる．

さらに`-f`オプションで辞書も定義でき，補完が使えるようにもなる．[rlwrap_ext](http://www.linuxification.at/rlwrap_ext.html.en)というsqlplus用の辞書が既にある．がっつり使う気もないから，基本コマンドの定義であるsqlplusファイルのみを辞書として利用（辞書は複数使うことができる）．

最終的なエイリアスは以下（`-pRed`はプロンプトに色をつけるオプション）.

``` bash
alias sqlplus="rlwrap -pRed -f /usr/local/share/rlwrap/completions/sqlplus sqlplus"
```


