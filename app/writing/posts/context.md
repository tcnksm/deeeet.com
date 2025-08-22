+++
date = "2016-07-22T09:12:28+09:00"
title = "Go1.7のcontextパッケージ"
+++

[Go1.7](https://tip.golang.org/doc/go1.7)では[golang.org/x/net/context](https://godoc.org/golang.org/x/net/context)が`context`パッケージとして標準パッケージに仲間入りする．そしていくつかの標準パッケージでは`context`パッケージを使ったメソッド/関数も新たに登場する．`context`パッケージは今後さらに重要な，Gopherは普通に扱うべき，パッケージになると考えられる．本記事ではそもそも`context`パッケージとは何か？なぜ登場したのか？なぜ重要なのか？どのように使うべきか？についてまとめる．

`context`パッケージが初めて紹介されたのは2014年のThe Go Blogの記事 ["Go Concurrency Patterns: Context"](https://blog.golang.org/context)である．この記事ではなぜGoogleが`context`パッケージを開発したのか，どのように使うのか具体的な検索タスクを例に解説されている．まだ読んだことがない人はそちらを先に読むと良い．

## contextパッケージとは何か

ここでは具体的な利用例から`context`とは何かを説明する．

例えばGoの典型的な利用例であるWebアプリケーションを考える．Goのサーバにおいてリクエストはそれぞれ個別のgoroutineで処理される．そしてリクエストHandlerは新たなgoroutineを生成しバックエンドのDBや別のサーバにリクエストを投げ結果を得てユーザに対してレスポンスを返す．

このような別サーバへのリクエストのように時間のかかる処理をgoroutineで実行する場合どのようなことに注意する必要があるだろうか．まず最初に注意するべきはその処理に適切なTimeoutやDeadlineを設定して処理が停滞するのを防ぐことである．例えば別のサーバにリクエストを投げる場合にネットワークの問題でリクエストに時間がかかってしまうことは大いに考えられる．リクエストにTimeoutを設定して早めにレスポンスを返しリトライを促すべきである．

次に注意するべきは生成したgoroutineを適切にキャンセルしリソースを解放することである．例えば別のサーバにリクエストを投げる場合に適切なキャンセル処理を行わないとTimeout後もネットワークリソースが使われ続けることになる（CPUやメモリを使い続けるかもしれない）．この場合`net/http`パッケージレベルでリクエストをキャンセルするべきである．

さらにそのgoroutineは別のgoroutineを呼び出しそれがまた別の...と呼び出しの連鎖は深くなることが考えられる．その場合も親のTimeoutに合わせてその子は全て適切にキャンセルされリソースは解放されるべきである．．

このようにキャンセル処理は重要である．`context`パッケージはこのキャンセルのためのシグナルをAPIの境界を超えて受け渡すための仕組みである．ある関数から別の関数へと，親から子へと，キャンセルを伝搬させる．

これは`context`を使わなくても実現できる．しかし標準パッケージになったことで`context`は「キャンセルのためのシグナルの受け渡しの標準的なインターフェース」として使える．この流れは別の標準パッケージに新たに追加された関数に見ることができる．

（後述するが`context`パッケージは限定されたスコープの値，例えば認証情報など，の受け渡しとしても利用できる．しかし筆者はこれは付随的な機能でありキャンセル機構としての`context`の方が重要であると考えている）

## コードで追うcontextパッケージ

言葉のみでは伝わりにくいので具体的なサンプルコードを使って`context`パッケージの使いどころを説明する．

以下のような単純なリクエストHandlerを考える．このHandlerはユーザからのリクエストを受けバックエンドのサービスにリクエストを投げる．そして得た結果をユーザに返す（具体的なレスポンスの書き込みなどは省略している）．リクエストは別のgoroutineで投げ，エラーをchannelで受け取る．このコードを改善していく．

```golang
func handler(w http.ResponseWriter, r *http.Request) {
    // 新たにgoroutineを生成してバックエンドにリクエストを投げる
    // 結果をerror channelに入れる
    errCh := make(chan error, 1)
    go func() {
        errCh <- request()
    }()

    // error channelにリクエストの結果が返ってくるのを待つ
    select {
    case err := <-errCh:
        if err != nil {
            log.Println("failed:", err)
            return
        }
    }

    log.Println("success")
}
```

まず現状のコードはネットワークの問題などで`request()`に時間がかかりユーザへのレスポンスが停止してしまう可能性がある．これを防ぐためにはTimeoutを設定するべきである．`time`パッケージの`time.After`を使うと以下のようにTimeoutを設定することができる．

```golang
func handler(w http.ResponseWriter, r *http.Request) {
    errCh := make(chan error, 1)
    go func() {
        errCh <- request()
    }()

    select {
    case err := <-errCh:
        if err != nil {
            log.Println("failed:", err)
            return
        }
        
    // Timeout（2秒）を設定する．
    // 例えばしばらく経ってから再度リクエストをするように
    // レスポンスを返す．
    case <-time.After(2 * time.Second):
        log.Println("failed: timeout")
        return
    }

    log.Println("success")
}
```

これでリクエストがネットワークなどの不調によりリクエストが停滞してしまう問題は解決できた．しかしこれでは不十分である．Timeoutでリクエストをユーザに返した後も`request`は別のgoroutineで動き続ける．つまりサーバのリソースを使い続ける．少量であれば問題ないがリクエストが増えれば増えるほど問題になる．これを防ぐには`request()`をキャンセル可能にリソースを解放するべきである．`context`を使わない場合は，これは例えば以下のように実装できる．

```golang
func handler(w http.ResponseWriter, r *http.Request) {
    // handlerからrequestをキャンセルするためのchannelを準備する
    doneCh := make(chan struct{}, 1)
    
    errCh := make(chan error, 1)
    go func() {
        errCh <- request(doneCh)
    }()

    // 別途goroutineを準備してTimeoutを設定する
    go func() {
        <-time.After(2 * time.Second)
        // Timeout後にdoneChをクローズする
        // 参考: https://blog.golang.org/pipelines
        close(doneCh)
    }()

    select {
    case err := <-errCh:
        if err != nil {
            log.Println("failed:", err)
            return
        }
    }

    log.Println("success")
}
```

`request()`は以下のように書ける．

```golang
func request(doneCh chan struct{}) error {
    tr := &http.Transport{}
    client := &http.Client{Transport: tr}
    
    req, err := http.NewRequest("POST", backendService, nil)
    if err != nil {
        return err
    }
　　
    // 新たにgoroutineを生成して実際のリクエストを行う
    // 結果はerror channelに投げる
    errCh := make(chan error, 1)
    go func() {
        _, err := client.Do(req)
        errCh <- err
    }()

    select {
    case err := <-errCh:
        if err != nil {
            return err
        }
    
    // doneChはhandlerからのキャンセル シグナル（close(doneCh)）
    // を待ち受ける
    case <-doneCh:
        // キャンセルが実行されたら適切にリクエストを停止して
        // エラーを返す．
        tr.CancelRequest(req)
        <-errCh
        return fmt.Errorf("canceled")
    }

    return nil
}
```

`context`パッケージを使うとこれはより簡単に書くことができる．

```golang
func handler(w http.ResponseWriter, r *http.Request) {
    // 2秒でTimeoutするcontextを生成する
    // cancelを実行することでTimeout前にキャンセルを実行することができる
    //     
    // また後述するようにGo1.7ではnet/httpパッケージでcontext
    // を扱えるようになる．例えば*http.Requestからそのリクエストの
    // contextを取得できる．
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()

    errCh := make(chan error, 1)
    go func() {
        errCh <- request3(ctx)
    }()

    select {
    case err := <-errCh:
        if err != nil {
            log.Println("failed:", err)
            return
        }
    }

    log.Println("success")
}
```

`request()`は以下のように書ける．

```golang
func request(ctx context.Context) error {
    tr := &http.Transport{}
    client := &http.Client{Transport: tr}
    
    req, err := http.NewRequest("POST", backendService, nil)
    if err != nil {
        return err
    }

    // 新たにgoroutineを生成して実際のリクエストを行う
    // 結果はerror channelに投げる
    errCh := make(chan error, 1)
    go func() {
        _, err := client.Do(req)
        errCh <- err
    }()

    select {
    case err := <-errCh:
        if err != nil {
            return err
        }
    
    // Timeoutが発生する，もしくはCancelが実行されると
    // Channelが返る
    case <-ctx.Done():
        tr.CancelRequest(req)
        <-errCh
        return ctx.Err()
    }

    return nil
}
```

`doneCh`と比べると`context`を使った場合はよりシンプルに書けているのがわかる．これだけではない．標準パッケージになるということは，今後はこの重要なキャンセル処理を統一的なインターフェースとして書くことができるということである．

## contextの契約

具体的な使い方は[ドキュメント](https://tip.golang.org/pkg/context/)が詳しいのでそれを読むのが良い．大きなパッケージではないのですぐに読めると思う．以下では注意するべきことを簡単にまとめる．

まず自分で`context`を前提としたメソッド/関数を提供する場合は以下の形式を守る．必ずメソッド/関数の第一引数に`context.Context`を渡せるようにする．structなどに埋め込んではいけない．

```golang
func DoSomething(ctx context.Context, arg Arg) error {
    // ... use ctx ...
}
```

さらに`context`をもつ関数は適切なキャンセル処理を実装するべきである．この関数を使う側は呼び出し側（つまり親`context`）でTimeoutが発生した，もしくは`Cancel`を実行した場合に適切にキャンセル処理・リソースの解放が実行されることを期待する．例えば，上のサンプルコードで示したようにHTTPリクエストであれば`CancelRequest`を呼び確実に処理を終了させる必要がある．

内部で別の関数を呼ぶ場合も`context`を前提とし親`context`からキャンセル可能にするべきである．標準パッケージで`context`を前提としたメソッド/関数が実装され始めているのはこの理由によると思う．

これらがGopherの間の`context`の契約になると思う．

## Valueの扱い

`context`パッケージは限定されたスコープの値，例えば認証情報など，の受け渡しとしても利用できる．しかしこれはキーと値を`interface{}`型で指定するため利用には注意が必要である．ドキュメントにも利用するときの注意点がしっかり書かれている．例えば，値の取り出しには専用のメソッド/関数を準備してちゃんとした型として値を返すようにする，キーは公開しないなどである．

またどのような値を渡すべきかに関しては[go-kit](http://peter.bourgon.org/go-kit/)の開発者である[Peter Bourgo](https://twitter.com/peterbourgon)氏のブログが非常に参考になる．

- [context](https://peter.bourgon.org/blog/2016/07/11/context.html)

## 標準パッケージの中のcontext

先にも述べたようにGo1.7ではいくつかの標準パッケージで`context`パッケージを使ったメソッド/関数が実装された．実装されたのは`net`と`net/http`，そして`os/exec`である．それぞれ簡単に紹介する．

### net

`net`パッケージには`Dialer`に新たに`DialContext()`メソッドが追加された．これは既存の`Dial()`メソッドに`context.Context`を渡せるようにしたメソッドである．例えば以下のように使うことができる．

```go
ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
defer cancel()

var dialer net.Dialer
conn, err := dialer.DialContext(ctx, "tcp", "google.com:80")
if err != nil {
    log.Fatal(err)
}
```

### net/http

`net/http`には`Request`に新たに`Context()`メソッドと`WithContext()`メソッドが追加された．`Context()`はそのリクエストにおける`context.Context`を取得するために，`WithContext()`は変更に用いる．

Clientとしては以下のようにリクエストのキャンセルに使うことができる．

```go
req, err := http.NewRequest("GET", "http://google.com", nil)
if err != nil {
    log.Fatal(err)
}

ctx, cancel := context.WithTimeout(req.Context(), 100*time.Millisecond)
defer cancel()

req = req.WithContext(ctx)

client := http.DefaultClient
res, err := client.Do(req)
if err != nil {
    log.Fatal(err)
}
```

サーバーとしては以下のように`context.WithValue()`を用いて各リクエストのスコープに限定した値の受け渡しなどに使うことができる．

```golang
const tokenKey = "tokenKey"

func withAuth(a Authorizer next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        auth := r.Header.Get("Authorization")
        token := a.Auth(auth)
        
        ctx := r.Context()
        ctx = context.WithValue(ctx, tokenKey, token)
        next.ServeHTTP(w, r.WithContext(ctx))
	}
}
```

またデフォルトで`ServerContextKey`と`LocalAddrContextKey`というキーでリクエストの`context.Context`にそれぞれ`*http.Server`と`net.Addr`の値がセットされておりそれを使うこともできる．

```golang
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    srv := ctx.Value(ServerContextKey)
    ....
}    
```

### os/exec

`os/exec`には`CommandContext()`関数が追加された．これは既存の`Command()`関数に`context.Context`を渡せるようにした関数である．例えば以下のように使うことができる

```go
cmd := exec.CommandContext(ctx, "sleep", "2")
if err := cmd.Run(); err != nil {
    log.Fatal(err) 
}
```

`context.Context`が終了すると`os.Process.Kill`が実行される．

`context`は`net`関連で主に使われてきたが，そうではない場合であってもタスクにDeadlineやTimeout，Cancelを持たせるための標準的なインターフェースに利用可能であることを示す良い例である．

## Context leakを避ける

`WithCancel`や`WithTimeout`，`WithDeadline`で返される`cancel`が呼ばれないと，その親`Context`が`cancel`されるまでその子`Context`がLeakする（context leak）．Go1.7からの`go vet`はそれを検出する（`-lostcancel`）．例えば以下のような出力が得られる．

```golang
func leak() {
    var ctx, cancel = context.WithCancel() 
    // the cancel function is not used on all paths 
    // (possible context leak)
    
    // this return statement may be reached 
    // without using the cancel var defined on line x
}
```

[こちらの変更](https://go-review.googlesource.com/#/c/24150/13/src/cmd/vet/testdata/lostcancel.go)を見ると別の検出パターンもわかる．

## まとめ

どんどん使っていきましょう．

## 参考

- [Go 1.7 Release Notes DRAFT](https://tip.golang.org/doc/go1.7)
- [Context and Cancellation of goroutines](http://dahernan.github.io/2015/02/04/context-and-cancellation-of-goroutines/)
- [Cancelation, Context, and Plumbing](https://talks.golang.org/2014/gotham-context.slide#1)
- [How to correctly use context.Context in Go 1.7](https://medium.com/@cep21/how-to-correctly-use-context-context-in-go-1-7-8f2c0fafdf39#.im1d1tr4r)

