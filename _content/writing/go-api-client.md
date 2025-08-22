+++
date = "2016-11-01T11:42:19+09:00"
title = "GolangでAPI Clientを実装する"
+++

特定のAPIを利用するコマンドラインツールやサービスを書く場合はClientパッケージ（SDKと呼ばれることも多いが本記事ではClientと呼ぶ）を使うことが多いと思う．広く使われているサービスのAPIであれば大抵はオフィシャルにClientパッケージが提供されている．例えば以下のようなものが挙げられる．

- https://github.com/aws/aws-sdk-go 
- https://github.com/Azure/azure-sdk-for-go
- https://github.com/PagerDuty/go-pagerduty
- https://github.com/hashicorp/atlas-go

特別使いにくい場合を除けば再実装は避けオフィシャルに提供されているものを使ってしまえばよいと思う（まともなものなら互換性などをちゃんと考慮してくれるはずなので）．一方で小さなサービスや社内のサービスの場合はClientは提供されておらず自分で実装する必要がある．

自分はこれまでいくつかのAPI client パッケージを実装してきた．本記事ではその実装の自分なりの実装パターン（各人にやりかたはあると思う）といくつかのテクニックを紹介する．

## Clientとは何か?

API ClientとはAPIのHTTPリクエストを（言語の）メソッドの形に抽象化したものである．例えば  https://api.example.com/users というエンドポイントからユーザ一覧を取得できるとする．API Clientは具体的なHTTPリクエスト（メソッドやヘッダの設定，認証など）を抽象化し `ListUsers()`のようなメソッドに落とし込んでその機能を提供する．

## なぜ Client を書くべきか?

そもそも共通化できることが多いため．それぞれのリクエストは独立していても例えばユーザ名やパスワード，Tokenなどは基本は同じものを使うし，ヘッダの設定なども共通して行える．またテストも書きやすくなる．

## いつClientを書くべきか?

複数のエンドポイントに対してリクエストを投げる必要がある場合はClientを書いてしまえばいいと思う．例えば，単一のエンドポイントに決まったリクエストを投げるだけであればClientをわざわざ書く必要はない．自分の場合は3つ以上エンドポイントがあればClientをさっと書いていると思う．

## 基本的な実装パターン

以下では https://api.example.com （存在しない）のAPI Client パッケージを実装するとする．このAPIでは`/users`というパスでユーザの作成と取得，削除が可能であるとする．また各リクエストにはBasic認証が必要であるとする．

### パッケージの名前をつける

https://golang.org/doc/effective_go.html#package-names

上のEffective Goにも書かれているようにパッケージ名は shortかつconciseかつevocativeのものを選択する．API Clientであればそのサービス名がそのままパッケージ名になると思う．例えば PagerDutyであれば `pagerduty`がパッケージ名になる．

名前については以下でもいくつか述べる．

### Client（struct）を定義する

まずは`Client` structを実装する．`Client`のフィールドにはリクエスト毎に共通に利用する値を持たせるようにする．HTTP APIの場合は例えば以下のようなものが考えられる:

- `url.URL` - リクエスト毎にパスは異なるがベースのドメインは基本的には共通になる．例えば今回の場合は https://api.example.com は共通である
- `http.Client` - 各HTTP リクエストには`net/http`パッケージの`Client`を用いる．これは同じものを使い回す
- 認証情報 - 認証に利用する情報も基本的には同じになる．例えば今回の場合はBasic認証に必要なユーザ名とパスワードは共通である．他にもTokenなどが考えられる
- `log.Logger` - デバッグの出力も共通である．自分はグローバルな`log`を使うよりも明示的に指定するのを好む

今回の場合は以下のように実装できる．

```golang
type Client struct {
    URL        *url.URL
    HTTPClient *http.Client

    Username, Password string

    Logger *log.Logger
}
```

importのように関連するフィールドでグールピングして記述しておくと読みやすい．

また名前は`Client`で十分である．例えばPagerDutyのAPI Clientを書いているときに`PagerDutyClient`という名前にしない．上述したように既にそれはパッケージ名で説明されるはずである．`pagerduty.PagerDutyClient`では冗長になる．簡潔な名前を心がける．

### コンストラクタを定義する

次に`Client`のコンストラクタを定義する．例えば今回の場合は以下のようになる．

```golang
func NewClient(urlStr, username, password string, logger *log.Logger) (*Client, error) 
```

