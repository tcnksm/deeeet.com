---

title: 'GithubのGo言語プロジェクトにPull Requestを送るときのimport問題'
date: 2014-07-23
comments: true
categories: golang
---

## TL;DR

fork元（オリジナル）を`go get`してその中で作業，forkした自分のレポジトリにpushしてPull Requestを送る．

## 問題

Github上のGo言語のプロジェクトにコミットするとき，cloneの仕方で若干ハマることがある．普通のOSSプロジェクトの場合は，forkしてそれをcloneしてpush，Pull Requestとすればよい．Go言語のプロジェクトでは，同じレポジトリの中でパッケージを分け，それをimportして使ってるものがある．そういう場合にforkしたものをそのままcloneすると，importの参照先がfork元の名前になりハマる．

例えば，[github.com/someone/tool]()があるとする．このレポジトリは[github.com/someone/tool/utils]()という別パッケージを持っており，mainがそれを使っているとする．つまり以下のようになっているとする．

```go
package main

import (
    "github.com/someone/tool/utils"
)

...
```

この場合に，通常のやりかたでforkしてソースを取得する．

```bash
$ go get -d github.com/you/tool/...
```

するとソースは，`$GOPATH/src/github.com/you`に，importしてるutilsパッケージは`$GOPATH/src/github.com/someone/tool/utils`にあるといったことがおこる．で，`$GOPATH/src/github.com/you/utils`直しても反映されない，import書き換えないと！とかなる．

## 良さげなやりかた

[@mopemope]()さんが[言及していた](https://twitter.com/mopemope/status/491749193522761728)り，["GitHub and Go: forking, pull requests, and go-getting"](http://blog.campoy.cat/2014/03/github-and-go-forking-pull-requests-and.html)に書かれているやり方が今のところ良さそう．

まず，fork元（オリジナル）のソースを取得する．

```bash
$ go get -d github.com/someone/tool/...
```

作業は，`$GOPATH/src/github.com/someone/tool`内でブランチを切って行う．

pushはforkした自分のレポジトリにする．

```bash
$ git remote add fork https://github.com/you/tool.git
$ git push fork 
```

あとは，そこからPull Requestを送る．

## 他のやりかた

forkして以下のようにcloneするというやり方も見かけた．

```bash
$ git clone https://github.com/you/tool.git $GOPATH/src/github.com/someone/tool
```

他にベストなやり方があれば教えてほしい．

