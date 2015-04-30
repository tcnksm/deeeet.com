---

title: 'Dockerとtmuxを連携するdmuxというツールをつくった'
date: 2014-06-15
comments: true
draft: true
categories: docker golang
---

Docker + tmux = [dmux](https://github.com/tcnksm/dmux) !

dmuxを使うと現在起動中のtmuxのwindowにおいて，新しくpaneをつくりそこでDockerコンテナを起動することができる．使い捨て，かつ高速に起動するクリーンな環境でコマンドを試したり，ツールを入れて使ってみたりなどといったことができる．また，プロセスと途中で止めて，後にそれを再開することもできる．

## デモ

以下は簡単な動作例．

<img src="/images/dmux.gif" class="image">

上のデモでは，以下のことが可能であることを示している．

- `dmux init`により新しいpaneでコンテナを起動し，そこにアタッチする
- `dmux stop`でプロセスを停止してpaneを削除する
- `dmux start`で停止したプロセスを再開（`for`文のカウントが途中から再開している）し，新しいpaneで再びコンテナにアタッチする
- `dmux delete`でコンテナとpaneを削除する

## なぜつくったか

Dockerの[v0.12.0](https://github.com/dotcloud/docker/blob/master/CHANGELOG.md#0120-2014-06-05)で追加された`pause`，`unpause`コマンドの検証と，それによってどのようことができそうかを探求するためにつくった．

そもそもDockerには，`stop`と`start`というコマンドがある．これらは，コンテナの停止と起動のために使われる．具体的には`stop`を実行すると，コンテナには`SIGTERM`と`SIGKILL`が送られコンテナはシャットダウンする．そして`start`を実行すると停止したコンテナが再起動する．

それと異なり`pause`は，[cgroup freezer](https://www.kernel.org/doc/Documentation/cgroups/freezer-subsystem.txt)により，コンテナを停止する．つまり，`pause`を使うとプロセスの実行を一時停止，再開することができるようになる．

`pause`を使えばライブマイグレーションができるのでは，といろいろ試してみたが，まだまだその土壌はなく断念した．それでもこれは面白い機能なので，何かできないかということで今回の実装に至った．実際，上のデモにおける`for`文の停止とその再開はこの`pause`を使って実現している．

また，dotcloudの[jpetazzo](https://github.com/jpetazzo)さんが，[CRIU](http://criu.org/Main_Page)（"Checkpoint Restart In Userspace"）を使って似たようなツールをつくっており，それにインスパイアされている．

## dmuxの機能

`pause`と`unpause`で遊ぶだけでなく，ある程度使えるツールにはしてある（つもり）．上のデモの内容に加えて以下のことできる．

- `dmux init`ではデフォルトで`ubuntu`イメージが使われるが，`-i`オプションで好きなイメージを指定することができる．つまり，作成したイメージの軽い検証に使える．
- `dmux save`を使うといろいろ試したコンテナをイメージとして保存することができる．

詳しい使い方は[README](https://github.com/tcnksm/dmux/blob/master/README.md)を参照．

## インストール

`go get`でインストールできる．

```bash
$ go get install github.com/tcnksm/dmux
```

バグは[@deeeet](https://twitter.com/deeeet)，もしくはGithubのIssueにお願いします．

### 参考

- [jpetazzo/critmux・Github](https://github.com/jpetazzo/critmux)
- [Linux container update](http://www.slideshare.net/kosaki55tea/linux-container-update)
- [CRIU (1) - TenForwardの日記](http://d.hatena.ne.jp/defiant/20121024/1351079121)






