---

title: 'Tmux Plugin Manager（TPM）を使う'
date: 2014-09-09
comments: true
categories: 
---


## TL;DR

[tmux-plugins/tpm](https://github.com/tmux-plugins/tpm)を使うと，`Gemfile`や`package.json`のように，tmux用のpluginを`~/.tmux.conf`に書いてインストール/有効化することができる．

## 使い方

まず，`tpm`をインストールする．

```bash
$ git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

次に，以下のように`~/.tmux.conf`に利用したいプラグインを記述する．プラグインは[tmux-plugins](https://github.com/tmux-plugins)にまとまっている．

```bash
set -g @tpm_plugins " \
    tmux-plugins/tpm \
    tmux-plugins/tmux-sidebar \
    tmux-plugins/tmux-copycat \
    tmux-plugins/tmux-open \
    tmux-plugins/tmux-resurrect \
    tmux-yank/tmux-yank \
    tmux-plugins/tmux-battery \
    tmux-plugins/tmux-online-status \
"

# Initialize tpm
run-shell ~/.tmux/plugins/tpm/tpm
```

あとは，tmuxを起動して`Prefix+I`を実行すれば，プラグインがインストールされる．

## プラグイン

以下のようなものを使い始めた．

- [tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect) - マシンを再起動しても，`tmux-server`が死んでも，保存しておいたsessionやpane，プロセスを復活させられるやつ（[デモ](http://vimeo.com/104763018)）．
- [tmux-sidebar](https://github.com/tmux-plugins/tmux-sidebar) - ディレクトリツリーを表示する．emacsの[direx](https://github.com/m2ym/direx-el)のtmux版．
- [tmux-open](https://github.com/tmux-plugins/tmux-open) - ハイライトしているファイルやURLを開く．
- [tmux-yank](https://github.com/tmux-plugins/tmux-yank) - システムのクリップボードへコピー可能にする．OSXとLinuxの両方で同じように使える．
- [tmux-battery](https://github.com/tmux-plugins/tmux-battery) - ステータスバーにバッテリーの残量を表示する．ステータスバーの設定項目に`#{battery_icon}`や`#{battery_percentage}`を記述するだけ．

プラグインは自作することができる．作り方は["How to create Tmux plugins"](https://github.com/tmux-plugins/tpm/blob/master/HOW_TO_PLUGIN.md)にまとまっている．プラグインはとてもシンプルで`.tmux`ファイルと，いくつかのシェルスクリプトを準備するだけで良い．動作としては`tpm`が`.tmux`を呼び出して，`.tmux`が`run-shell`でシェルスクリプトを実行する．

## まとめ

今はまだ`tpm`の作者が独りでゴリゴリとプラグインを作ってる段階で，それほどプラグインは多くない．そのうち面白いものも出てきそう．

プラグインを一括管理できるのも良いけど，今までいろんなブログのツギハギかつ無理矢理だったもの，例えばコピーの設定などが，OSSベースのより洗練された設定になっていきそうなのが嬉しい．プラグイン作成は簡単そうなので自分でもそのうち作ってみようかと．

Emacsのパッケージ管理も[Cask](http://cask.github.io/)に移行したし，dotfilesが整理されつつある．

### 参考

- [tcnksm/dotfiles](https://github.com/tcnksm/dotfiles)




