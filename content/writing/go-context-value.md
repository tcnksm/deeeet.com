+++
title = "Golangのcontext.Valueの使い方"
date = "2017-02-23T09:20:07+09:00"
+++

Go1.7で`context`パッケージが標準パッケージに入りしいろいろなところで使われるようになってきた．先日リリースされたGo1.8においても`database/sql`パッケージなどで`context`のサポートが入るなどますます重要なパッケージになっている．

["Go1.7のcontextパッケージ"](http://deeeet.com/writing/2016/07/22/context/)で書いたように`context`は「キャンセルのためのシグナルの受け渡しの標準的なインターフェース」として主に使われる．ある関数やメソッドの第1引数に`context.Context`が渡せるようになっていればキャンセルを実行したときにその関数は適切に処理を中断しリソースを解放することを期待する．これはパッケージの作者とその利用者との間のある種の契約のようになっている（パッケージ側でgoroutine作るなというパターンもここで効いてくる）．

これだけではなく`context.Context`インターフェースには`Value`というメソッドも定義されている．これを使うと任意の値を受け渡すことができる（contextと言われるとこちらを想像する人も多い）．これは便利だが注意して使わないと崩壊するのでどう使うべきかをまとめておく（[context](https://peter.bourgon.org/blog/2016/07/11/context.html)も分かりやすい）．

## なぜ注意が必要か?

`context.Value`のSetとGetは以下のように定義されている．

```golang
WithValue(parent Context, key, val interface{}) Context
```

```golang
Value(key interface{}) interface{}
```

`WithValue`で値をセットし`Value`で値を取り出す．注意するべきなのは型を見ればわかるようにtype-unsafeでコンパイラでチェックができないからである．要するに`map[interface{}]interface{}`である．つまり避けれるなら避けた方が良い．

例えばチームでAPIサーバーを開発していてあらゆる値が様々なHandlerで無防備にSetされたりGetされたりするようになると崩壊する．

## どのようなときに使えるか?

ではどのようなときに`Value`は有用になるか? **ある特定のリクエストスコープ内で限定的な値**を渡すのに便利に使える．例えば以下のようなものが考えられる．

- ユーザID
- 認証情報（Token）
- Distributed TraceのID

## どのような値を渡すべきで*ない*か?

あるいは適していないか．例えば，DB ClientやAPI Client，loggerなどである．これらはスコープに限定的ではないしそもそもテストがしにくくなる．これらはサーバーが依存として持つべきである．以下のようにmiddlewareで渡すかhandlerに持たせる（ジョブワーカーを書いている場合もStructを定義してそこに渡すべきである）．

```golang
func MyMiddleware(db Database, next http.Handler) http.Handler {
    return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
        // Use db here.
        next.ServeHTTP(w, r)
    })
}
```

```golang
type MyHandler struct {
   db Database
}

func (h *MyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {...}
```

## 使い方

`context.Value`を使う上で注意するのは値へのアクセスを制限する，ちゃんと型を持たせることである．以下のやり方はどちらかというとstrictでパッケージ作者寄りのやりかただが，チームで何か書いている場合であってもむやみにいろいろな値がSetされてカオスになるよりは初めから厳しくやるのが良いと思う．

まずkeyは以下のようにunexportedな型をもったunexportedな`const`として定義する．こうしておけば意図しないところ（少なくともpackage外で）で値がSetされたりGetされることがなくなる．

```golang
type contextKey string

const tokenContextKey contextKey = "key"
```

値のSetとGetには以下のように専用の関数/メソッドを定義する（これらはpackage外にexportされても良い）．少なくともGetは定義されているべきで関数内でtype assertionを実行し具体的な型として取り出せるようにする．

```golang
func SetToken(parents context.Context, t string) context.Context {
    return context.WithValue(parents, tokenContextKey, t)
}
```

```golang
func GetToken(ctx context.Context) (string, error) {
    v := ctx.Value(tokenContextKey)

    token, ok := v.(string)
    if !ok {
        return "", fmt.Errorf("token not found")
    }

    return token, nil
}
```
