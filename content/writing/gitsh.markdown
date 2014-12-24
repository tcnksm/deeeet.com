---

title: 'gitshでgitのタイプ数を減らす'
date: 2014-02-11
comments: true
categories: 
---

gitはサブコマンドやオプションが多い．だからshellのaliasやらgitのaliasで頑張ってコマンドのタイプ数を減らす．Thoughbotの[@georgebrock](https://twitter.com/georgebrock)さんの[gitsh](https://github.com/thoughtbot/gitsh)を使えばもっとコマンドのタイプ数を減らすことができる．

例えば以下はよく打つコマンド．`git`って打ち過ぎ．

```bash
$ git status
$ git add -u
$ git commit -m "Commit message"
$ git push
```

gitshを使うと専用のモードへのアタッチが始まり，`git`を打たずサブコマンドだけを打てばよくなる．

```bash
$ gitsh
gitsh@ status
gitsh@ add -u
gitsh@ commit -m "Commit message"
gitsh@ push
gitsh@ :exit
```

gitのaliasも引き継がれるので，例えば以下のようなaliasを設定してしておくと，さらにタイプ数を減らすことができる．

```bash
#.gitconfig
[alias]
  au = add -u
  cm = commit -m
  p  = push
```

```bash
$ gitsh
gitsh@ ⏎ # status
gitsh@ au
gitsh@ cm "Commit message"
gitsh@ p
gitsh@ :exit
```

サブコマンドなしで⏎ (return)するとデフォルトでは`git status`が表示される．デフォルのコマンドは以下で変更可能．

```bash
gitsh@ config --global gitsh.defaultCommand "status -s"
```

もっと減らす．

```bash
#.zshrc
alias g="gitsh"
```

インストールはOSXならHomebrew経由でいける．

```ruby
$ brew tap thoughtbot/formulae
$ brew install gitsh
```

tmuxのsplit-windowと連携するのも良さそう．以下のようにすれば，"Prefix+C-g"で画面分割してgitshモードへ入る．（[@958](https://twitter.com/958)さんありがとうございます．)

```
#.tmux.conf
bind C-g split-window -v -p 20 'exec gitsh'
```

gitのコマンドは連続で打つこと多いので理にかなってるツールだと思う．aliasが引き継がれるので移行も楽．他にも，一時的にconfigの設定（`user.name`や`user.email`）を切り替えたり，プロンプトにブランチとかの情報を表示したり，普通のshellのように環境変数を設定したり，hubコマンド使ったりもできる．




参考

- [Announcing gitsh](http://robots.thoughtbot.com/announcing-gitsh)
- [thoughtbot/gitsh](https://github.com/thoughtbot/gitsh)

