---

title: 'ghq + percol + docc'
date: 2014-06-09
comments: true
categories: golang
---

各プロジェクトのディレクトリをどのように管理するかってのは長年の悩みだった．

Go言語を使うようになるとそのシンプルなディレクトリ構成が自分の中で1つの最適な解となった．GithubやGoogle Codeにソースをホストすることが前提となっている今，ホスト名・ユーザ名・プロジェクト名によるGoのディレクトリ構成はどのようなプロジェクトでも通用する．そのため，最近は，社内のプロジェクトを含め，すべてプロジェクトディレクトリをGoの作法に従うように管理するようになった．

そして，以下の記事に出会った．

- [Rebuild: 42: When in Golang, Do as the Gophers Do (lestrrat)](http://rebuild.fm/42/)
- [ghq: リモートリポジトリのローカルクローンをシンプルに管理する - 詩と創作・思索のひろば (Poetry, Writing and Contemplation)](http://motemen.hatenablog.com/entry/2014/06/01/introducing-ghq)
- [ghqを使ったローカルリポジトリの統一的・効率的な管理について - delirious thoughts](http://blog.kentarok.org/entry/2014/06/03/135300)
- [ターミナル版anything的なpercolをzawの代わりに試してみた - $shibayu36->blog;](http://shibayu36.hatenablog.com/entry/2013/10/06/184146)

まとめると，

- `export GOPAHT=$HOME`
- `ghq`でGo以外のプロジェクトもGoの作法で`$GOPATH/src`に集約
- `percol`で効率的なディレクトリの検索・移動

かなりライフチェンジング．とてもシンプルになった．

## docc

さらに進めて`docc`というコマンドを作った．

{%img /images/post/docc.gif %}

[tcnkms/docc · GitHub](https://github.com/tcnksm/docc)

これは指定したプロジェクトのGithubページ，もしくは`README.md`を開くコマンド．単独でもさらっとプロジェクトのドキュメントを参照するのに使える．

これを`ghq`と`percol`と組み合わせる．例えば，以下のようなpercolスクリプトを作る．

```bash
function percol-doc () {
    local selected_dir=$(ghq list --full-path | percol --query "$LBUFFER")
    if [ -n "$selected_dir" ]; then
        BUFFER="docc ${selected_dir}"
        zle accept-line
    fi
    zle clear-screen
}

zle -N percol-doc
bindkey '^O' percol-doc
```

すると，例えば上のgifのように`^O`で，`ghq`で集約したプロジェクトを`percol`で検索して，そのプロジェクトのGithubページをブラウザで開くということが可能になる．

インストールは以下．

```bash
$ brew tap tcnksm/docc
$ brew install docc
```

## dockerのGoパッケージ

`docc`はGo言語で書いた．その際，dockerが内部で独自に作っている[mflag](https://github.com/dotcloud/docker/tree/master/pkg/mflag)パッケージを使った．これは，標準パッケージの[flag](http://golang.jp/pkg/flag)を改良したもので，より柔軟な引数処理の作成ができる（例えば，1つのオプションに複数のオプション名を持たせることができるとか）．

このようにdockerは別のプロジェクトでも使える便利Goパッケージを[dotcloud/docker/pkg](https://github.com/dotcloud/docker/tree/master/pkg)に持っている．詳しくは，["the lost packages of docker"](http://crosbymichael.com/category/docker.html)にまとめられている．最近，[別レポジトリ](https://github.com/docker)もつくられたようなので，これからもっと増えそうだなと眺めている．


`docc`のバグは，[@deeeet](https://twitter.com/deeeet)，もしくはGithubの[Issue](https://github.com/tcnksm/docc/issues)にお願いします．
