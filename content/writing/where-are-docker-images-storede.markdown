---

title: 'Dockerのイメージはどこにある?'
date: 2013-12-16
comments: true
categories: docker
---


[Where are Docker images stored?](http://blog.thoward37.me/articles/where-are-docker-images-stored/)

非常にわかりやすいまとめ．ただ，自分の環境とはディレクトリ構造などが若干異なった (バージョンが異なる?) ので，自分で手を動かしながらまとめなおしてみた．

今回用いるDockerのバージョンは以下．

```bash
$ docker -v
Docker version 0.7.2
```

`ubuntu`レポジトリを取得する

```bash
$ docker pull ubuntu
```

```bash
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             VIRTUAL SIZE
ubuntu              12.04               8dbd9e392a96        8 months ago        128 MB
ubuntu              latest              8dbd9e392a96        8 months ago        128 MB
ubuntu              precise             8dbd9e392a96        8 months ago        128 MB
ubuntu              12.10               b750fe79269d        8 months ago        175.3 MB
ubuntu              quantal             b750fe79269d        8 months ago        175.3 MB
```

これらのイメージはどこに, どのように保存されているのか．

最初に見るべきは`/var/lib/docker/`．


```bash
$ sudo ls -al /var/lib/docker/
total 36
drwx------  6 root root 4096 Dec 17 12:16 .
drwxr-xr-x 37 root root 4096 Dec 17 12:16 ..
drwxr-xr-x  6 root root 4096 Dec 17 12:16 aufs
drwx------  2 root root 4096 Dec 17 12:16 containers
drwx------  6 root root 4096 Dec 17 12:17 graph
-rw-r--r--  1 root root 5120 Dec 17 12:16 linkgraph.db
lrwxrwxrwx  1 root root   18 Dec 17 12:16 lxc-start-unconfined -> /usr/bin/lxc-start
-rw-------  1 root root  409 Dec 17 12:17 repositories-aufs
drwx------  2 root root 4096 Dec 17 12:16 volumes
```

まず`repositories-aufs`を見てみる．

```bash
$ sudo cat /var/lib/docker/repositories-aufs | python -mjson.tool
{
    "Repositories": {
        "ubuntu": {
            "12.04": "8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c",
            "12.10": "b750fe79269d2ec9a3c593ef05b4332b1d1a02a62b4accb2c21d589ff2f5f2dc",
            "latest": "8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c",
            "precise": "8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c",
            "quantal": "b750fe79269d2ec9a3c593ef05b4332b1d1a02a62b4accb2c21d589ff2f5f2dc"
        }
    }
}
```

`repositories-aufs`には，レポジトリの情報がJSON形式で保存されて，タグとイメージのGUIDが紐づけられている．ここでは，`ubuntu`レポジトリの"12.04"，"precise"そして"latest"とタグをつけられたイメージは全て，"8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c"というGUIDと紐づけられているのが分かる．

これは，`docker images`と同じ結果である．

```bash
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             VIRTUAL SIZE
ubuntu              12.04               8dbd9e392a96        8 months ago        128 MB
ubuntu              latest              8dbd9e392a96        8 months ago        128 MB
ubuntu              precise             8dbd9e392a96        8 months ago        128 MB
ubuntu              12.10               b750fe79269d        8 months ago        175.3 MB
ubuntu              quantal             b750fe79269d        8 months ago        175.3 MB
```

次に`graph`の中身を見てみる．

```bash
$ sudo ls -al /var/lib/docker/graph
total 24
drwx------ 6 root root 4096 Dec 17 12:17 .
drwx------ 6 root root 4096 Dec 17 12:16 ..
drwx------ 2 root root 4096 Dec 17 12:17 27cf784147099545
drwx------ 2 root root 4096 Dec 17 12:17 8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c
drwx------ 2 root root 4096 Dec 17 12:17 b750fe79269d2ec9a3c593ef05b4332b1d1a02a62b4accb2c21d589ff2f5f2dc
drwx------ 2 root root 4096 Dec 17 12:17 _tmp
```

イメージのGUIDが現れた．さらに，`/var/lib/docker/graph/8dbd9e392a96…`の中身を見てみる．

```bash
$ sudo ls -al /var/lib/docker/graph/8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c
total 16
drwx------ 2 root root 4096 Dec 17 12:17 .
drwx------ 6 root root 4096 Dec 17 12:17 ..
-rw------- 1 root root  437 Dec 17 12:17 json
-rw------- 1 root root    9 Dec 17 12:17 layersize
```

`json`には，イメージのメタデータが保存されている．

```bash
$ sudo cat /var/lib/docker/graph/8dbd9e392a964056420e5d58ca518e2de93b5cc90e868a1bbc8318c1c/json | python -mjson.tool
{
    "comment": "Imported from -",
    "container_config": {
        "AttachStderr": false,
        "AttachStdin": false,
        "AttachStdout": false,
        "Cmd": null,
        "Env": null,
        "Hostname": "",
        "Image": "",
        "Memory": 0,
        "MemorySwap": 0,
        "OpenStdin": false,
        "PortSpecs": null,
        "StdinOnce": false,
        "Tty": false,
        "User": ""
    },
    "created": "2013-04-11T14:13:15.57812-07:00",
    "docker_version": "0.1.4",
    "id": "8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c"
}
```

そして`layersize`にはレイヤーのサイズが保存されている．

```bash
$ sudo cat /var/lib/docker/graph/8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c/layersize | python -mjson.tool
128029199 #128M
```

次に，`/var/lib/docker/aufs/`の中身を見てみる．

```bash
$ sudo ls -al /var/lib/docker/aufs/    
total 24
drwxr-xr-x 6 root root 4096 Dec 17 12:16 .
drwx------ 6 root root 4096 Dec 17 12:16 ..
drwxr-xr-x 5 root root 4096 Dec 17 12:17 diff
drwxr-xr-x 2 root root 4096 Dec 17 12:17 layers
drwxr-xr-x 5 root root 4096 Dec 17 12:17 mnt
drwxr-xr-x 4 root root 4096 Dec 17 12:16 tmp
```

`diff`の中身を見てみる．

```bash
$ sudo ls -al /var/lib/docker/aufs/diff  
total 20
drwxr-xr-x  5 root root 4096 Dec 17 12:17 .
drwxr-xr-x  6 root root 4096 Dec 17 12:16 ..
drwxr-xr-x 22 root root 4096 Mar 23  2013 27cf784147099545
drwxr-xr-x 22 root root 4096 Apr 11  2013 8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c
drwxr-xr-x  6 root root 4096 Mar 24  2013 b750fe79269d2ec9a3c593ef05b4332b1d1a02a62b4accb2c21d589ff2f5f2dc
```

再び，GUIDが現れた．さらに，`/var/lib/docker/aufs/diff/8dbd9e392a96…`の中身を見てみる．

```bash
$ sudo ls -al /var/lib/docker/aufs/diff/8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c
total 88
drwxr-xr-x 22 root root 4096 Apr 11  2013 .
drwxr-xr-x  5 root root 4096 Dec 17 12:17 ..
drwxr-xr-x  2 root root 4096 Apr 11  2013 bin
drwxr-xr-x  2 root root 4096 Apr 19  2012 boot
drwxr-xr-x  4 root root 4096 Dec 17 12:17 dev
drwxr-xr-x 41 root root 4096 Dec 17 12:17 etc
drwxr-xr-x  2 root root 4096 Apr 19  2012 home
drwxr-xr-x 11 root root 4096 Dec 17 12:16 lib
drwxr-xr-x  2 root root 4096 Dec 17 12:17 lib64
drwxr-xr-x  2 root root 4096 Apr 11  2013 media
drwxr-xr-x  2 root root 4096 Apr 19  2012 mnt
drwxr-xr-x  2 root root 4096 Apr 11  2013 opt
drwxr-xr-x  2 root root 4096 Apr 19  2012 proc
drwx------  2 root root 4096 Dec 17 12:16 root
drwxr-xr-x  4 root root 4096 Dec 17 12:17 run
drwxr-xr-x  2 root root 4096 Dec 17 12:17 sbin
drwxr-xr-x  2 root root 4096 Mar  5  2012 selinux
drwxr-xr-x  2 root root 4096 Apr 11  2013 srv
drwxr-xr-x  2 root root 4096 Apr 14  2012 sys
drwxrwxrwt  2 root root 4096 Apr 11  2013 tmp
drwxr-xr-x 10 root root 4096 Dec 17 12:16 usr
drwxr-xr-x 11 root root 4096 Dec 17 12:17 var
```

ここには，イメージのrootのファイルシステムが保持されているのがわかる．

これがローカルにおけるDockerのイメージの保存方法である．まとめると，

- `/var/lib/docker/repositories-aufs`にJSON形式でGUIDとタグのマッピング情報を保持
- `/var/lib/docker/graph/<GUID>/json`にイメージのメタ情報を保持
- `/var/lib/docker/graph/<GUID>/layersize`にレイヤーのファイルサイズを保持
- `/var/lib/docker/aufs/diff/<GUID>`に実際のファイルシステムの差分を保持


次に，以下のDockerfileで自分のイメージを作ってみる．

```
FROM ubuntu
RUN touch test.txt
```

ubuntuイメージに対して，`text.txt`という名前で空ファイルを作るという単純なもの．

```bash
$ docker build -t test_image .
```

できたイメージを確認する．

```bash
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             VIRTUAL SIZE
test_image          latest              95d8b8aeedec        4 seconds ago       128 MB
ubuntu              12.04               8dbd9e392a96        8 months ago        128 MB
ubuntu              latest              8dbd9e392a96        8 months ago        128 MB
ubuntu              precise             8dbd9e392a96        8 months ago        128 MB
ubuntu              12.10               b750fe79269d        8 months ago        175.3 MB
ubuntu              quantal             b750fe79269d        8 months ago        175.3 MB
```

`test_image`ができている（タグ名を与えない場合は，自動で`latest`のタグが付与されるのもわかる）．

`/var/lib/docker/repositories-aufs`を見てみる．

```bash
$ sudo cat /var/lib/docker/repositories-aufs | python -mjson.tool
{
    "Repositories": {
        "test_image": {
            "latest": "95d8b8aeedecd36eb7c9e70f01c7b1e81203abd2cd6a17d7db9cdf582a55547b"
        },
        "ubuntu": {
            "12.04": "8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c",
            "12.10": "b750fe79269d2ec9a3c593ef05b4332b1d1a02a62b4accb2c21d589ff2f5f2dc",
            "latest": "8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c",
            "precise": "8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c",
            "quantal": "b750fe79269d2ec9a3c593ef05b4332b1d1a02a62b4accb2c21d589ff2f5f2dc"
        }
    }
}
```

新しいレポジトリが登録されている．

`/var/lib/docker/graph/`と`/var/lib/docker/aufs/diff/`には新しくディレクトリが作られているはず．

```bash
$ sudo ls -al /var/lib/docker/graph
total 28
drwx------ 7 root root 4096 Dec 17 14:48 .
drwx------ 6 root root 4096 Dec 17 14:48 ..
drwx------ 2 root root 4096 Dec 17 12:17 27cf784147099545
drwx------ 2 root root 4096 Dec 17 12:17 8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c
drwx------ 2 root root 4096 Dec 17 14:48 95d8b8aeedecd36eb7c9e70f01c7b1e81203abd2cd6a17d7db9cdf582a55547b
drwx------ 2 root root 4096 Dec 17 12:17 b750fe79269d2ec9a3c593ef05b4332b1d1a02a62b4accb2c21d589ff2f5f2dc
drwx------ 2 root root 4096 Dec 17 14:48 _tmp
```

```bash
$ sudo ls -al /var/lib/docker/aufs/diff
total 32
drwxr-xr-x  8 root root 4096 Dec 17 14:48 .
drwxr-xr-x  6 root root 4096 Dec 17 12:16 ..
drwxr-xr-x 22 root root 4096 Mar 23  2013 27cf784147099545
drwxr-xr-x  4 root root 4096 Dec 17 14:48 2c43fda23b3e86ad16dbddde96c5a8ffc9f30db1985ceac9468387324403ab84
drwxr-xr-x  5 root root 4096 Dec 17 14:48 2c43fda23b3e86ad16dbddde96c5a8ffc9f30db1985ceac9468387324403ab84-init
drwxr-xr-x 22 root root 4096 Apr 11  2013 8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c
drwxr-xr-x  4 root root 4096 Dec 17 14:48 95d8b8aeedecd36eb7c9e70f01c7b1e81203abd2cd6a17d7db9cdf582a55547b
drwxr-xr-x  6 root root 4096 Mar 24  2013 b750fe79269d2ec9a3c593ef05b4332b1d1a02a62b4accb2c21d589ff2f5f2dc
```

どちらにも，`95d8b8aeedec…`というGUIDでディレクトリが新しく作成されている．

`/var/lib/docker/graph/5d8b8aeedec…/json`を見てみる

```bash
$ sudo cat /var/lib/docker/graph/95d8b803abd2cd6a17d7db9cdf582a55547b/json |python -mjson.tool
{
    "Size": 0,
    "architecture": "x86_64",
    "config": {
        "AttachStderr": false,
        "AttachStdin": false,
        "AttachStdout": false,
        "Cmd": null,
        "CpuShares": 0,
        "Dns": null,
        "Domainname": "",
        "Entrypoint": null,
        "Env": [
            "HOME=/",
            "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
        ],
        "ExposedPorts": {},
        "Hostname": "2c43fda23b3e",
        "Image": "8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c",
        "Memory": 0,
        "MemorySwap": 0,
        "NetworkDisabled": false,
        "OpenStdin": false,
        "PortSpecs": null,
        "StdinOnce": false,
        "Tty": false,
        "User": "",
        "Volumes": {},
        "VolumesFrom": "",
        "WorkingDir": ""
    },
    "container": "2c43fda23b3e86ad16dbddde96c5a8ffc9f30db1985ceac9468387324403ab84",
    "container_config": {
        "AttachStderr": false,
        "AttachStdin": false,
        "AttachStdout": false,
        "Cmd": [
            "/bin/sh",
            "-c",
            "touch test.txt"
        ],
        "CpuShares": 0,
        "Dns": null,
        "Domainname": "",
        "Entrypoint": null,
        "Env": [
            "HOME=/",
            "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
        ],
        "ExposedPorts": {},
        "Hostname": "2c43fda23b3e",
        "Image": "8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c",
        "Memory": 0,
        "MemorySwap": 0,
        "NetworkDisabled": false,
        "OpenStdin": false,
        "PortSpecs": null,
        "StdinOnce": false,
        "Tty": false,
        "User": "",
        "Volumes": {},
        "VolumesFrom": "",
        "WorkingDir": ""
    },
    "created": "2013-12-17T14:48:17.530687093Z",
    "docker_version": "0.7.2",
    "id": "95d8b8aeedecd36eb7c9e70f01c7b1e81203abd2cd6a17d7db9cdf582a55547b",
    "parent": "8dbd9e392a964056420e5d58ca5cc376ef18e2de93b5cc90e868a1bbc8318c1c"
}
```

新たに、環境変数や実行したコマンドなどが追記されているのがわかる．

`var/lib/docker/graph/5d8b8aeedec…/layersize`を見てみる．

```bash
sudo cat /var/lib/docker/graph/95d8b8aeedecd36eb7c9e70f01c7b1e81203abd2cd6a17d7db9cdf582a55547b/layersize
0
```

空ファイルを追加しただけなのでlayerのファイルサイズに変化はない．

`/var/lib/docker/aufs/diff/95d8b8aeedec…`を見てみる．

```bash
sudo ls -al /var/lib/docker/aufs/diff/95d8b8aeedecd36eb7c9e70f01c7b1e81203abd2cd6a17d7db9cdf582a55547b
total 16
drwxr-xr-x 4 root root 4096 Dec 17 14:48 .
drwxr-xr-x 8 root root 4096 Dec 17 14:48 ..
-rw-r--r-- 1 root root    0 Dec 17 14:48 test.txt
-r--r--r-- 1 root root    0 Dec 17 14:48 .wh..wh.aufs
drwx------ 2 root root 4096 Dec 17 14:48 .wh..wh.orph
drwx------ 2 root root 4096 Dec 17 14:48 .wh..wh.plnk
```

`test.txt`が追加されている．ここで実際にDockerがファイルシステムの差分のみを保持しているのがわかる．

以上がDockerイメージの保存場所とその保存方法．とても単純．
