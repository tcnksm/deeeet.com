+++
date = "2015-11-16T21:30:18+09:00"
draft = true
title = "Go言語とHTTP2"
+++

[http2 in Go 1.6; dotGo 2015 - Google スライド](https://golang.org/s/http2iscoming)

2015年の5月に[RFC](http://www.rfc-editor.org/rfc/rfc7540.txt)が出たばかりのHTTP2が2016年の2月に[リリース予定](https://github.com/golang/go/milestones)のGo1.6で早くも利用可能になることになっている．HTTP2の勉強も兼ねてGo言語におけるHTTP2実装を追ってみる．

以下ではまず実際にHTTPサーバを動かしChromeで接続してみる．次に現状コードがどのように管理されているかを追う．最後に実際にコードを動かしながらHTTP2の各種機能を追う．なお参照するコードはすべて以下のバージョンを利用している（まだWIPなのでコードなどは今後変わる可能性があるので注意）．

```bash
$ go version
go version devel +9b299c1  darwin/amd64
```

## HTTP2とは?

HTTP/2に関してはスライドやブログ記事，Podcastなど非常に豊富な情報がインターネット上に存在する．そもそもHTTP2とは何か?なぜ必要なのか?などを理解したい場合は[参考](#cf)に挙げた記事などを参照するのがよい．


## 実際に使ってみる

最小限のコードでHTTP2サーバーの起動と確認を行う．ブラウザにはChromeを利用する．まず最新のGoをソースからビルドする（ビルドにはGo1.5.1を利用する）．以下では2015年11月16日時点の最新を利用した．

```bash
$ git clone --depth=1 https://go.googlesource.com/go ~/.go/latest
$ export GOROOT_BOOTSTRAP=~/.go/1.5.1
$ cd ~/.go/latest/src && ./make.bash
```

現時点でGoにおけるHTTP2はOver TLSが前提になっている．そのためサーバー証明書が必要になる（なければ事前に`openssl`コマンドや`crypto/x509`パッケージなどを使って自己署名証明書をつくる）．

コードは以下．

```golang
func main() {
    certFile, _ := filepath.Abs("server.crt")
    keyFile, _ := filepath.Abs("server.key")
    
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
       fmt.Fprintf(w, "Protocol: %s\n", r.Proto)
    })

    err := http.ListenAndServeTLS(":3000", certFile, keyFile, nil)
    if err != nil {
        log.Printf("[ERROR] %s", err)
    }
}
```

証明書と鍵を読み込んで`ListenAndServeTLS`を呼ぶだけ．HTTP2のために特別なことをする必要はない．クライアントがHTTP2に対応していれば勝手にHTTP2にネゴシエートされる．起動して接続すると以下のように「Protocol: HTTP/2.0」が確認できる（Chrome拡張の[HTTP/2 and SPDY indicator](https://chrome.google.com/webstore/detail/http2-and-spdy-indicator/mpbpobfflnpcgagjijhmgnchggcjblin?hl=ja)が反応しているのも確認できる）．

<img src="/images/http2.png" class="image">

## コードの行方

HTTP2のコードの行方はどうなっているのか? もともとは[bradfitz](https://github.com/bradfitz)氏により[bradfitz/http2](https://github.com/bradfitz/http2)で実装が進められていた．そして[golang.org/x/net/http2](https://godoc.org/golang.org/x/net/http2)に移動した．ちなみにGo1.5以前でもこちらのパッケージを使えばHTTP2を[使うことはできる](http://www.integralist.co.uk/posts/http2.html#10)．

最新のGoのコードにはどのようにマージされたのか? まずヘッダ圧縮の[HPACK](https://tools.ietf.org/html/rfc7541)は`http2/hpack`という名前でサブディレクトリに別パッケージとして実装されている．これは`src/vendor`以下にvendoringされている．`http2`も同様にvendoringされているだけかと思ったが，こちらは`net/http`パッケージに`h2_bundle.go`という1つのファイルとして組み込まれている．

具体的な経緯は[http -> http2 -> http import cycle](https://groups.google.com/forum/#!topic/golang-dev/8Qjr03xf07U)を読むとわかるが，単純にvendoringすると`net/http`->`http2`と`http2`->`net/http`というimport cycleが起こってしまう．これは上の例で示したようにAPIの変更なしにHTTP2を有効にするというゴールを達成するためには避けられない．

これを解決するために使われたのが[bundleコマンド](https://godoc.org/golang.org/x/tools/cmd/bundle)である．これはパッケージを別パッケージとして1つのファイルにするコマンド．以下のように使われる．

```bash
$ bundle golang.org/x/net/http2 net/http http2
```

これで`golang.org/x/net/http2`を`net/http`パッケージとして`http2`というprefixをつけて一つのファイルにまとめるいうことがおこる．

変更はどうするのか? `bundle`はテストを無視するため変更はテストがちゃんとある[golang.org/x/net/http2](https://godoc.org/golang.org/x/net/http2)に入り，その都度`bundle`してマージとなるらしい（リリースまでは）．

... というのが現状．正式なリリースまでに時間はあるのでどうなるのかはわからない．

## HTTP2の機能を追う

以下ではHTTP2の主な機能がどのようにGo言語で実装されているのかを見ていく．

### フレームとストリーム

HTTP1.xではリクエスト/レスポンスのフォーマットにテキストが利用されてきた．HTTP2ではフレームと呼ばれるバイナリのフォーマットが利用される．これにより転送量の低減を実現している．フレームには[いくつかのタイプがある](https://tools.ietf.org/html/rfc7540#section-6)．例えばHTTP1.xのヘッダにあたるHEADERS，HTTP1.xのBody部にあたるDATAなどがある．フレームは以下のようなフォーマットで表現される（cf. [4.HTTP Frames](https://tools.ietf.org/html/rfc7540#section-4)）．

```bash
+-----------------------------------------------+
|                 Length (24)                   |
+---------------+---------------+---------------+
|   Type (8)    |   Flags (8)   |
+-+-------------+---------------+-------------------------------+
|R|                 Stream Identifier (31)                      |
+=+=============================================================+
|                   Frame Payload (0...)                      ...
+---------------------------------------------------------------+
```

HTTP1.xでは1つのリソースを取得するために1つのTCPコネクションが必要である．つまり3つの画像が必要であれば3つのTCPコネクションが必要である．TCPはThree-way handshakingやスロースタートにより通信のオーバーヘッドが避けられない．そのため各コネクションはなるべく並列で確立されるのが望ましい．しかし同一オリジンへの同時接続数はたいてい6つに制限されている．つまり7つ目は先の6つのどれかが完了するまでブロックされる．これに対応するためにHTTP1.x時代では画像などを別ドメインから読み込むDomain Shardingという手法が一般的にはとられてきた（cf.[HTTPリクエストを減らすために](http://t32k.me/mol/log/reduce-http-requests-overview/)）．

HTTP2ではストリームという概念を導入し上記の問題を解決している．ストリームとは1つのTCPコネクション上に作られる仮想的な双方向シーケンスである．このストリームによりリクエストは多重化され複数のリソース取得も並列で実行可能になる．それぞれのリクエストとレスポンスはひとつのストリームで処理され，それぞれがユニークなIDをもつ．

Go言語ではどう実装されているか．まず[`Framer`](https://godoc.org/golang.org/x/net/http2#Framer)というstructがフレームの書き込みと読み込みを担う．そしてそれぞれのタイプのフレームの書き込みのために専用のメソッド，例えばDATAなら`WriteData`，HEADERSなら`WriteHeaders`，が準備されている．

実際にDATAフレームを作って中身を覗いてみる．

```go
buf := new(bytes.Buffer)
fr := http2.NewFramer(buf, buf)

var streamID uint32 = 1<<24 + 2<<16 + 3<<8 + 4
fr.WriteData(streamID, true, []byte("Hello"))

b := buf.Bytes()
fmt.Printf("Frame: %q\n", b)

fmt.Printf("Type: %x\n", b[4:5])    // Type: 01
fmt.Printf("StremID: %x\n", b[5:9]) // StremID: 01020304
fmt.Printf("DATA: %x\n", b[9:])     // DATA: 48656c6c6f
```

`NewFramer`で`Framer`をつくり，`WriteData`でストリームのIDとともにデータを書き込む．あとは書き込まれたデータを定義に基づき覗くと中身が見れる．

### ヘッダ圧縮

HTTPはステートレスなプロトコルである．そのためHTTP1.xでは1つのセッションで毎回似たようなヘッダを送る必要があり冗長である．HTTP2ではヘッダの圧縮を行う．ヘッダの圧縮にはHPACKと呼ばれる手法を用いる．HPACKは[ハフマン符号化](https://ja.wikipedia.org/wiki/%E3%83%8F%E3%83%95%E3%83%9E%E3%83%B3%E7%AC%A6%E5%8F%B7)と静的/動的テーブルという仕組みで圧縮を行う手法である．HPACKはHTTP2とは別に[RFC 7541](https://tools.ietf.org/html/rfc7541)で仕様化されている．

Go言語では`http2/hpack`という名前で`http2`パッケージのサブディレクトリに別パッケージとして実装されている．それぞれ実際に使ってみる．

まずハフマン符号化．ハフマン符号は文字の出現頻度の偏りに合わせてビット列を割り当てる符号化である．ここでは例として`www.example.com`という文字列をハフマン符号でEncode/Decodeしてみる．

```golang
s := "www.example.com"

fmt.Println(len(s))
fmt.Println(hpack.HuffmanEncodeLength(s))

b := hpack.AppendHuffmanString(nil, s)
fmt.Printf("%x\n", b)

var buf bytes.Buffer
hpack.HuffmanDecode(&buf, b)

fmt.Printf("%s\n", buf.String())
```

上の例では15バイトの文字列を12バイトに符号化できる．

次にテーブルによる圧縮．HTTP2ではよく利用するヘッダをKey-Valueの辞書としてもちそのインデックスを示すことでヘッダを表現する．テーブルは仕様として事前に定義された（[Static Table Definition](https://tools.ietf.org/html/rfc7541#appendix-A)）静的テーブルとリクエストのやりとりの中で更新する動的テーブルがある．

まず静的テーブルにエントリがある`:method GET`をEncodeしてみる．

```golang
var buf bytes.Buffer
e := hpack.NewEncoder(&buf)

e.WriteField(hpack.HeaderField{
    Name:  ":method",
    Value: "GET",
})

fmt.Printf("Encoded: %x (%d) \n", buf.Bytes(), len(buf.Bytes()))
```

これは1バイトに圧縮される．

次に静的テーブルにエントリのない`:authority www.example.com`をEncodeしてみる．動的テーブルの効果をみるために2度実行する．

```golang
var buf bytes.Buffer
e := hpack.NewEncoder(&buf)

e.WriteField(hpack.HeaderField{
    Name:  ":authority",
    Value: "www.example.com",
})

fmt.Printf("Encoded: %x (%d) \n", buf.Bytes(), len(buf.Bytes()))
buf.Reset()

e.WriteField(hpack.HeaderField{
    Name:  ":authority",
    Value: "www.example.com",
})

fmt.Printf("Encoded: %x (%d) \n", buf.Bytes(), len(buf.Bytes()))
```

同じヘッダに対して2度Encodeを実行する．まず1度目は動的テーブルにエントリがないため14バイトにしかならない．もしテーブルにエントリがない場合は，動的テーブルにそれが追加され，2度目の実行時は1バイトに圧縮される．

### 優先度制御

HTTP1.xでは全てのリクエストは平等に処理される．つまり画像もCSSもJSも全て平等に処理される．HTTP2ではクライアントがリクエストに優先度を指定することができる．例えばサイトのレンダリングが必要なCSSやJSを優先的にリクエストすることができる．これによりページの描画を改善しユーザの体感速度を向上することが期待できる．

Go言語ではどうなっているのか．クライアントは[`PriorityParam`](https://godoc.org/golang.org/x/net/http2#PriorityParam)というstructを用いて優先度の指定を行う．そしてHEADERSもしくはPRIOTIRYフレームでこれを送信する．

次にサーバーの動き．これは外からは触れない．どう処理されるかはテストコードを見るのが良い．`priority_test.go`を見る．

```golang
// A -> B
// move A's parent to B
streams := make(map[uint32]*stream)
a := &stream{
    parent: nil,
    weight: 16,
}
streams[1] = a

b := &stream{
    parent: a,
    weight: 16,
}
streams[2] = b

adjustStreamPriority(streams, 1, PriorityParam{
    Weight:    20,
    StreamDep: 2,
})

if a.parent != b {
    t.Errorf("Expected A's parent to be B")
}
if a.weight != 20 {
    t.Errorf("Expected A's weight to be 20; got %d", a.weight)
}
if b.parent != nil {
    t.Errorf("Expected B to have no parent")
}
if b.weight != 16 {
    t.Errorf("Expected B's weight to be 16; got %d", b.weight)
}
```

各`a`と`b`という`stream`がmapで管理されている．mapのkeyは各`stream`のIDである．そして`adjustStreamPriority`でIDが1である`a`の優先度を16から20に更新し依存するストリームのIDを2に変更する．

...と優先度の更新は追えたが，この優先度をどのように使っているのかは見つけることができなかった．知ってる人がいたら教えてください．

### Server Push

HTTP1.xではクライアントからリソースのリクエストがあって初めてサーバー側からそれを送ることができる．HTTP2ではServer Pushという仕組みを使い，クライアントがリクエストする前にサーバー側からクライアントにリソースを送りつけることができる．例えばサーバーがHTMLのリクエストを受けたとする．サーバーはHTMLの内容を知っているので次にCSSやJSのリクエストがクライアントから送られることを予想できる．Server Pushを使えばそれらを先に送信することができる．

[kazuho](https://twitter.com/kazuho)さんによる[H2O](https://github.com/h2o/h2o)に関する発表を見ているとServer Pushは難しそう．Server Pushで送られたリソースはクライアントでキャッシュされ，クライアントはそのキャッシュを利用することになる．既にキャッシュが存在する場合にPushするのは無駄になるが，それを制御するのは難しい（H2Oでは[Cache aware-server-push](http://www.slideshare.net/kazuho/cache-awareserverpush-in-h2o-version-15)をしているとのこと）．

Go言語ではどうなっているのか．Server Pushを行うときはPUSH_PROMISEというフレームをサーバーは送信する．このフレームを作成する`WritePushPromise`というメソッドは準備されている．がServer Pushを行うためのハイレベルなインターフェースは現時点では見当たらなかった．["Please test Go's HTTP/2 support"](https://groups.google.com/forum/?fromgroups#!searchin/golang-nuts/http2/golang-nuts/1ggSbDA_XYI/kJhd35zwDgAJ)などを読む限り今後のバージョンでのリリースになりそう．


## まとめ

GoのHTTP2の実装を追ってみた．Server Pushを覗いた基本的な機能は実装されており，かつGo1.5以前と同じインターフェースで利用できることがわかった．

GoのHTTP2をすぐに使うのか? と聞かれるとまだ議論が必要であると感じた．少なくとも現時点ではTLS終端はアプリケーションの前段のnginxにある．最初はnginxなどで利用することから始めると思う．

PaaSを運用している立場からみると状況はもう少し複雑になる．例えばGoogle App EngineのようにTLSとHTTP2は全てGoogleのサーバーが面倒見るからその上のアプリケーションは何もしなくてもHTTP2が有効になりますと言うこともできる（cf. [Full Speed Ahead with HTTP/2 on Google Cloud Platform](http://googlecloudplatform.blogspot.jp/2015/10/Full-Speed-Ahead-with-HTTP2-on-Google-Cloud-Platform.html)）．その一方でServer Pushなどはアプリケーションごとにコントロールしたいかもしれない．そういう場合にどのようにハンドルするべきなのかなど考えることは多い．


<h3 id="cf">参考</h3>

- [HTTP/2時代のウェブサイト設計](http://www.slideshare.net/kazuho/http2-51888328)
- [HTTP/2でも初めてみます？](http://www.slideshare.net/KetoKawakami/http2-51414240)
- [HTTP2 時代の Web - web over http2](http://www.slideshare.net/Jxck/http2-web-web-over-http2-51943080)
- [HTTP/2 入門 - Yahoo! JAPAN Tech Blog](http://techblog.yahoo.co.jp/infrastructure/http2/introduction_to_http2/)
- [Software Design 2015年11月号](http://gihyo.jp/magazine/SD/archive/2015/201511)
- [HTTP2 時代のサーバサイドアーキテクチャ考察](http://jxck.hatenablog.com/entry/http2-server-side-architecture)
- [HTTP2 の RFC7540 が公開されました](http://jxck.hatenablog.com/entry/http2-rfc7540)
- [HTTP/2のRFCを読んだ感想 - WAF Tech Blog ｜ クラウド型 WAFサービス Scutum 【スキュータム】](http://www.scutum.jp/information/waf_tech_blog/2015/05/waf-blog-044.html)
- [スレッドプログラミングによる HTTP/2 の実装](http://www.mew.org/~kazu/material/2015-warp-http2.pdf)
- [HTTP2 時代のサーバサイドアーキテクチャ考察](http://jxck.hatenablog.com/entry/http2-server-side-architecture)
- [HTTP/2 Deep Dive: Priority & Server Push](https://speakerdeck.com/summerwind/2-deep-dive-priority-and-server-push)
- [HTTP/2 and Server Push](https://blogs.oracle.com/theaquarium/entry/http_2_and_server_push)
- [http://www.integralist.co.uk/posts/http2.html](http://www.integralist.co.uk/posts/http2.html)
- [Full Speed Ahead with HTTP/2 on Google Cloud Platform](http://googlecloudplatform.blogspot.jp/2015/10/Full-Speed-Ahead-with-HTTP2-on-Google-Cloud-Platform.html)
- [http2/quic meetup - 資料一覧 - connpass](http://http2study.connpass.com/event/21161/presentation/)
- [mozaic.fm #2](http://mozaic.fm/post/83421293098/2-http2)
- [Rebuild: 99: The Next Generation Of HTTP (kazuho)](http://rebuild.fm/99/)
- [#161: HTTP/2 with Ilya Grigorik](https://changelog.com/161/)
