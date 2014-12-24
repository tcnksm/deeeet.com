---

title: '認証付きのDocker Private registryを立てる'
date: 2014-10-02
comments: true
categories: docker
---

DockerHub（Public registry）を使えない場合は，Private Registryを立てる必要がある．DockerはPrivate registry用のDockerイメージを提供しているため，コンテナを立てるだけですぐに使い始めることができる．

```bash
$ docker run -p 5000:5000 registry
$ docker push docker-private.com:5000/test-image:latest
```

ただ，これだとURLを知っていれば誰でも好きにイメージをpushできてしまうので，認証を行う必要がある．認証には，Dockerクライアント（`docker login`）が対応しているBasic認証を利用する．Docker registryには認証機構がないため，nginxやApacheをリバースプロキシとして配置して，Basic認証を行う．

このとき，（当たり前だが）以下の2つの制限がある．

- DockerクライアントのBasic認証はSSLが必須である
- Dockerクライアントは証明書の正当性をちゃんとチェックする（無視できない）

気軽さを求めて自己署名証明書を使うと，いくつか面倒な部分があるのでまとめておく．環境としては，サーバーをUbuntu，リバースプロキシをnginx，クライアントをOSX+boot2dockerとする．

## サーバー側の設定

サーバー側では以下の3つの設定を行う．

- nginxの設定
- 認証するユーザのパスワードの設定
- 自己署名証明書の作成

### nginxの設定

リバースプロキシにはnginxを用いる．Docker registryはBasic認証を行うためのnginxの設定例を提供している（[docker-registry/contrib/nginx](https://github.com/docker/docker-registry/tree/master/contrib/nginx)）ので，それをそのまま利用する．

```bash
$ git clone https://github.com/docker/docker-registry
$ cp docker-registry/contrib/nginx/nginx_1-3-9.conf /etc/nginx/conf.d/.
$ cp docker-registry/contrib/nginx/docker-registry.conf /etc/nginx/.
```

### パスワードの設定

Docker Registryを利用するユーザの設定を行う（`apache2-utils`パッケージを利用する）．

```bash
$ htpasswd -bc /etc/nginx/docker-registry.htpasswd USERNAME PASSWORD
```

### 自己署名証明書の作成

自己署名（オレオレ）証明書を作る．まず，CAの秘密鍵と公開鍵を作成しておく．

```bash
$ echo 01 > ca.srl
$ openssl genrsa -des3 -out ca-key.pem 2048
$ openssl req -new -x509 -days 365 -key ca-key.pem -out ca.pem
```

次に，このCAを使ってサーバーの秘密鍵と証明書（CRT）を作成する．

```bash
$ openssl genrsa -des3 -out server-key.pem 2048
$ openssl req -subj '/CN=<Your Hostname Here>' -new -key server-key.pem -out server.csr
$ openssl x509 -req -days 365 -in server.csr -CA ca.pem -CAkey ca-key.pem -out server-cert.pem
```

パスフレーズは削除しておく．

```bash
$ openssl rsa -in server-key.pem -out server-key.pem
```

最後にこれらをしかるべき配置しておく．

```bash
$ cp server-cert.pem /etc/ssl/certs/docker-registry
$ cp server-key.pem /etc/ssl/private/docker-registry
```

## クライアント側の設定

クライアント側では，サーバーの自己署名証明書を受け入れる設定をする．無視できるようにしようという流れはあるが，実現はしていない，というかなさそう（2014年10月現在）（[#2687](https://github.com/docker/docker/pull/2687)，[#5817](https://github.com/docker/docker/pull/5817)）．

OSX上でboot2dockerを使っている場合は，**OSXで設定するのではなくboot2docker-vmに設定する必要がある**．上でサーバーの自己署名証明書の作成したCAの公開鍵（`ca.pem`）を使う（[#347](https://github.com/boot2docker/boot2docker/issues/347)）

```bash
$ boot2docker ssh
$ cat ca.pem >> /etc/ssl/certs/ca-certificates.crt
$ /etc/init.d/docker restart
```

以上．あとはログインすればDockerHubのように利用できる．

```bash
$ docker login https://docker-private.com
```

## まとめ

自己署名証明は初めてであまり自信ないので，おかしい部分があれば教えてください．次にまた必要になれば自動化する．

### 参考

- [Running Docker with https](http://docs.docker.com/articles/https/) - Docker deamonとDocker client間もSSLで通信することができる．deamonがリモートで，clientがローカルという構成では必要になるかもしれない．
- [Deploying your own Private Docker Registry | ActiveState](http://www.activestate.com/blog/2014/01/deploying-your-own-private-docker-registry)
- [オレオレ証明書をopensslで作る - ろば電子が詰まっている](http://d.hatena.ne.jp/ozuma/20130511/1368284304)
- [社内用Docker Registryを立てる - $shibayu36->blog;](http://shibayu36.hatenablog.com/entry/2013/12/24/194134)
