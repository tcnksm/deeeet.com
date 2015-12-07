+++
date = "2015-12-01T23:18:42+09:00"
draft = true
title = "Go言語でLet's EncryptのACMEを理解する"
+++

[Let's Encrypt](https://letsencrypt.org/)

## TL;DR

Let's EncryptのベースのプロトコルであるACMEを理解する．

まずACMEをベースとしたCAである[boulder](https://github.com/letsencrypt/boulder/)をローカルで動かす．次にACMEのGo言語クライアントライブラリである[ericchiang/letsencrypt](https://github.com/ericchiang/letsencrypt)（非公式）を使い実際にboulderと喋りながら証明書発行を行い，コードとともにACMEが具体的にどのようなことしているのかを追う．

## はじめに

証明書というのは面倒なもの，少なくともカジュアルなものではない，というイメージが強い．それは有料であることや認証局（CA）ごとに申請方法が異なるために自動化がやりにくいなどといったことに起因している（と思う）．そのようなイメージに反して近年登場する最新の技術/プロトコルはTLSを前提にしているものが少なくない（e.g., HTTP2）．

このような背景の中で登場したのがLet's Encryptと呼ばれるCAである．Let's Encryptは上で挙げたような問題（煩雑さ）を解決しようとしており，無料・自動・オープンを掲げている（cf. ["Let's Encrypt を支える ACME プロトコル"](http://jxck.hatenablog.com/entry/letsencrypt-acme)）．最近（2015年12月3日）Public Betaが[アナウンスされ](https://letsencrypt.org/2015/12/03/entering-public-beta.html)すでに1日に70kの証明証が発行され始めており（cf. [Let's Encrypt Stats](https://letsencrypt.org/stats/)）大きな期待が寄せられている．特に自分は仕事で多くのドメインを扱うのでLet's Encryptは使ってくぞ！という意識がある．

Let's EncryptはDV証明書を発行することができるCAである．DV証明書とはドメインの所有を確認して発行されるタイプの証明書である．Let's Encryptの大きな特徴の1つに自動化が挙げられる．申請からドメインの所有の確認，証明書発行までは全てコマンドラインで完結させることができる．そしてこのフローはLet's Encrypt以外のCAでも利用できるように標準化が[進められている](https://github.com/ietf-wg-acme/acme/)．これはAutomated Certificate Management Environment（ACME）プロトコルと呼ばれる（ちなみにLet's encryptの証明証の有効期限は90日である．これはセキュリティ強化の面もあるが自動化の促進という面もある（cf. [Why ninety-day lifetimes for certificates?](https://letsencrypt.org/2015/11/09/why-90-days.html)））．

Let's Encryptは専用のACMEクライアントを提供している（[letsencrypt](https://github.com/letsencrypt/letsencrypt)）．基本はこれを使えば証明書の発行や，Apacheやnginxの設定ファイルの書き換え(!)などができる（やりすぎ感が気にくわないと感じるひとが多いようでsimple alternativeがいくつか登場している...）．

それだけではなくACMEベースのCA（つまりLet's encrypt）は[Boulder](https://github.com/letsencrypt/boulder/)とう名前でOSSベースで開発されている（Go言語で実装されている）．つまりBoulderを使えば誰でもACMEをサポートしたCAになることができる．

本記事ではおそらく将来的には意識しないでよくなる（であろう）ACMEプロトコルがどのようなものかを理解する．boulderをローカルで動かし（`Dockerfile`が提供されている），非公式であるがGo言語のACMEクライアント[ericchiang/letsencrypt](https://github.com/ericchiang/letsencrypt)を使って実際にACMEを喋ってみる．

なおACMEはまだ仕様策定中なので以下の説明は変更される可能性がある．

## boulderを動かす

まず準備としてboulderを動かす．今回は例として`example.org`の証明証を発行する．ローカルでこれを実行するためには以下の準備が必要になる．

- `cmd/policy-loader/base-rules.json`のブラックリストから`example.org`を外す
- `/etc/hosts`を編集して`example.org`を`127.0.0.1`に向ける

完了したらboulderコンテナを起動する．

```
$ cd $GOPATH/src/github.com/letsencrypt/boulder/
$ ./test/run-docker.sh
```

## ACMEの概要

[ACME spec draft](https://github.com/ietf-wg-acme/acme/)

ACMEとは「クライアントのドメインの所有を確認して証明書を発行する」ためのプロトコルであった．これをさらに細かくブレイクダウンすると以下の操作から構成されることになる．

- 各操作を行うためのURIを知る（directory）
- クライアントの登録を行う（new-registration）
- 認証（ドメイン所有の確認）を行う（new-authorization）
- 証明書（Certification）を発行する（new-certificate）

ACMEはこれらのリソースを持ったRESTアプリケーションであるとみなすこともできる．各リソースはその上のリソースに依存しており，上から順番にリクエストをこなしていくことで最後の証明書の発行に到達することになる．

以下ではこれらのリソースをさらに細かく見ていく．

## directory

directoryは他の各種リソースのURIをクライアントに提示する．クライアントはまずここにリクエストしその後の操作でリクエストするべきendpointを知る．

`ericchiang/letsencrypt`を使うと以下のようになる．

```go
client, err := letsencrypt.NewClient("http://localhost:4000/directory")
if err != nil {
    log.Fatal(err)
}   
```

`NewClient`はdirectoryにリクエストを投げ以下の操作で必要なendopointを保持した`client`を作成する．

## new-registration

new-registrationはクライアントの登録を行う．具体的にはRSAもしくはECDSAの公開鍵を登録する．ここで登録した鍵は以後のすべてのリクエストで利用する．ここではRSAを利用する．以下で事前に生成しておく．

```bash
$ ssh-keygen -t rsa -b 4096 -C "tcnksm@mail.com" -f letsencrypt-test -N ''
```

コードは以下のようになる．

```bash
client, err := letsencrypt.NewClient("http://localhost:4000/directory")
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

if _, err := client.NewRegistration(key); err != nil {
    log.Fatal(err)
}

log.Println("Registered")
```

事前に生成した鍵ファイルを読み込みデコードして`NewRegistration`を呼ぶ（cf. [Go言語と暗号技術（AESからTLS）](http://deeeet.com/writing/2015/11/10/go-crypto/)に書いた）．これで登録が完了する．

この鍵はnew-registrationだけではなくこの後の各リクエストの署名とその検証にも利用される．具体的にはクライアントはリクエストするJSONをJWSという仕様に基づき署名する．そしてサーバーはリクエストを受けると処理を始める前にそのJWSによる署名の検証を行う．

ちなみに公開鍵はどのようにサーバーに送られるのか? これにはJWKという仕様がありそれに基づき送信される（JWSやJWKといったJWxの技術に関しては[@lestrrat](https://twitter.com/lestrrat)さんのブログ記事["GoでOAuth2/OpenIDとJOSE (JWA/JWT/JWK/JWS/JWE)"](http://hde-advent-2015.hatenadiary.jp/entry/2015/12/02/095643)が詳しい）．


## new-authorization

new-authorizationではドメインの所有の確認を行い認証を行う．具体的にそのドメインの所有をどのように確認するのか? それにはドメインの所有者にしかできない特定の操作を行わせることで確認を行う．ACMEではこの操作を**Challenge**と呼ぶ．

現在（2015年12月）Challengeには`http-01`や`tls-sni-01`といったものがある．例えば`http-01`はクライアントのサーバー上の特定のパスに指定された内容のテキストファイルを配置させ，そこにアクセスし予期するファイルが配置されているかで確認を行う．

認証は以下のような流れで行われる．

1. クライアントはnew-authorizationリソースにPOSTリクエストを送る（POSTリクエストのBodyにはJWSが含まれていなけばならない）
1. サーバーは利用可能なChallengeとそのうち達成するべき組み合わせ（複数のChallengeの達成を要求することもできる）を返答する
1. クライアントはChallengeに応える
1. サーバーはChallengeの達成を確認する

コードで書くと以下のようになる．まずChallengeの取得を行う（`client`の初期化と`key`の読み込みは完了しているとする）．

```go
auth, _, err := client.NewAuthorization(key, "dns", "example.org")
if err != nil {
    log.Fatal(err)
}

log.Println("[INFO] Challenges:")
for _, challenge := range auth.Challenges {
    log.Println("  ", challenge.Type, challenge.URI)
}

var combs string
for _, comb := range auth.Combs {
    combs += fmt.Sprintf("%v ", comb)
}
log.Println("[INFO] Combinations:", combs)
```

これを実行すると以下のような結果が得られる．

```bash
2015/12/05 17:16:44 [INFO] Challenges:
  dns-01 http://127.0.0.1:4000/acme/challenge/FQ01uZjCoY13Z5Jak7..
  tls-sni-01 http://127.0.0.1:4000/acme/challenge/FQ01uZjCoY13Z5..
  dvsni http://127.0.0.1:4000/acme/challenge/FQ01uZjCoY13Z5Jak7H..
  http-01 http://127.0.0.1:4000/acme/challenge/FQ01uZjCoY13Z5Jak..
  simpleHttp http://127.0.0.1:4000/acme/challenge/FQ01uZjCoY13Z5..
  
2015/12/05 17:16:44 [INFO] Combinations: [0] [1] [2] [3] [4]
```

現在の`boulder`のdevモードは4つのChallengeを返す（`simpleHttp`と`dvsni`はdeprecatedなので無視してもよい [#231](https://github.com/letsencrypt/acme-spec/issues/231)）．`challenge.URI`は具体的なChallengeに必要となる情報（例えば`http-01`の場合はサーバーにアクセスさせるためのパスとそこに配置するリソース）を取得するためのendpointである．そして組み合わせ（`Combs`）は指定されておらずどれか1つでも達成すればよい．

次に実際にChallengeを達成する．ここでは`http-01`を達成する．

```go
auth, _, err := client.NewAuthorization(key, "dns", "example.org")
if err != nil {
    log.Fatal(err)
}

var httpChallengeURI string
for _, challenge := range auth.Challenges {
    if challenge.Type == "http-01" {
        log.Println("[INFO]", challenge.Type, challenge.URI)
        httpChallengeURI = challenge.URI
    }
}

if httpChallengeURI == "" {
    log.Fatal("httpChallengeURI should not be empty")
}

challenge, err := client.Challenge(httpChallengeURI)
if err != nil {
    log.Fatal(err)
}

b, err := json.MarshalIndent(&challenge, "", "  ")
if err != nil {
    log.Fatal(err)
}
log.Println("[INFO]", string(b))

path, resource, err := challenge.HTTP(key)
if err != nil {
    log.Fatal(err)
}

go func() {
    http.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
        io.WriteString(w, resource)
    })

    // The test Let's Encrypt server uses port 5002 instead of 80.
    if err := http.ListenAndServe(":5002", nil); err != nil {
        log.Fatal(err)
    }
}()

if err := client.ChallengeReady(key, challenge); err != nil {
    log.Fatal(err)
}

log.Println("[INFO] Complete challenge!")
```

以下のようなことをしている．

1. サーバーが受け付け可能なChallengeをリクエストする（`NewAuthorization`）
1. `http-01`を選択し具体的なアクションのために必要となる情報をリクエストする（`Challenge`）
1. 上のレスポンスから`http-01`に必要なサーバーからリクエストされる`path`とその`resource`を取得する（`HTTP`）
1. `path`にて`resource`をserveするようにサーバーを起動する（goroutine）
1. Challgenが準備できたことをサーバーに伝えValidateしてもらう（`ChallengeReady`）

これで認証は完了する．あとは`csr`を送れば証明書を取得することができる．

## new-certification

new-certificationは新しい証明書の発行を行う．

まず`.csr`ファイルを作成する．`.csr`の作成は`openssl`コマンドなどでも可能だがここでは全てをGo言語で行う．Go言語で証明書を操作するには`x509`パッケージを使えばよい（詳しくは[Go言語と暗号技術（AESからTLS）](http://deeeet.com/writing/2015/11/10/go-crypto/)）．コードは以下．RSAを使う．

```go
certKey, err := rsa.GenerateKey(rand.Reader, 2048)
if err != nil {
    log.Fatal(err)
}

template := x509.CertificateRequest{
    SignatureAlgorithm: x509.SHA256WithRSA,
    PublicKeyAlgorithm: x509.RSA,
    PublicKey:          &certKey.PublicKey,
    Subject:            pkix.Name{CommonName: "example.org"},
    DNSNames:           []string{"example.org"},
}

if err != nil {
    log.Fatal(err)
}

csrOut, err := os.Create("example.org.csr")
if err != nil {
    log.Fatal(err)
}
defer csrOut.Close()

if err := pem.Encode(csrOut, &pem.Block{
    Type:  "CERTIFICATE REQUEST",
    Bytes: csrDerByte,
}); err != nil {
    log.Fatal(err)
}

keyOut, err := os.Create("example.org.key")
if err != nil {
    log.Fatal(err)
}

if err := pem.Encode(keyOut, &pem.Block{
    Type:  "RSA PRIVATE KEY",
    Bytes: x509.MarshalPKCS1PrivateKey(certKey),
}); err != nil {
    log.Fatal(err)
}
```

これで`example.org.csr`と`example.org.key`が生成できる．

次に証明書の発行を行う．コードは以下（`client`の初期化と`key`の読み込みは完了しているとする）．

```go
csrData, err := ioutil.ReadFile("example.org.csr")
if err != nil {
    log.Fatal(err)
}

csrBlock, _ := pem.Decode(csrData)
csr, err := x509.ParseCertificateRequest(csrBlock.Bytes)
if err != nil {
    log.Fatal(err)
}

cert, err := client.NewCertificate(key, csr)
if err != nil {
    log.Fatal(err)
}

certOut, err := os.Create("example.org.crt")
if err != nil {
    log.Fatal(err)
}

if err := pem.Encode(certOut, &pem.Block{
    Type:  "CERTIFICATE",
    Bytes: cert.Raw,
}); err != nil {
    log.Fatal(err)
}

log.Println("[INFO] Successfully issued")
```

上で生成した`.csr`を読み込み`NewCertificate`を呼ぶだけ．簡単．

## 証明書の検証

最後に証明書の検証を行う．Go言語で証明書の検証は以下のように書ける（`boulder`のDevモードの場合は`test`ディレクトリ以下に`test-ca.pem`があるのでそれを使う）．

```go
caData, err := ioutil.ReadFile("./test-ca.pem")
roots := x509.NewCertPool()
if ok := roots.AppendCertsFromPEM(caData); !ok {
    log.Fatal("Failed to parse ca pem")
}

certData, err := ioutil.ReadFile("./example.org.crt")
certBlock, _ := pem.Decode(certData)
cert, err := x509.ParseCertificate(certBlock.Bytes)
if err != nil {
    log.Fatal(err)
}

opts := x509.VerifyOptions{
    DNSName: "example.org",
    Roots:   roots,
}

if _, err := cert.Verify(opts); err != nil {
    log.Fatal(err)
}

log.Println("[INFO] Verified !")
```

## まとめ

本記事ではACMEをベースとしたCAであるboulderをローカルで動かし，ACMEのGo言語クライアントライブラリを使いながらACMEの詳細を追ってみた．Webの基本の技術を組み合わせているだけなので特に複雑ではない．200行のpythonで書かれたACMEツールなどもある（cf. [diafygi/acme-tiny](https://github.com/diafygi/acme-tiny)）のでいろいろ探ってみたら面白いと思う．

どんどんTLSにしていくぞ！

### 参考

- [ACME spec draft](https://github.com/ietf-wg-acme/acme/)
- [Let's Encrypt Stats](https://letsencrypt.org/stats/)
- [boulder: An ACME-based CA](https://github.com/letsencrypt/boulder)
- [Boulder flow diagrams](https://github.com/letsencrypt/boulder/blob/master/DESIGN.md)
- [Public Beta: December 3, 2015](https://letsencrypt.org/2015/11/12/public-beta-timing.html)
- [Let's Encrypt is Trusted](https://letsencrypt.org/2015/10/19/lets-encrypt-is-trusted.html)
- [Why ninety-day lifetimes for certificates?](https://letsencrypt.org/2015/11/09/why-90-days.html)
- [Let's Encrypt を支える ACME プロトコル](http://jxck.hatenablog.com/entry/letsencrypt-acme)
- [hlandau/acme](https://github.com/hlandau/acme), [xenolf/lego](https://github.com/xenolf/lego), [diafygi/acme-tiny](https://github.com/diafygi/acme-tiny)
- [A Let's Encrypt Client for Go](https://ericchiang.github.io/go/tls/lets/encrypt/letsencrypt/2015/11/13/a-letsencrypt-client-for-go.html) ([ericchiang/letsencrypt](https://github.com/ericchiang/letsencrypt))
- [Let's Encrypt & ACME Overview (hbstyle-2015-1112)](https://speakerdeck.com/rrreeeyyy/lets-encrypt-and-acme-overview-hbstyle-2015-1112)
- [Using Lets Encrypt](https://lolware.net/2015/10/27/letsencrypt_go_live.html) (RubyでACMEを喋りたい場合に参考になる)
- [JSON Web Signature (JWS)](http://openid-foundation-japan.github.io/draft-ietf-jose-json-web-signature-14.ja.html)


