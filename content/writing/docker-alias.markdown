---

title: 'Dockerを便利に使うためのaliasをつくった'
date: 2014-03-30
comments: true
categories: docker
---

[tcnksm/docker-alias](https://github.com/tcnksm/docker-alias)

いろいろなひとのTipや，自分がやったやつの寄せ集めで作った．以下で使えるようになる．

```bash
$ curl -fsSL https://raw.github.com/tcnksm/docker-alias/master/zshrc >> ~/.zshrc && source ~/.zshrc
```

### コンテナの起動

インタラクティブモードでコンテナを起動する．

```bash
alias dki="docker run -i -t -P"
```

```bash
$ dki base /bin/bash
```

デーモンモードでコンテナを起動する．

```bash
alias dkd="docker run -d -P"
```

```bash
$ dkd base /bin/echo hello
```

### コンテナの情報

最後に起動したコンテナのIDを取得する．

```bash
alias dl="docker ps -l -q"
```

```bash
$ docker run -d ubuntu /bin/sh -c "while true; do echo hello world; sleep 1; done"
$ dl
4b9aa02548ae
```

コンテナのIPを取得する．

```bash
alias dip="docker inspect --format {% raw %} '{{ .NetworkSettings.IPAddress }}' {% endraw %}"
```

```bash
$ docker run -d ubuntu /bin/sh -c "while true; do echo hello world; sleep 1; done"
$ dip `dl`
172.17.0.2
```

### イメージのビルド

カレントディレクトリのDockerfileをタグを指定してビルドする．

```bash
dbu() {docker build -t=$1 .;}
```

```bash
$ dbu tcnksm/test 
```
### 掃除

起動中の全てのコンテナを停止する．

```bash
dstop() { docker stop $(docker ps -a -q);}
```

```bash
$ dstop
600d74545149
7a4f1d592aa3
9c15701a1733
```

停止中の全てのコンテナを削除する．起動中のコンテナはスキップされる．

```bash
drm() { docker rm $(docker ps -a -q); }
```

```bash
$ drm
76b36e023960
1565bc2b6dca
Error: container_delete: Impossible to remove a running container, please stop it first
```

起動中のコンテナを全て停止して，コンテナを削除する．

```bash
alias drmf='docker stop $(docker ps -a -q) && docker rm $(docker ps -a -q)'
```

```bash
$ drmf
3a71b6a4198f
c5bff0b6762a
eee80ba68cbc
```

すべてのイメージを削除する．利用中のイメージはスキップされる．

```bash
dri() { docker rmi $(docker images -q); }
```

```bash
$ dri
Deleted: 6080fd1cc342a7d6b19168f6bbb292951c42cbac6ff3b29a3b139a4bbb04e5d2
Deleted: 6571a2ed4ea4ee0680449e678dd9f5ddb3e9ccef74c782a3e3b653fc057ad786
Deleted: b273e5e9c1e4403727f4a0305d98ee6c47f5f83b46523a7f86051a7f8e7c980a
Error: Conflict, cannot delete image 1a6d876a1d70 because it is tagged in multiple repositories, use -f to force
```

### その他

他にもいくつかショートカットコマンドのaliasが設定されている．それらを確認するには，以下のようにする．

```bash
$ dalias
di => docker images
dip => docker inspect --format {{ .NetworkSettings.IPAddress }}
dkd => docker run -d -P
dki => docker run -i -t -P
dl => docker ps -l -q ...
```

動かないとか，こんなんあったらとかあればPull requestやIssueお待ちしております．


### 参考

- [Useful Docker Bash functions and aliases](http://www.kartar.net/2014/03/some-useful-docker-bash-functions-and-aliases/)
- [15 QUICK DOCKER TIPS](http://www.centurylinklabs.com/15-quick-docker-tips/)
