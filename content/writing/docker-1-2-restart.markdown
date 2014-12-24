---

title: 'Dockerの再起動オプション'
date: 2014-09-17
comments: true
categories: docker
---

[Announcing Docker 1.2.0 | Docker Blog](http://blog.docker.com/2014/08/announcing-docker-1-2-0/)

v1.2でもいくつかの面白い機能が追加された．例えば，今まで`--privileged`オプションを使うと全権限を与えてしまっていたが`--cap-add`や`--cap-drop`オプションでそれを制限できるようになったり，`–device`オプションで利用したいデバイスを指定できたり，コンテナ起動時に`/etc/hosts`を編集できたり...など．

中でも再起動オプションが良さげなので，実際に触ってみた．`docker run`を実行するときに`--restart`オプションに以下を指定するとコンテナの再起動の挙動を変更できる:

- `no` - 再起動しない（デフォルト）
- `on-failure` - 終了ステータスがnon-zeroの場合に再起動する
- `on-failure:X` - 終了ステータスがnon-zeroの場合に`X`回だけ再起動する
- `always` - 終了ステータスがなんであろうと再起動する

### no

これはデフォルトの挙動で，再起動は行わない．

```bash
$ docker run --restart=no busybox /bin/sh -c 'date; exit 1'
Wed Sep 17 08:13:15 UTC 2014
```

```bash
$ docker ps -a
CONTAINER ID        IMAGE               COMMAND                CREATED             STATUS                     PORTS               NAMES
e3389974b4ef        busybox:latest      "/bin/sh -c 'date; e   5 seconds ago       Exited (1) 4 seconds ago                       jolly_hoover
```

### on-failure

これは終了ステータスがnon-zeroの場合に再起動し続ける．

```bash
$ docker run --restart=on-failure busybox /bin/sh -c 'date; exit 1'
Wed Sep 17 08:15:38 UTC 2014
```

```bash
$ docker ps -a
CONTAINER ID        IMAGE               COMMAND                CREATED             STATUS                         PORTS               NAMES
4fd4e22ecb35        busybox:latest      "/bin/sh -c 'date; e   4 seconds ago       Restarting (1) 1 seconds ago                       trusting_wilson
```

ログを見ると，バックグランドで再起動し続けてるのがわかる．

```bash
$ docker log 4fd4e22ecb35
Wed Sep 17 08:15:38 UTC 2014
Wed Sep 17 08:15:39 UTC 2014
Wed Sep 17 08:15:39 UTC 2014
Wed Sep 17 08:15:41 UTC 2014
Wed Sep 17 08:15:42 UTC 2014
Wed Sep 17 08:15:46 UTC 2014
Wed Sep 17 08:15:53 UTC 2014
```

### on-failure:X

`on-failure`は再起動の回数を制限することができる．例えば5回にしてみる．

```bash
$ docker run --restart=on-failure:5 busybox /bin/sh -c 'date; exit 1'
Wed Sep 17 08:51:05 UTC 2014
```

```bash
$ docker ps -a
CONTAINER ID        IMAGE               COMMAND                CREATED             STATUS                                  PORTS               NAMES
c5a86fc5e242        busybox:latest      "/bin/sh -c 'date; e   2 seconds ago       Restarting (1) Less than a second ago                       cocky_hawking
```

ログを見る．

```bash
$ docker logs c5a86fc5e242
Wed Sep 17 08:51:05 UTC 2014
Wed Sep 17 08:51:06 UTC 2014
Wed Sep 17 08:51:07 UTC 2014
Wed Sep 17 08:51:08 UTC 2014
Wed Sep 17 08:51:10 UTC 2014
```

5回再起動した後にステータスを見るとコンテナが終了しているのが確認できる．

```bash
$ docker ps -a
CONTAINER ID        IMAGE               COMMAND                CREATED             STATUS                      PORTS               NAMES
c5a86fc5e242        busybox:latest      "/bin/sh -c 'date; e   29 seconds ago      Exited (1) 24 seconds ago                       cocky_hawking
```

### always

終了コードが何であっても起動し続ける．

```bash
$ docker run --restart=always busybox /bin/sh -c 'date; exit 0'
Wed Sep 17 08:57:34 UTC 2014
```

```bash
$ docker run --restart=always busybox /bin/sh -c 'date; exit 1'
Wed Sep 17 08:57:37 UTC 2014
```

```bash
$ docker ps -a
CONTAINER ID        IMAGE               COMMAND                CREATED             STATUS                         PORTS               NAMES
19df55aec365        busybox:latest      "/bin/sh -c 'date; e   4 seconds ago       Restarting (1) 1 seconds ago                       drunk_ritchie
a158cdffcaae        busybox:latest      "/bin/sh -c 'date; e   8 seconds ago       Restarting (0) 3 seconds ago                       naughty_mclean
```

### 再起動の間隔

触っていて再起動の間隔が一定でないことに気がついた．ソースを読んでみると，

- デフォルトの再起動間隔は100ms
- コンテナが10秒以内で終了すると起動間隔を前回の2倍にする
- コンテナが10秒より長く起動した後に終了すると起動間隔をデフォルトに戻す

というロジックが入っていた．上の例のような即終了する処理をしていると起動間隔はどんどん長くなる（ドキュメントが見当たらなかったので，この辺は外部から指定できたり，いづれ変更は入りそう）．

[docker/daemon/monitor.go](https://github.com/docker/docker/blob/master/daemon/monitor.go)

```go
// resetMonitor resets the stateful fields on the containerMonitor based on the
// previous runs success or failure.  Reguardless of success, if the container had
// an execution time of more than 10s then reset the timer back to the default
func (m *containerMonitor) resetMonitor(successful bool) {
    executionTime := time.Now().Sub(m.lastStartTime).Seconds()

    if executionTime > 10 {
        m.timeIncrement = defaultTimeIncrement
    } else {
        // otherwise we need to increment the amount of time we wait before restarting
        // the process.  We will build up by multiplying the increment by 2
        m.timeIncrement *= 2
    }

    // the container exited successfully so we need to reset the failure counter
    if successful {
        m.failureCount = 0
    } else {
        m.failureCount++
    }
}
```

## まとめ

使いどころを間違えなければ，良い感じで使えそう．

コンテナの再起動は外部ツール（e.g., systemd）の領域だったけどDockerのみでそれができるようになった．でも，それらが不要になるわけではない．CLIから使えるということはAPIが公開されているということなので，外部ツールはより効率よくそれを使えるようになるということかなと．

### 参考

- [Docker 1.2.0, with restart policies | Hacker News](https://news.ycombinator.com/item?id=8212908)
- [What's new in the latest Docker release and Docker Hub @ braintree // Speaker Deck](https://speakerdeck.com/vieux/whats-new-in-the-latest-docker-release-and-docker-hub-at-braintree)
