+++
date = "2015-03-12T23:20:39+09:00"
draft = true
title = "appc discover"
+++

イメージの署名について

appcの名前はURLのような生`example.com/reduce-worker`が，明確なスキーマがないのでイメージのURLを解決することができない．さらに，名前以上にバージョンやOSといった情報が必要になる．appc specはアプリ?イメージの名前からインターネット上のイメージを見つける方法も定義している．

Image Discovery is inspired by Go's remote import paths

3つのタイプがある．

- イメージの場所を示すURL（`.aci`）
- 署名のURL（`.asc`）
- 公開鍵のURL

テンプレートを使ってMetaデータを定義する．

- Simple discovery
- Meta disveory

の2つ方法を定義する．

## Simple discovery

与えられた値を以下のテンプレートに当てはめてイメージをダウンロードしようとする．

https://{name}-{version}-{os}-{arch}.{ext}

例えば，`example.com/reduce-worker`というアプリケーション名でバージョン`1.0.0`かつ`amd64`でOSが`linux`なら以下のようなURLでACIを取得しようとする．

https://example.com/reduce-worker-1.0.0-linux-amd64.aci

もしこれが失敗したらMetaデータによるDiscoveryを行う．Simpleの場合は，公開鍵を見つける方法はない．

## Meta discovery

Simpleが失敗したらHTTPSとHTMLで提供されるmetaタグによるディスカバリを行う．もしRuntimeが`example.com/reduce-worker`を探しているなら，以下のようなリクエストを行う．

https://example.com/reduce-worker?ac-discovery=1

そのリクエストで得られるHTMLに以下のようなMetaタグを含ませる．

<meta name="ac-discovery" content="prefix-match url-tmpl">
<meta name="ac-discovery-pubkeys" content="prefix-match url">

- `ac-discovery`にはACIか署名の場所を示すURLを記述する
- `ac-disvovery-pubkeys`にはACIの署名を検証するための公開鍵の場所を示すURLを記述する

`prefix-match`はACの名前と一致するかを確認するために利用する．

例えば以下のようなHTMLを準備する．

<meta name="ac-discovery" content="example.com https://storage.example.com/{os}/{arch}/{name}-{version}.{ext}?torrent">
<meta name="ac-discovery" content="example.com hdfs://storage.example.com/{name}-{version}-{os}-{arch}.{ext}">
<meta name="ac-discovery-pubkeys" content="example.com https://example.com/pubkeys.gpg">

ここから以下の3つのURLが得られる

- 署名: https://storage.example.com/linux/amd64/reduce-worker-1.0.0.aci.asc
- ACI: https://storage.example.com/linux/amd64/reduce-worker-1.0.0.aci
- 公開鍵: https://example.com/pubkeys.gpg

## 認証とかは?

HTTPSとHTMLだし，自分でBasic認証とかつければよい

## actool discover

actool discover -insecure coreos.com/etcd

ACI: https://github.com/coreos/etcd/releases/download/latest/etcd-latest-linux-amd64.aci, ASC: https://github.com/coreos/etcd/releases/download/latest/etcd-latest-linux-amd64.aci.asc
Keys: https://coreos.com/dist/pubkeys/aci-pubkeys.gpg


## AC name

appcの名前はDNSに受け入れられるものである必要がある([http://tools.ietf.org/html/rfc1123#page-13](http://tools.ietf.org/html/rfc1123#page-13))

例えば以下のようにする．

database
example.com/database
example.com/ourapp

example.com/app -> https://example. com/releases/app.aci

自分で実装するのが良さそう．HTTPS..?

curl https://coreos.com/etcd?ac-discovery=1 | grep meta
<meta name="ac-discovery" content="coreos.com/etcd https://github.com/coreos/etcd/releases/download/{version}/etcd-{version}-{os}-{arch}.{ext}">
<meta name="ac-discovery-pubkeys" content="coreos.com/etcd https://coreos.com/dist/pubkeys/aci-pubkeys.gpg">

metaタグで公開鍵とイメージの場所を伝える．公開鍵はあらかじめ取得しておく．gpg

App name -\> artifact

HTTPS+HTML

Metadata service?
http://AC_META_URL/acMetadata
HMAX verfication https


