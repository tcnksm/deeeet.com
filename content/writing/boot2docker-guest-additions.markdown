---

title: 'boot2dockerでのVolume問題が解決しそう'
date: 2014-10-08
comments: true
categories: docker
---

（追記）Docker 1.3がリリースされた．boot2dockerはデフォルトでVirtualBox Guest Additionsをサポートし，boot2docker-cliは`init`のときにホストのディレクトリを`boot2docker-vm`上にマウントするようになった（[Docker 1.3: signed images, process injection, security options, Mac shared directories | Docker Blog](https://blog.docker.com/2014/10/docker-1-3-signed-images-process-injection-security-options-mac-shared-directories/)）．

## TL;DR

OSXやWindowsでboot2dockerを使う場合に特別な操作をしなくても`-v`オプション（Volume）が使えるようになる．

## 背景

OSXやWindowsでboot2dockerを使うひとが最も不満に感じるのは`-v`オプション（Volume）が使えないことだと思う．例えば，以下のようにカレントディレクトリをマウントし，そのファイルを参照しようとしてもファイルはないなどと言われる．

```bash
$ echo 'hello from OSX' > hello
$ docker run -v "$(pwd)":/osx busybox cat /osx/hello
cat: can't open '/osx/hello': No such file or directory
```

boot2dockerを使う場合，Dockerデーモンはboot2docker-vm上で動き，OSXやWindowsから叩くdockerコマンドはそれに対するリモートクライアントとして動作する．Dockerはリモートクライアントからのvolumeをまだサポートしていないため，上記のコマンドはboot2docker-vm内のディレクトリをマウントする．よって，ローカルにあるファイルは発見されない．

現時点でそれを解決するには，OSXやwindowsのディレクトリをboot2docker内にマウントするしかない．しかし，boot2dockerはVirtualBox Guest Additionsをサポートしていないため，独自スクリプトでisoイメージを1から作るか，他人がつくった非公式のisoを使うしかなかった（誰もが一度はググっていろいろ回った結果[VBox guest additions #284](https://github.com/boot2docker/boot2docker/pull/284)にたどりついては面倒くせえと思っていたと思う）．

VirtualBox Guest Additionsをサポートが進まなかったのは，boot2dockerのシンプルさが失われること，またパフォーマンスへの危惧が大きい．

## どうなるのか

まず，そもそもDocker自体がリモートクライアントからのvolumeに対応しようとしている（FUSEが検討されている）．が，まだ議論が進んでいる．

- [Proposal: Remote Shared Volumes #7249](https://github.com/docker/docker/issues/7249)


その間の**穴埋め**をboot2dockerがすることになった．理由として，OSXやWindowsでDockerを使う場合には公式的にboot2dockerを使うことになっている以上，`-v`オプション（Volume）を使えないのはユーザビリティに影響があるため．

- [VirtualBox Guest Additions #534](https://github.com/boot2docker/boot2docker/pull/534)
- [Add VirtualBox shared folders creation #258](https://github.com/boot2docker/boot2docker-cli/pull/258)

上記のPull Requestにより，boot2docker-vmにはVirtualbox Guest Additionsがデフォルトでインストールされるようになった．かつ，boot2docker-cliは`init`の際に，OSXの場合は`/Users`をWindowsの場合は，`/c/Users`を自動でマウントするようになった（オプションで無効にすることもできる）．

要するに，何も考えずにOSX，WindowsでVolumeが使えるようになる．

boot2dockerはDockerのバージョンアップに合わせてリリースされているので，1.2.1もしくは1.3としてリリースされそう．

## 試したい

2014年10月現在，Virtualbox Guest Additionsがインストールされたboot2docker-vmイメージまだ配布されていない．待ちきれないひとは最新boot2dockerのビルド，boot2docker-cliのインストールが必要になる．

### boot2docker-vmのビルド

イメージのビルドはDockerコンテナ内で行われるのでdockerの環境さえあればよい．

まず，Dockerfileを取得する．

```bash
$ git clone https://github.com/boot2docker/boot2docker
$ cd boot2docker
```

Dockerfileをもとにイメージをビルドする．これには多少時間かかる．

```bash
$ docker build -t user/boot2docker .
```

これで`user/boot2docker`イメージ内にboot2docker-vmが生成されているので，コンテナを起動して取り出す．

```bash
$ docker run -i -t --rm user/boot2docker /bin/bash
```

```bash
$ docker cp <Container-ID>:boot2docker.iso image
```

あとは，現在のboot2docker-vmと入れ替えるだけ（バックアップなどをしておくこと）．

```bash
$ mv image/boot2docker.iso /.boot2docker/boot2docker.iso
```

### boot2docker-cliのインストール

boot2docker-cliはGoで書かれているので，ソースを取得してクロスコンパイルする．

```bash
$ go get github.com/boot2docker/boot2docker-cli
$ cd $GOPATH/src/github.com/boot2docker/boot2docker-cli
$ make darwin
```

こちらはバイナリも既に配布されている，[https://github.com/boot2docker/boot2docker-cli/releases/tag/v1.2.0](https://github.com/boot2docker/boot2docker-cli/releases/tag/v1.2.0)．

あとは，いつものようにboot2dockerを起動するだけで自動でマウントが実行される．

```bash
$ ./boot2docker-v1.2.0-darwin-amd64 init
```

今は最初のコマンドもしっかり動作するはず．

```bash
$ echo 'hello from OSX' > hello
$ docker run -v "$(pwd)":/osx busybox cat /osx/hello
hello from OSX
```


## まとめ

実感として，Virtualbox Guest Additions版は以前のものより遅く感じた．が，Volumeが簡単に使えることを考えれば，全然許せるレベル．ローカル開発環境を整えやすくなりそう．[docker/fig](https://github.com/docker/fig)の利用も簡単になりそう．
