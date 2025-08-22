+++
date = "2015-11-10T15:53:31+09:00"
title = "Go言語と暗号技術（AESからTLS）"
+++

最近[マスタリングTCP/IP SSL/TLS編](http://www.amazon.co.jp/%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%AA%E3%83%B3%E3%82%B0TCP-SSL-TLS%E7%B7%A8-Eric-Rescorla/dp/4274065421)や[暗号技術入門](http://www.amazon.co.jp/3-ebook/dp/B015643CPE/)を読んでいた．理解を深めるためにGo言語で標準の`crypto`パッケージを触り/実装を読みながら読んだ．

`crypto`パッケージは他の標準パッケージと同様に素晴らしい．Go言語にはどのような暗号化手法が実装されているのか実例を含めてざっとまとめる．なお本文に書ききれなかったものを含め全ての実装例は[tcnksm/go-crypto](https://github.com/tcnksm/go-crypto)にある．

## 共通鍵暗号

まずは共通鍵暗号をみる．共通鍵暗号は暗号化と復号化に同じ鍵を用いる暗号化方式である．共通鍵暗号はブロック暗号とストリーム暗号の2種類に分けることができる．ブロック暗号は特定の長さ単位で暗号化を行う方式であり，ストリーム暗号はデータの流れを順次処理していく方式である．

Go言語にはブロック暗号としてDES（Data Encryption Standard），DESを繰り返すtriple-DES，そしてAES（Advanced Encryption Standard ）が実装されている．ストリーム暗号としてはRC4が実装されている．

AESはDESに代わる新しい標準のアルゴリズムであり公募により選出された．互換性などを考慮しない限りこれを使うのが良い．実際に`plainText`をAESで暗号化/復号化してみる．

```golang
plainText := []byte("This is 16 bytes")

key := []byte("passw0rdpassw0rdpassw0rdpassw0rd")

block, err := aes.NewCipher(key)
if err != nil {
    fmt.Printf("err: %s\n", err)
    return
}

// Encrypt
cipherText := make([]byte, len(plainText))
block.Encrypt(cipherText, plainText)
fmt.Printf("Cipher text: %x\n", cipherText)

// Decrypt
decryptedText := make([]byte, len(cipherText))
block.Decrypt(decryptedText, cipherText)
fmt.Printf("Decrypted text: %s\n", string(decryptedText))
```

AESの鍵長さは16byte，24byte，32byteのいずれかである必要がある（それぞれAES-128，AES-192，AES-256と呼ばれる）．`NewCipher`は`cipher.Block`インタフェースを返す．このインタフェースには`Encrypt()`と`Decrypt()`が実装されている．全てのブロック暗号にはこのインタフェースが実装されている（他の例は[こちら](https://github.com/tcnksm/go-crypto/tree/master/symmetric-key)）．

AESは16byteというブロック単位で暗号化/復号化を行うアルゴリズムである．このままでは例にあるように16byteの固定視長の平文しか暗号化を行えない．これでは使えない．


## ブロック暗号のモード

任意の長さの平文を暗号化するためにはブロック暗号を繰り返し実行する必要がある．ブロック暗号にはそれを繰り返し実行するためのモードがある．

まず単純に考えると平文を分割してそれぞれにブロック暗号を適用する方法が考えられる．これはECB（Electronic CodeBook mode）モードと呼ばれる．しかし同じ平文ブロックが存在する場合は同じ暗号文ブロックが存在してしまう，かつ攻撃者が暗号文ブロックを入れ替えたら平文の順番も入れ替わってしまうというなどの問題があり実用的ではない．これらの欠点を回避するために各種モードが存在する．

Go言語では，ブロック暗号の各種モードを[`cipher`パッケージ](https://golang.org/pkg/crypto/cipher/)に実装している．実装されているモードは以下，

- CBC（Cipher Block Chainning）モード - 1つ前の暗号ブロックと平文ブロックの`XOR`をとってから暗号化を行う．1番最初の平文ブロックにはIV（Initialization Vector）と`XOR`をとる．暗号ブロックの一部が欠損すると以後の平文全てに影響が出る．SSL/TLSに利用されている（3DES_EDE_CBC，AES_256_CBC）．
- CFB（Cipher FeedBack）モード - 1つ前の暗号ブロックを暗号化したもの（Key Stream）と平文ブロックの`XOR`をとる．再生攻撃が可能．
- OFB（Output FeedBack）モード - 1つ前の暗号化の出力（Key Stream）を次の暗号化の入力とする．暗号化の出力（Key Stream）と平文で`XOR`をとる（Key Streamを事前につくっておくことができる）．もし暗号結果が同じものになったらそれ以後Key Streamは全て同じ値になってしまう．暗号文を1ビット反転させると平文も1ビット反転する
- CTR（CounTeR）モード - 1つずつ増加していくカウンタを暗号化してKey Streamを作り出す．カウンタを暗号化してKey Streamとする．カウンタは暗号化のたびに異なる値（ノンス）をもとにしてつくる．暗号文を1ビット反転させると平文も1ビット反転する．暗号結果が同じになってもそれ以後のKey Streamが同じ値になることがない．
- GCM（Galois/Counter）モード - CTRが暗号文を作り出すと同時に「この暗号文は正しい暗号化によって作られたものである」とう認証子を作り出す．暗号文の偽装を見抜くことができる．TLS1.2で使われる．IVが必要ない．AEAD（Authenticated Encryption with Associated Data）の一種である．

なおCFB，OFBそしてCTRはブロック暗号を使ってストリーム暗号を作り出しているとみなすことができる．

実際にAES+CTRモードで`plainText`を暗号/復号化してみる．今回は平文が16byteである必要はなく，任意の長さの平文を入力として使うことができる．

```golang
plainText := []byte("Bob loves Alice. But Alice hate Bob...")

key := []byte("passw0rdpassw0rdpassw0rdpassw0rd")

// Create new AES cipher block
block, err := aes.NewCipher(key)
if err != nil {
    fmt.Printf("err: %s\n", err)
}

// Create IV
cipherText := make([]byte, aes.BlockSize+len(plainText))
iv := cipherText[:aes.BlockSize]
if _, err := io.ReadFull(rand.Reader, iv); err != nil {
    fmt.Printf("err: %s\n", err)
}

// Encrypt
encryptStream := cipher.NewCTR(block, iv)
encryptStream.XORKeyStream(cipherText[aes.BlockSize:], plainText)
fmt.Printf("Cipher text: %x \n", cipherText)

// Decrpt
decryptedText := make([]byte, len(cipherText[aes.BlockSize:]))
decryptStream := cipher.NewCTR(block, cipherText[:aes.BlockSize])
decryptStream.XORKeyStream(decryptedText, cipherText[aes.BlockSize:])
fmt.Printf("Decrypted text: %s\n", string(decryptedText))
```

`NewCipher`は`cipher.Block`をつくり，それを`NewCTR`の入力とする．IV（ストリームの初期値）はユニークでる必要があるが安全である必要はないので暗号文の先頭に差し込んでいる．`NewCTR`は`cipher.Stream`インタフェースを返す．あとはそれに平文/暗号文を入力として与えれば暗号化/復号化が行われる．

## 公開鍵暗号

共通鍵暗号は強力だが鍵配送問題（いかに安全に共通鍵を交換するか）がある．この問題を解決するのが公開鍵暗号である．公開鍵暗号は，公開鍵で暗号化を行い，秘密鍵で復号化を行う暗号化方式である．Go言語ではRSAと楕円曲線（Elliptic Curve）暗号が実装されている．

RSAは一番よく知られた公開鍵暗号アルゴリズムである．RSAの暗号化と復号化は，付加するパディングデータの作成や検証の手順などを組み入れた形で行われるため，それら全てを含めて仕様が決まる．Go言語では標準で以下が実装されている．

- RSA-PKCS1v15 - パディングとしてランダムの値を先頭に追加する．
- RSA-OAEP (Optimal Asymmetric Encryption Padding) - 任意のラベルのハッシュ値と決まった個数の0から作成した認証情報を平文の頭に追加してRSAで暗号化する．複合化ではRSAで復号した後，先頭に正しい「認証情報」が現れなければ「平文」を知ってる人が作成した暗号文ではない，適当に作られた暗号文であると判断しエラーを返すことができる．つまり選択暗号文攻撃に対して安全になる．

実際にRSA-PKCS1v15で`plainText`を暗号化/復号化を行う．

```golang
plainText := []byte("Bob loves Alice.")

// size of key (bits)
size := 2048

// Generate private and public key pair
privateKey, err := rsa.GenerateKey(rand.Reader, size)
if err != nil {
    fmt.Printf("err: %s", err)
    return
}

// Get public key from private key and encrypt
publicKey := &privateKey.PublicKey

cipherText, err := rsa.EncryptPKCS1v15(rand.Reader, publicKey, plainText)
if err != nil {
    fmt.Printf("Err: %s\n", err)
    return
}
fmt.Printf("Cipher text: %x\n", cipherText)

// Decrypt with private key
decryptedText, err := rsa.DecryptPKCS1v15(rand.Reader, privateKey, cipherText)
if err != nil {
    fmt.Printf("Err: %s\n", err)
    return
}
    
fmt.Printf("Decrypted text: %s\n", decryptedText)
```

乱数と鍵の長さを入力として`GenerateKey`で公開鍵と秘密鍵のペアを作る．`PrivateKey`の中身を見ると鍵を構成する素数をみることができる．あとは`EncryptPKCS1v15`と`DecryptPKCS1v15`で暗号化/復号化を行うことができる．

鍵の長さは1024は新規用途には合わず，2048は2030年まで新規用途に合わず，4096は2031年以降も使うことができると言われている．

## ハッシュ

共通鍵暗号や公開鍵暗号を使えばメッセージを暗号化してやりとりすることができる．しかしそれだけではメッセージが途中で改竄されたかを判別することができない．これを解決するために用いられるのがハッシュ関数である．

Go言語は標準でMD5，SHA-1，SHA-2（SHA-224，SHA-256，SHA-384，SHA-512，SHA-512/224，SHA-512/256）が実装されている．また[golang.org/x/crypto](https://godoc.org/golang.org/x/crypto)にはAES同様に公募によって選定されたSHA-3（Keccak）が実装されている．

実際にSHA-512を使い`msg`からハッシュ値を計算する．

```golang
msg := []byte("Bob is dead")
checksum512 := sha512.Sum512(msg)
```

実際にSHA-3を使い`msg`からハッシュ値を計算する．

```golang
msg := []byte("Alice is dead")
// A MAC with 64 bytes of output has 512-bit security strength
h := make([]byte, 64)

d := sha3.NewShake256()
d.Write(msg)

d.Read(h)
```

SHA-1とSHA-2には入力制限があるが，SHA-3にはない．また`ShakeHash`を使えば任意長のビット列を生成することができる．

新規ではSHA-1を使うべきではなく，SHA-2もしくはSHA-3を使うのが良いとされている．

ハッシュ関数を使えば改竄を検出することができるが，そのメッセージが期待する送信者によるものであるか，なりすましではないかを検出することはできない．

## メッセージ認証コード（MAC）

メッセージの改竄とそのメッセージが正しい送信者からのものであるかを検出するのにメッセージ認証コード（MAC）が利用される．MACは任意のメッセージと送信者と受信者が共有する鍵を入力として固定ビット長の出力をする関数である．

Go言語では標準でHMACが実装されている．

実際にHMACを使って`msg`と`key`からMAC値の計算と検証をやってみる．HMACは任意の`hash.Hash`関数を使うことができる．ここではSHA-512を用いる．

```golang
msg := []byte("Bob loves Alice.")
key := []byte("passw0rd")

h1 := hmac.New(sha512.New, key)
h1.Write(msg)
mac1 := h1.Sum(nil)
fmt.Printf("MAC1: %x\n", mac1)

h2 := hmac.New(sha512.New, key)
h2.Write(msg)
mac2 := h2.Sum(nil)
fmt.Printf("MAC2: %x\n", mac2)

fmt.Printf("Valid? %v\n", hmac.Equal(mac1, mac2))
```

MACでは「否認」を防止することができない．送信者と受信者が鍵を共有するため送信者だけではなく受信者もMAC値を生成できてしまう．つまり第三者にこれは送信者が生成したMACであることを証明できない（受信者が生成することもできる）．

## デジタル署名

「否認」を防止しメッセージの検証を行う方法にデジタル署名がある．デジタル署名は公開鍵暗号の応用であり，メッセージ送信者が秘密鍵で署名を行い，受信者が公開鍵で検証を行う．つまり第三者でもそのメッセージの送信を検証することができる．

Go言語では標準でDSA（Digital Signature Algorithm），RSA，楕円曲線暗号によるデジタル署名が実装されている．

実際に楕円曲線暗号を使ってデジタル署名とその検証をしてみる．

```golang
priv, err := ecdsa.GenerateKey(elliptic.P521(), rand.Reader)
if err != nil {
    fmt.Printf("Err: %s\n", err)
    return
}

hashed := []byte("This is message.")
r, s, err := ecdsa.Sign(rand.Reader, priv, hashed)
if err != nil {
    fmt.Printf("Err: %s\n", err)
    return
}

if ecdsa.Verify(&priv.PublicKey, hashed, r, s) {
    fmt.Printf("Verified!\n")
}
```

楕円曲線暗号は，楕円曲線上の演算に基づく暗号化手法である．`crypto/elliptic`に曲線とその演算が定義されている．そして署名には`crypto/ecdsa`パッケージを用いる．まず`GenerateKey`で公開鍵と秘密鍵を生成する．その際に利用する楕円曲線を指定する．利用できる曲線はP-224，P-256，P-384そしてP-521である．生成した秘密鍵と任意の長さのハッシュ値を入力として`Sign`し署名を行う．署名は`big.Int`のペアとして返される．これらの値と公開鍵を入力として署名の検証を行う．

## 証明書（x509）

公開鍵暗号は強力だが，このままでは「その公開鍵が期待する相手のものであるか」が不確かであり，man-in-the-middle攻撃を防ぐことができない．この問題を解決する方法が証明書と認証局（CA）である．サーバーは信頼できる認証局から公開鍵にデジタル署名を受け証明書を作成する．ユーザは認証局局の公開鍵で署名を検証しそのサーバーのものであるかを確認する．

証明書にはX.509という規格で標準化されている．Go言語では標準で`crypto/x509`というパッケージにこのX.509の規格に準じた証明書や鍵のパースや検証が実装されている．

X.509の証明書はASN.1（Abstract Syntax Notation One）で表記される．ASN.1 は情報の抽象構文を定義するが情報のEncodeのフォーマットは限定しない．X.509ではDER（Distinguished Encoding Rules）でEncodeが行われる（Encodeがユニークに定まる）．Goでは`encoding/ans1`パッケージにDERのEncoderが準備されている．またASN.1のよりlow levelの構造のパーサーは`crypto/x509/pkix`に定義されている（例えば国名や組織名など）．証明書や鍵はPEM（Privacy Enhanced Mail）形式でEncodeされてファイルに保存されることが多いが，これらのエンコードは`encoding/pem`に定義されている．

または`crypto/x509`にはRSA-PKCS1v15と楕円曲線暗号による鍵のASN.1 DER形式のMarshal/Unmarshalも実装されている．

そんなことは滅多にないと思うが，実際にGo言語でX.509の自己署名証明書を作ってみる．公開鍵暗号としては楕円曲線暗号を使い，PEM形式でファイルに保存する（`ca.pem`）．

```golang
// Generate pub & priv key pair by Elliptic Curve Digital Signature
priv, err := ecdsa.GenerateKey(elliptic.P521(), rand.Reader)
if err != nil {
    fmt.Printf("Err: %s\n", err)
    return
}

// Create CA certificate template
ca := x509.Certificate{
    IsCA:         true,
    SerialNumber: big.NewInt(1234),
    Subject: pkix.Name{
        Country:      []string{"Japan"},
        Organization: []string{"TCNKSM ECDSA CA Inc."},
    },

    NotBefore: time.Now(),
    NotAfter:  time.Now().Add(24 * time.Hour),

    KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment | x509.KeyUsageCertSign,
    ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
    BasicConstraintsValid: true,
}

// Create Certificate
derBytes, err := x509.CreateCertificate(rand.Reader, &ca, &ca, &priv.PublicKey, priv)
if err != nil {
    fmt.Printf("Err: %s\n", err)
    return
}

certOut, err := os.Create("ca.pem")
if err != nil {
    fmt.Printf("Err: %s\n", err)
    return
}
defer certOut.Close()

if err := pem.Encode(certOut, &pem.Block{
    Type:  "CERTIFICATE",
    Bytes: derBytes,
}); err != nil {
    fmt.Printf("Err: %s\n", err)
    return
}
```

鍵の生成はデジタル署名と同じ．`x509.Certificate`に証明書に必要な情報を書く．逆に読み込むときはこのstructにパースされる．あとはそれと署名したい公開鍵と署名するための秘密鍵（今回は自己署名なので生成されたペア）を入力として`x509.CreateCertificate`を呼ぶ．

他にも`crypto/x509`パッケージで証明書の検証も行える．それらの実装例は[ここ](https://github.com/tcnksm/go-crypto/blob/master/certificate/x509/ecdsa/verify.go)に書いた．また`crypto/tls`パッケージのテストを覗くと[generate_cert.go](https://golang.org/src/crypto/tls/generate_cert.go)というコードがあり証明書の生成例を見ることができる．

## TLS

TLSの実装も`crypto`パッケージ以下にある．TLSは様々な暗号技術を寄せ集めたハイブリットな暗号技術であると言える．上で見てきた様々な暗号化手法が取り入れられている．通信の暗号化には共通鍵暗号を用い，共通鍵暗号の配送には公開鍵暗号を用いる．また公開鍵を認証するためにデジタル署名を用い，そしてデータの認証にHMACを持ちるなどなど．

例えばpre-master secret（これをもとにサーバーとクライアントでmaster secretをつくり共通鍵暗号として通信を行う）の暗号化/復号化には公開鍵暗号が用いられる．RSAのkey-agreementの実装を見ると上で見たような暗号化が見られる．

```golang
encrypted, err := rsa.EncryptPKCS1v15(config.rand(), cert.PublicKey.(*rsa.PublicKey), preMasterSecret)
```

```golang
preMasterSecret, err := priv.Decrypt(config.rand(), ciphertext, &rsa.PKCS1v15DecryptOptions{SessionKeyLen: 48})
```

TLSを使ったサーバとクライアントの実装例は[ここ](https://github.com/tcnksm/go-crypto/tree/master/tls)にある．またhttpsのサーバとクライアントの実装例は[ここ](https://github.com/tcnksm/go-crypto/tree/master/https)にある．

## まとめ

Go言語の暗号化技術をざっと追ってみた．個々の暗号化技術を押さえておくとTLSのような複雑な実装も自分の手に届くようになる．自分なりの最終的目標は`crypto/tls`の実装をある程度読めることとしていたが，ある程度読むことができるようになった．「暗号技術入門」を読みつつ実際のコードを読むのはとても面白いのでおすすめです．