コンストラクタ内では必須の情報が与えられているか，その値は期待するものかをチェックし，そうでなければエラーを返す（以下では`pkg/errors`を使っている）．

```golang
if len(username) == 0 {
    return nil, errors.New("missing  username")
}

if len(password) == 0 {
    return nil, errors.New("missing user password")
}
```

```golang
parsedURL, err := url.ParseRequestURI(urlStr)
if err != nil {
    return nil, errors.Wrapf(err, "failed to parse url: %s", urlStr)
}
```

必須でないものはデフォルト値を準備しておきそれを使う．例えば今回の場合は`Logger`は必須ではない．

```golang
var discardLogger = log.New(ioutil.Discard, "", log.LstdFlags)
if logger == nil {
    logger = discardLogger
}
```

`http.Client`もコンストラクタ内で生成し`Client`にセットしておく．デフォルトを使っても良いしProxyや各Timeoutを変更したい場合は独自で準備しても良い（`http.DefaultClient`の値はバージョンによって変わるので注意する．独自の設定を使っているとバージョン毎の新しい設定に追従できないことがある）．

### 共通メソッドを定義する1

API Clientでは多くの共通メソッドを定義できる．代表的なのは`http.Request`を作成するメソッドである．`http.NewRequest`を使い`http.Request`を生成しBasic認証の設定やヘッダの設定といった共通の処理を行う．

例えば今回の場合は以下のように書ける．

```golang
var userAgent = fmt.Sprintf("XXXGoClient/%s (%s)", version, runtime.Version())

func (c *Client) newRequest(ctx context.Context, method, spath string, body io.Reader) (*http.Request, error) {
    u := *c.URL
    u.Path = path.Join(c.URL.Path, spath)

    req, err := http.NewRequest(method, u.String(), body)
    if err != nil {
        return nil, err
    }

    req = req.WithContext(ctx)

    req.SetBasicAuth(c.Username, c.Password)
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
    req.Header.Set("User-Agent", userAgent)

    return req, nil
}
```

