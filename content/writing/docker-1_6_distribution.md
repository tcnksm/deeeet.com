+++
date = "2015-04-20T22:55:35+09:00"
title = "Content Addressable DockerイメージとRegistry2.0"
+++

[Docker 1.6: Engine & Orchestration Updates, Registry 2.0, & Windows Client Preview | Docker Blog](http://blog.docker.com/2015/04/docker-release-1-6/)

Docker1.6が出た．コンテナやイメージのラベリング（RancherOSの["Adding Label Support to Docker 1.6"](http://rancher.com/docker-labels/)がわかりやすい）や，Logging Driversといった新機能が追加された．今回のリリースで自分的に嬉しいのはDockerイメージがContent-addressableになったこと（[#11109](https://github.com/docker/docker/pull/11109)）．

今までDocker Regitryを介したイメージのやりとりはイメージの名前とタグ（e.g., `tcnksm/golang:1.2`）しか使うことができなかった．タグはイメージの作成者によって付与されるのもであり，同じタグであっても必ず同じイメージが利用できるという保証はなかった（Gitでいうとコミットハッシュが使えず，タグのみしか使えないという状況）．

Docker1.6と同時に発表されたRegistry2.0（[docker/distribution](https://github.com/docker/distribution)）によりイメージにユニークなID（`digest`）が付与されるようになり，確実に同じイメージを参照することができるようになった（immutable image references）．

## 使ってみる

DockerHubはすでにRegistry2.0になっているのですぐにこの機能は使える．が，今回は自分でPrivate Registryを立ててこの機能を試してみる（環境はboot2docker on OSX）．

まずはRegistryを立てる．v1と同じようにDockerイメージが提供されている．

```bash
$ docker run -p 5000:5000 registry:2.0
```

簡単な`Dockerfile`を準備して`tcnksm/test-digest`イメージをビルドする．

```bash
FROM busybox
```

```bash
$ docker build -t $(boot2docker ip):5000/tcnksm/test-digest:latest .
```

`images`コマンドで確認する．`--digests`オプションをつけると`digest`が表示されるようになる．Gitと同じように考えると直感とズレるかもしれないが`build`するだけでは`digest`は生成されない．

```bash
$ docker images --digests
REPOSITORY                               TAG                 DIGEST              IMAGE ID            CREATED             VIRTUAL SIZE
192.168.59.103:5000/tcnksm/test-digest   latest              <none>              8c2e06607696        3 days ago          2.433 MB
```

Registryに`push`してみる．`push`すると`digest`が生成される．

```bash
$ docker push $(boot2docker ip):5000/tcnksm/test-digest:latest
...
Digest: sha256:e4c425e28a3cfe41efdfceda7ccce6be4efd6fc775b24d5ae26477c96fb5eaa4
```


生成したイメージを削除し`digest`を使ってイメージを`pull`してみる．`NAME:TAG`ではなく`NAME@DIGEST`という形式で指定する．

```bash
$ docker rmi $(boot2docker ip):5000/tcnksm/test-digest:latest
```

```bash
$ docker pull $(boot2docker ip):5000/tcnksm/test-digest@sha256:e4c425e28a3cfe41efdfceda7ccce6be4efd6fc775b24d5ae26477c96fb5eaa4
```

`images`コマンドで確認する．今回は`digest`が表示されているのが確認できる．

```bash
$ docker images --digests
REPOSITORY                               TAG                 DIGEST                                                                    IMAGE ID            CREATED             VIRTUAL SIZE
192.168.59.103:5000/tcnksm/test-digest   <none>              sha256:e4c425e28a3cfe41efdfceda7ccce6be4efd6fc775b24d5ae26477c96fb5eaa4   8c2e06607696        3 days ago          2.433 MB
```

### Dockerfile

`Dockerfile`の`FROM`でのイメージ名の指定にも`digest`は使える．気がついたら元のイメージ更新されていて完成イメージが意図しないものになっていたということが避けられる．

```bash
FROM 192.168.59.103:5000/tcnksm/test-digest@sha256:e4c425e28a3cfe41efdfceda7ccce6be4efd6fc775b24d5ae26477c96fb5eaa4
```

```bash
$ docker build .
Step 0 : FROM 192.168.59.103:5000/tcnksm/test-digest@sha256:e4c425e28a3cfe41efdfceda7ccce6be4efd6fc775b24d5ae26477c96fb5eaa4
---> 8c2e06607696
Successfully built 8c2e06607696
```

### イメージの更新

`Dockerfile`を編集して新しいイメージを`build`する．

```bash
FROM busybox
MAINTAINER tcnksm
```

```bash
$ docker build -t $(boot2docker ip):5000/tcnksm/test-digest:latest .
```

Registryに`push`する．すると今度は異なる`digest`が生成される．

```bash
$ docker push $(boot2docker ip):5000/tcnksm/test-digest:latest
...
Digest: sha256:4675f7a9d45932e3043058ef032680d76e8aacccda94b74374efe156e2940ee5
```

## 仕組み

簡単に仕組みを説明する．`digest`は手元で生成されるわけではない．`push`してRegistry側で生成される．

まずclientはイメージと共にImage ManifestをRegistryに送る（署名する）．Image ManifestはそのDocker Imageの内容をJSONで定義したもの．Golangのstructでいうと以下のようなものでイメージの名前やタグ，FSレイヤーといった情報が書かれる（Manifestは[ここ](https://github.com/docker/distribution/blob/master/docs/spec/manifest-v2-1.md)に定義されている）．

```golang
type ManifestData struct {
    Name          string             `json:"name"`
    Tag           string             `json:"tag"`
    Architecture  string             `json:"architecture"`
    FSLayers      []*FSLayer         `json:"fsLayers"`
    History       []*ManifestHistory `json:"history"`
    SchemaVersion int                `json:"schemaVersion"`
}
```

APIを叩くとManifestの中身を見ることができる．

```bash
$ curl $(boot2docker ip):5000/v2/tcnksm/test-digest/manifests/latest
```

そしてRegistryは以下の関数内でリクエストされたManifestを元に`digest`を生成する（[registry/handlers/images.go](https://github.com/docker/distribution/blob/master/registry/handlers/images.go)）．

```golang
// PutImageManifest validates and stores and image in the registry.
func (imh *imageManifestHandler) PutImageManifest(w http.ResponseWriter, r *http.Request) 
```

`Docker-Content-Digest`ヘッダでそれをclientに送る（[API doc](https://github.com/docker/distribution/blob/master/docs/spec/api.md#put-manifest)）

```
202 Accepted
Location: <url>
Content-Length: 0
Docker-Content-Digest: <digest>
```

### Regitryが異なったら...?

送るManifestは同じなのでRegistryが違っても同じ`digest`が付与される．`digest`はRegistryをまたがってユニークになる．

上で作成したイメージをDockerHubに`push`してみる．同じ`digest`が付与される．

```bash
$ docker build -t tcnksm/test-digest:latest .
```

```bash
$ docker push tcnksm/test-digest:latest
...
Digest: sha256:e4c425e28a3cfe41efdfceda7ccce6be4efd6fc775b24d5ae26477c96fb5eaa4
```

## Registry2.0

[Faster and Better Image Distribution with Registry 2.0 and Engine 1.6 | Docker Blog](http://blog.docker.com/2015/04/faster-and-better-image-distribution-with-registry-2-0-and-engine-1-6/)

[docker/distribution](https://github.com/docker/distribution)は新しいRegistryの実装で，APIやセキュリティなど今までのRegistryの問題を解決しようとしている．今まではPythonで実装されていたがGo言語で再実装されている．

特徴的なのは，

- イメージManifestの再定義（[Image Manifest Version 2, Schema 1](https://github.com/docker/distribution/blob/master/docs/spec/manifest-v2-1.md)） - [#8093](https://github.com/docker/docker/issues/8093)を参照．セキュリティの改善が主な目的．
- APIの刷新（[Docker Registry HTTP API V2](https://github.com/docker/distribution/blob/master/docs/spec/api.md), [#Detail](https://github.com/docker/distribution/blob/master/docs/spec/api.md#detail)）- URIの改善，Manifest V2を利用できるようにする，Push/Pullが途中で死んでも終わったところから再開できるようにする，などなど（詳しく見てないけどclientはGo言語のinterfaceとして定義されていたので自分で独自のものをつくれる...?）
- バックエンドのストレージをPluggable化（[Docker-Registry Storage Driver](https://github.com/docker/distribution/blob/master/docs/storagedrivers.md)）- 現在は，インメモリ，ファイルシステム，S3，Azure Blob Storageが選択できる．Go言語のinterfaceとして定義されてるので自分で実装することもできる．
- Webhookの実装（[Notifications](https://github.com/docker/distribution/blob/master/docs/notifications.md)）- Push/Pullといったイベントが発生するごとに設定したendopointにリクエストを送ることができる．

あとまだスケルトンしかないが`dist`コマンドというものを作ろうとしている（[dist](https://github.com/docker/distribution/tree/master/cmd/dist)）．これはDockerデーモンなしでDockerイメージのpull/pushを行うコマンド．Dockerの少し嫌な部分としてrumtimeとイメージのダウンロードが分かれていないというのがあったが，それをここで解決しようとしているっぽい．

## References

- [Docker Registry 2.0](https://docs.docker.com/registry/overview/)
- [Docker Registry v2 authentication via central service](https://github.com/docker/distribution/blob/master/docs/spec/auth/token.md)
- [Deploying a registry service](https://github.com/docker/distribution/blob/master/docs/deploying.md)
- [kelseyhightower/docker-registry-osx-setup-guide](https://github.com/kelseyhightower/docker-registry-osx-setup-guide)

