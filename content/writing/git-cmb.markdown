---

title: 'Gitのcommitメッセージに定型文をぶっ込む'
date: 2014-02-12
comments: true
categories: 
---

Gitのcommitメッセージに定型文をぶっ込みたいときがある．例えば`$default`のような環境変数が設定されていて，それを自動でcommitメッセージに含めるようにしたいとする．

以下のようなaliasを設定する．

```
[alias]
    cmd = "!f () { git commit -m \"$1 ($default)\" $2;}; f"
```

```bash
$ export default="default message"
$ git cmd "Some changes" # -> git commit -m "Some changes (default message)"
```

`f()`という関数を定義してそれを最後に実行する．こんな回りくどいやり方をするのは，gitのaliasが最後に`"$@"`をつけてサブコマンド以外の引数をすべて展開するためで，単純に`$1`で第一引数を取得して...では期待通りにはならない．関数定義して最後にそれを実行すれば，gitがつける`"$@"`をその関数の引数として使える．

自分のチームだとStashとJIRAを使っていて，JIRAのチケット名をcommitメッセージに含めるとStash上でJIRAのIssueとリンクされる．慣習としてbranch名とJIRAのチケット名を同じにしているので，ブランチ名をcommitメッセージに含めることができれば少し楽．

例えば，JIRAのissueの名前が`xxx-1456`とするとこんな感じのことをする．

```bash
$ git checkout -b xxx-1456
(Some changes)
$ git commit -m "Some changes (xxx-1456)" 
```

以下ようなaliasを設定すれば，自動でブランチ名を最後に含めたcommitメッセージが作られる．

```
cmb = "!f () { git commit -m \"$1 ($(git branch -a | grep '^*' | cut -b 3-))\" $2;}; f"
```

```bash
$ git checkout -b xxx-1456
(Some changes)
$ git cmb "Some changes" # -> git commit -m "Some changes (xxx-1456)"
```

かなり希有なパターンだけど，他にも応用できるかなと．ちなみに`export GIT_TRACE=1`すると，gitが何やってるのか細かく見れるので複雑なaliasを作るとき便利．

ついでによく使ってる，ちょっとマイナーなaliasをいくつか．まず，Initial commitを一気にやる，`git this`．

```
this = !git init && git add . && git commit -m \"Initial commit\"
```

`.gitignore`にファイルを追加する，`git ignore FILE`．

```
ignore = "!ignore () { echo $1 >> .gitignore;}; ignore"
```

aliasを全部表示する，`git alias`．

```
alias  = !git config --list | grep 'alias\\.' | sed 's/alias\\.\\([^=]*\\)=\\(.*\\)/\\1\\ => \\2/' | sort
```

参考

- [Gitのエイリアスで引数を使う #git - rcmdnk's blog](http://rcmdnk.github.io/blog/2013/12/20/computer-git/)
- [Advanced Git aliases](http://blog.blindgaenger.net/advanced_git_aliases.html)
- [tcnksm/gitcofig](https://github.com/tcnksm/dotfiles/blob/master/git/gitconfig)

