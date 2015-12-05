+++
date = "2015-12-01T23:18:42+09:00"
draft = true
title = "Go言語でLet's EncryptのACMEを理解する"
+++

[Let's Encrypt](https://letsencrypt.org/)

## TL;DR

Let's EncryptのベースのプロトコルであるACMEを理解する．

まずACMEをベースとしたCAである[boulder](https://github.com/letsencrypt/boulder/)をローカルで動かす．次にACMEのGo言語クライアントライブラリである[ericchiang/letsencrypt](https://github.com/ericchiang/letsencrypt)（非公式）を使い実際にboulderで証明書発行を行い，コードとともにACMEが具体的にどのようなことしているのかを追う．

## はじめに

Let's Encryptとは無料・自動・オープンを掲げる認証局（CA）である．特に無料・自動により今までの証明書発行が抱えていた問題を解決しようとしている（cf. ["Let's Encrypt を支える ACME プロトコル"](http://jxck.hatenablog.com/entry/letsencrypt-acme)）．

Let's EncryptはDV証明書を発行することができる．DV証明書はドメインの所有を確認して発行されるタイプの証明書である．クライアントからリクエストを受け，そのクライアントのドメインの所有の確認し証明書を発行するまでの手順はAutomated Certificate Management Environment（ACME）プロトコルとして標準化が進められている．

ACMEが標準化されることでLet's Encrypt以外のCAもDV証明書の発行の自動化が期待できる．プロトコルの標準化だけではなく，ACMEベースのCAは自体も[Boulder](https://github.com/letsencrypt/boulder/)とう名前でOSSベースで開発されている．

BoulderはGo言語で実装されている．`Dockerfile`も提供されているのでローカルで動かすこともできる．

## ACMEの概要

- [ACME spec](https://github.com/letsencrypt/acme-spec/)
- [Let's Encrypt を支える ACME プロトコル](http://jxck.hatenablog.com/entry/letsencrypt-acme)

ACMEはRESTアプリケーションで構成され以下のようなリソースを持つ．

- directory - 各種リソースのURIを提示する
- new-registration - クライアントの登録を行う
- new-authorization - 認証を行う
- new-certificate - Certificationを発行する

これらを上から順番にこなしていくことで最後のCertificationの発行に到達することになる．

## Boulder

Let's EncryptはACMEベースの認証局（CA）の1つである．このACMEベースのCAは[boulder](https://github.com/letsencrypt/boulder/)という名前でOSSで開発されている．

以下ではこれらをGo言語のコードと共に追っていく．

## directory

directoryは他の各種リソースのURIをクライアントに提示する．クライアントはまずここにリクエストしその後の操作でリクエストするべきendpointを知る．

`ericchiang/letsencrypt`を使うと以下のようになる．

```go
client, err := letsencrypt.NewClient("http://localhost:4000/directory")
if err != nil {
    log.Fatal(err)
}   
```

## new-registration

new-registrationはクライアントの登録を行う．具体的にはRSAもしくはECDSAの公開鍵を登録する．ここで登録した鍵は以後のすべてのリクエストで利用する．ここではRSAを利用する．以下で事前に生成しておく．

```bash
$ ssh-keygen -t rsa -b 4096 -C "tcnksm@mail.com" -f letsencrypt-test -N ''
```

コードは以下のようになる．

```bash
c, err := letsencrypt.NewClient("http://localhost:4000/directory")
if err != nil {
    log.Fatal(err)
}

data, err := ioutil.ReadFile("letsencrypt-test")
if err != nil {
    log.Fatal(err)
}

block, _ := pem.Decode(data)
key, err := x509.ParsePKCS1PrivateKey(block.Bytes)
if err != nil {
    log.Fatal(err)
}

if _, err := c.NewRegistration(key); err != nil {
    log.Fatal(err)
}

log.Println("Registered")
```

事前に生成した鍵ファイルを読み込みデコードして`NewRegistration`を呼ぶ（cf. [Go言語と暗号技術（AESからTLS）](http://deeeet.com/writing/2015/11/10/go-crypto/)に書いた）．これで登録が完了する．

この鍵はnew-registrationだけではなくこの後の各リクエストの署名とその検証にも利用される．具体的にはクライアントはリクエストするJSONをJWSという仕様に基づき署名する．そしてサーバーはリクエストを受けると処理を始める前にそのJWSによる署名の検証を行う．

ちなみに公開鍵はどのようにサーバーに送られるのか? これにはJWKという仕様がありそれに基づき送信される（JWSやJWKといったJWxの技術に関しては[@lestrrat](https://twitter.com/lestrrat)さんのブログ記事["GoでOAuth2/OpenIDとJOSE (JWA/JWT/JWK/JWS/JWE)"](http://hde-advent-2015.hatenadiary.jp/entry/2015/12/02/095643)が詳しい）．


## new-authorization
## new-certification

### 参考

- [ACME spec](https://github.com/letsencrypt/acme-spec/)
- [boulder: An ACME-based CA](https://github.com/letsencrypt/boulder)
- [Boulder flow diagrams](https://github.com/letsencrypt/boulder/blob/master/DESIGN.md)
- [Public Beta: December 3, 2015](https://letsencrypt.org/2015/11/12/public-beta-timing.html)
- [Let's Encrypt is Trusted](https://letsencrypt.org/2015/10/19/lets-encrypt-is-trusted.html)
- [Why ninety-day lifetimes for certificates?](https://letsencrypt.org/2015/11/09/why-90-days.html)
- [Let's Encrypt を支える ACME プロトコル](http://jxck.hatenablog.com/entry/letsencrypt-acme)
- [A Let's Encrypt Client for Go](https://ericchiang.github.io/go/tls/lets/encrypt/letsencrypt/2015/11/13/a-letsencrypt-client-for-go.html) ([ericchiang/letsencrypt](https://github.com/ericchiang/letsencrypt))
- [Let's Encrypt & ACME Overview (hbstyle-2015-1112)](https://speakerdeck.com/rrreeeyyy/lets-encrypt-and-acme-overview-hbstyle-2015-1112)
- [Using Lets Encrypt](https://lolware.net/2015/10/27/letsencrypt_go_live.html) (RubyでACMEを喋りたい場合に参考になる)
- [JSON Web Signature (JWS)](http://openid-foundation-japan.github.io/draft-ietf-jose-json-web-signature-14.ja.html)


