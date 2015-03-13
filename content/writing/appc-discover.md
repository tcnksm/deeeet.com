+++
date = "2015-03-12T23:20:39+09:00"
title = "ACIのディスカバリーの仕様"
+++

[App Container Image Discovery](https://github.com/appc/spec/blob/master/SPEC.md#app-container-image-discovery)

["AppcとCoreOS/Rocket"](http://deeeet.com/writing/2015/03/12/rocket/) に書いたようにAppc Specではインターネット上に配置したApp Container Image（ACI）のURLとそれを検証するための署名のURLをACIの名前から解決する方法も仕様として定めている．その仕様がなかなか面白いので簡単にまとめておく．

## なぜ必要か

Dockerではイメージの配布にDockerHubやDocker Registryを使う．使うしかない．イメージ取得をするにはRegistryと話す必要があり拡張性がない．`.tar`形式にして自分の好きなストレージに置くこともできるが気軽さは失われる．これらを踏まえてAppc specでは普通に使われているWebの技術/仕様（HTTPS+HTML）を用いて誰でもそれを実装できるようにしている．

## ディスカバリーの仕様

ACIの名前は[DNS RFC1123](http://tools.ietf.org/html/rfc1123#page-13)で受け入れられる小文字と`/`から構成する．

ACIの名前はURLのような構造になる．例えば`example.com/reduce-worker`のようになる．しかし，これには明確なスキーマがないので直接イメージのURLを解決することができない．さらにACIをコンテナとして動かす場合は名前だけではなくバージョンやOS/アーキテクチャといった値も必要になる．Appc specはこの仕様をGo言語の[Remote import path](https://golang.org/cmd/go/#hdr-Remote_import_paths)を参考に作成している．

解決するべきURLは以下の3つである．

- イメージの場所を示すURL（`.aci`）
- 署名のURL（`.asc`）
- 公開鍵のURL

解決方法は，Simple discoveryとMeta discoveryの2つがあり，どちらもテンプレートを使ってイメージのURLを解決する．これらの2つ方法について簡単に説明する．

### Simple discovery

Simple discoveryは以下のテンプレートを用いる．

```bash
https://{name}-{version}-{os}-{arch}.{ext}
```

例えば，バージョンが`1.0.0`でプラットフォームが`linux/amd64`である`example.com/reduce-worker`という名前のACIのURLは以下のように解決する．

```bash
$ https://example.com/reduce-worker-1.0.0-linux-amd64.aci
```

上記のURLによるACIの取得が失敗した場合はMeta discoveryを行う．成功した場合は，以下のURLで署名を取得する．

```bash
$ https://example.com/reduce-worker-1.0.0-linux-amd64.aci.asc
```

なおSimple discoveryで公開鍵を見つける方法はない．

### Meta discovery

Simple discoveryが失敗したらHTTPSとHTMLのmetaタグを用いてACIの名前から各種URLを解決する．

例えば`example.com/reduce-worker`という名前のACIを見つける場合，まず以下のようなリクエストを送る．

```bash
https://example.com/reduce-worker?ac-discovery=1
```

そして，そのリクエストから得られるHTMLに以下のようなMetaタグを含ませる．

```html
<meta name="ac-discovery" content="prefix-match url-tmpl">
<meta name="ac-discovery-pubkeys" content="prefix-match url">
```

構成要素は以下のようになる．

- `ac-discovery`にはACI，もしくは署名の場所を示すURLを記述する
- `ac-disvovery-pubkeys`にはACIの署名を検証するための公開鍵の場所を示すURLを記述する
- `prefix-match`はACの名前と一致するかを確認するために利用する

例えば以下のようなmetaタグを含んだHTMLを準備する．`http`以外のスキーマでも良い．

```html
<meta name="ac-discovery" content="example.com https://storage.example.com/{os}/{arch}/{name}-{version}.{ext}?torrent">
<meta name="ac-discovery" content="example.com hdfs://storage.example.com/{name}-{version}-{os}-{arch}.{ext}">
<meta name="ac-discovery-pubkeys" content="example.com https://example.com/pubkeys.gpg">
```

バージョンが`1.0.0`でプラットフォームが`linux/amd64`の場合は以下の3つのURLが得られる．

- 署名: https://storage.example.com/linux/amd64/reduce-worker-1.0.0.aci.asc
- ACI: https://storage.example.com/linux/amd64/reduce-worker-1.0.0.aci
- 公開鍵: https://example.com/pubkeys.gpg

### 認証とかは?

HTTPSとHTMLなのでRuntimeに合わせてBasic認証などを準備すればよい．

