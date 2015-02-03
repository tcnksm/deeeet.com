+++
date = "2015-02-03T23:09:51+09:00"
draft = true
title = "etcd/consulに認証情報を安全に保存する"
+++

分散Key-Valueストアとして[etcd](https://github.com/coreos/etcd)や[consul](https://hashicorp.com/blog/consul.html)の利用が増えている．ここにアプリケーションの設定値などを保存し，各ホストからそれらを購読して利用する．

また，X-as-a-Serviceといった外部サービスの利用も多くなってきた．その場合API Tokenやパスワードといった認証情報が必要になる．PaaSや[Twelve-factor](http://12factor.net/)的なアーキテクチャを採用する場合は，それらの値を環境変数に保存して利用することが多い（危険であるという意見はある．cf. [http://techlife.cookpad.com/entry/envchain](http://techlife.cookpad.com/entry/envchain)）．etcdやconsulの分散Key-Valueストアの利用を前提としたアーキテクチャでは，そこに外部に漏らしたくない設定値も一緒に保存してしまうのがシンプルになる．

しかし，そういった設定値をプレインテキストのまま保存するのは望ましい状態ではない．ChefのDataBagのように，それらを暗号化して保存できるとよい．

[xordataexchange/crypt](https://github.com/xordataexchange/crypt)を使うとetcdやconsulのような分散Key-Valueストアに暗号化して値を保存できるようになる．具体的にはGNU Privacy Guard（GnuPG）で秘密鍵と公開鍵をつくり，それらを使った値の暗号化/値の取り出しを行う．本記事ではその使い方とCoreOSでの実例を簡単に紹介する．

## インストール

cryptはGoで書かれている．[バイナリ](https://github.com/xordataexchange/crypt/releases)をダウンロードすることもできるが，`go get`でも良い．

```bash
$ go install github.com/xordataexchange/crypt/bin/crypt
```

## 鍵の準備

`gpg2`を使って秘密鍵と公開鍵のペアを生成する．以下のファイル`app.batch`を作り，バッチとして生成する．

```
%echo Generating a configuration OpenPGP key
Key-Type: default
Subkey-Type: default
Name-Real: app
Name-Comment: app configuration key
Name-Email: app@example.com
Expire-Date: 0
%pubring .pubring.gpg
%secring .secring.gpg
%commit
%echo done
```

```bash
$ gpg2 --batch --armor --gen-key app.batch
```

これで秘密鍵`.secring.gpg`と公開鍵`.pubring.gpg`が生成される．

## 値の保存/取得

ここでは例としてetcdを利用する．使い方は簡単で`etcdctl`と同じ感覚で使える．例えば，以下のようなパスワード情報`config.json`をetcdの`/app/config`に保存する．保存には，上記で生成した公開鍵`.pubring.gpg`を利用する．

```bash
$ cat <<EOF > config.json
{"password": "passw0rd"}
EOF
$ crypt set -endpoint=${ETCD_PEERS} -keyring .pubring.gpg /app/config config.json
```

まず，`etcdctl`でこの値を取得してみる．

```bash
$ etcdctl get /app/config
wcBMA0OL+oKDi4zdAQgAh7iKVASBZvvX6WiiLPYSZgAbhYDhZyVGqX+uK2Bc1plC/mYkqw/n3FXyL+ZC0ISdK9Hdqv6HpCthnMHmBCfhPAjV4DsrXKWO7TP0AY/TxUPMxX9sIiTzrLTJGb73134Z6l0z0Ocj2dEuhyAt5u3cucKkQb3CWGyuhM7C02aTeJoPjIkqi3agAizQn0uwcurSONpmCkArq33/Q3579iHZv42Xnr+1Dq4Ck
```

暗号化されており，何が保存されていたかはわからない．

次に，cryptを使って値を取得する．値の取得には上記で生成した秘密鍵`.secring.gpg`を利用する．

```bash
$ crypt get -secret-keyring deeeet-com-secring.gpg /app/config
{"password":"passw0rd"}
```

## CoreOSの場合

CoreOSにおいても認証情報をetcdに保存し，Dockerコンテナのアプリケーションからその値を利用したいことはある．例えば，Dockerイメージに認証情報を保存してビルドするのではなく，コンテナを起動する際に`-e`オプションなどで動的に値を取得/設定したい場合など（以下は，模索してやっていることなので，もしより良い方法があれば教えて欲しいです）．

CoreOS内からetcdにcryptで保存した暗号化情報を購読するには，以下の2つが必要である．

- Cryptのインストール
- 秘密鍵`.secring.gpg`の保存

これらを`cloud-config`に既述する（抜粋）．

```
#cloud-config
coreos:
...
  units:
    - name: etcd.service
      command: start
    - name: fleet.service
      command: start
    - name: download-crypt.service
      command: start
      content: |
        [Unit]
        Description=Install crypt
        Documentation=https://github.com/xordataexchange/crypt
        Requires=network-online.target
        After=network-online.target

        [Service]
        Type=oneshot
        ExecStartPre=-/usr/bin/mkdir -p /opt/bin
        ExecStart=/usr/bin/sh -c '/usr/bin/wget -N -O /opt/bin/crypt https://github.com/xordataexchange/crypt/releases/download/v0.0.1/crypt-0.0.1-linux-amd64; /usr/bin/chmod +x /opt/bin/crypt'

write_files:
  - path: /etc/secring.gpg
    content: |
    -----BEGIN PGP PRIVATE KEY BLOCK-----
    Version: GnuPG v2

    lQOYBFTHh9YBC4vhuBYfvsgdCj0BhndU82up4s+MCA3F....
```

新しく`units.download-crypt.service`を定義して，cryptをインストールし，`write-files`で秘密鍵を書き出す．これで，あらかじめ認証情報をcryptを使ってectdに保存しておけば，Unitファイルからcryptでそれを取り出すことができる．

例えば，[DataDog](https://www.datadoghq.com/)でCoreOS内のDockerコンテナのメトリクスを収集したい場合，Agentの利用にはAPI Keyが必要である．これを実現するには，以下のようにあらかじめcryptでKeyを保存しておき，Unitファイルにその値を購読するように既述すればよい．

```bash
$ crypt set -endpoint=$ETCDCTL_PEERS -keyring .pubring.gpg /ddapikey .ddapikey
```

```
[Unit]
Description=Datadog agent service
Documentation=https://www.datadoghq.com/2014/08/monitor-coreos-scale-datadog/
After=docker.service
Requires=docker.service

[Service]
TimeoutStartSec=0
KillMode=none
Restart=always
ExecStartPre=-/usr/bin/docker kill dd-agent
ExecStartPre=-/usr/bin/docker rm dd-agent
ExecStartPre=/usr/bin/docker pull datadog/docker-dd-agent
ExecStart=/usr/bin/bash -c \
"/usr/bin/docker run --privileged --name dd-agent -h `hostname` \
-v /var/run/docker.sock:/var/run/docker.sock \
-v /proc/mounts:/host/proc/mounts:ro \
-v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro \
-e API_KEY=`/opt/bin/crypt get -secret-keyring /etc/secring.gpg /ddapikey` \
datadog/docker-dd-agent"

[X-Fleet]
Global=true
```

`-e API_KEY=`を動的に設定する．

## まとめ

cryptを使い，etcd/consulといった分散Key-Valueストアに安全に値を保存する方法について解説した．分散Key-Valueストアは気軽に使えるのが良いが，安全にするべきところはなるべく安全にしておきたい．

### 参考

- [Managing encrypted configs in etcd and consul with crypt](http://youtu.be/zYpqqfuGwW8)