引数はHTTP メソッドとパス名，そしてリクエストのBody（`io.Reader`）である．他にも引数が増える場合は`RequestOpts`のようなstructを別途準備して渡すようにするとインターフェースの変更がなくなり，呼び出し側の変更コストをなくすことができる（ref. [Tips for Creating a Good Package](http://go-talks.appspot.com/github.com/yosssi/talks.yoss.si/2015/0220-good-package.slide#1)）．

さらにGo1.7以降であるなら`context.Context`をセットするようにすればモダンになる（ref. [context パッケージの紹介](http://go-talks.appspot.com/github.com/matope/talks/2016/context/context.slide#1)）

また`User-Agent`をセットしておくとサーバ側に優しい．ClientのバージョンやGoのバージョンをつけておくとより便利である．

### 共通メソッドを定義する2

多くのAPIはレスポンスとしてJSONやXMLなどを返す．これらをGolangのstructへDecodeする処理はAPI Clientでは共通の処理になる．例えばJSONの場合は以下のような関数を準備しておくと良い．

```golang
func decodeBody(resp *http.Response, out interface{}) error {
    defer resp.Body.Close()
    decoder := json.NewDecoder(resp.Body)
    return decoder.Decode(out)
}
```

ちゃんと`Decoder`を使う．`ioutil.ReadAll`などを使うとメモリ効率もパフォーマンスも良くない（ref. [Crossing Streams: a love letter to Go io.Reader](https://www.datadoghq.com/blog/crossing-streams-love-letter-gos-io-reader)，[Go Walkthrough: io package](https://medium.com/go-walkthrough/go-walkthrough-io-package-8ac5e95a9fbd#.xivkrapgz)）．

### 各メソッドを定義する

最後にこれらを使って各メソッドを定義する．今回の場合は以下のようなメソッドが考えられる．外部からリクエストをキャンセルできるように`context.Context`を渡す．

```golang
func (c *Client) GetUser(ctx context.Context, userID string) (*User, error)
func (c *Client) CreateUser(ctx context.Context, name string) error
func (c *Client) DeleteUser(ctx context.Context, userID string) error
```

例えば`GetUser`は以下のように実装できる．

```golang
func (c *Client) GetUser(ctx context.Context, userID string) (*User, error) {
    spath := fmt.Sprintf("/users/%s", userID)
    req, err := c.newRequest(ctx, "GET", spath, nil)
    if err != nil {
        return nil, err
    }

    res, err := c.HTTPClient.Do(req)
    if err != nil {
        return nil, err
    }
    
    // Check status code here…

    var user User
    if err := decodeBody(res, &user); err != nil {
        return nil, err
    }

    return &user, nil
}
```

リクエストメソッドは上記で定義した共通メソッドで`http.Request`を作成し`Client`の`HTTPClient`を利用して実際のリクエストを実行する．そしてレスポンスのDecodeを行う．異なるのはパス名やリクエストBodyである．ステータスコードのチェックもここで行う．

## いくつかのテクニック

以下では自分が実践しているいくつかのテクニックを紹介する．

### insecureオプション

`Client`のコンストラクタに渡す値として`insecure`（`bool`）はよく使う．例えば社内の古いサービスやステージング環境だと自己署名証明書を使っている場合があり`InsecureSkipVerify`を有効にする必要がある．`insecure`はこの設定に使う．例えば以下のように切り替えを行う．

```golang
tlsConfig := tls.Config{
    InsecureSkipVerify: insecure,
}

transport := *http.DefaultTransport.(*http.Transport)
transport.TLSClientConfig = &tlsConfig

c.HTTPClient = &http.Client{
    Transport: &transport,
}
```

### Symmetric API testing

[Symmetric API Testing](https://blog.gopheracademy.com/advent-2015/symmetric-api-testing-in-go/)

API Clientを書くときもテストは大切である．もっとも簡単で確実なのは実際にAPIにリクエストを投げてレスポンスが期待するものであるかを確認する方法である．しかしAPIによってはリクエストに制限があるし，RTTを考えるとテストの時間も長くなる，またオフラインでテストすることができない．これを解決するのがGopher Academyで紹介されていたSymmetric API Testingである．

詳しくは上記のリンクを読むのが良いが，簡単にいうとAPIのレスポンスをローカルのディスクに保存して次回からそれを使ってテストする方法である．例えば上で紹介した`decodeBody`を以下のように変更する．

```golang
func decodeBody(resp *http.Response, out interface{}, f *os.File) error {
    defer resp.Body.Close()

    if f != nil {
        resp.Body = ioutil.NopCloser(io.TeeReader(resp.Body, f))
        defer f.Close()
    }

    decoder := json.NewDecoder(resp.Body)
    return decoder.Decode(out)
}
```

`io.TeeReader`を使い`os.File`が渡された場合にDecodeと同時にレスポンスをファイルに書き込む．

実際にテストを行うときはこのファイルを`httptest`で返すようにする．例えば`/users/1`のレスポンスを`testadata/users-1.json`に保存したとする．

```golang
muxAPI := http.NewServeMux()
testAPIServer := httptest.NewServer(muxAPI)
defer testAPIServer.Close()

muxAPI.HandleFunc("/users/1", func(w http.ResponseWriter, r *http.Request) {
    http.ServeFile(w, r, "testdata/users-1.json")
})
...
```

これで実際のAPIリクエストを避けてテストを行うことができる．

### ネットワーク関連のデバッグ

`Client`を定義するときに`log.Logger`を渡すようにしたがこれはデバッグに用いる．API Clientでもデバッグは重要である．リクエストBodyなどはもちろんだが，以下のようにネットワークに関わる情報をデバッグとして出力しておくと問題が起こったときに解決しやすい．

Goの`http.Client`はデフォルトで環境変数（`http_proxy`と`https_proxy`）を参照しProxyを設定する．複雑なネットワーク環境から使われた場合結局Proxyが問題の原因になってることが多い．そのため以下のようにProxy情報も基本はデバッグで出力されるようにしておくと良い．上でいうと`newRequest`にこれは書ける．

```golang
proxy := "no"
if proxyURL, _ := http.ProxyFromEnvironment(req); proxyURL != nil {
    proxy = proxyURL.String()
}
c.Logger.Printf("[DEBUG] request proxy: %s", proxy)
```

HTTPリクエストのどこで時間がかかっているかわかると問題の切り分けがしやすい．[tcnksm/go-httpstat](https://github.com/tcnksm/go-httpstat)を使うとDNSLookupやTLSHandshakeのレイテンシを簡単に測定することができる．詳しくは[Tracing HTTP request latency in golang](https://medium.com/@deeeet/trancing-http-request-latency-in-golang-65b2463f548c#.i8unan3sy) に書いた．


## まとめ

API Clientは最初に書くGolang パッケージとしても良いと思う．
