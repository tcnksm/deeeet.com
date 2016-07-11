---

title: 'Go言語のコードレビュー'
date: 2014-05-26
comments: true
categories: golang
---

SoundCloudが2年半ほどGo言語を利用したプロダクトを本番で運用した知見を[GopherCon](http://www.gophercon.com/)で発表していた（["Go: Best Practices for Production Environments"](http://peter.bourgon.org/go-in-production/)）．その中で["CodeReviewComments](https://code.google.com/p/go-wiki/wiki/CodeReviewComments")というGoogleでのGo言語のコードレビューにおいてよくあるコメントをまとめたサイトが紹介されていた．

最近Go言語を書くようになり，使えそうなのでざっと抄訳してみた．["リーダブルコード"](http://www.amazon.co.jp/%E3%83%AA%E3%83%BC%E3%83%80%E3%83%96%E3%83%AB%E3%82%B3%E3%83%BC%E3%83%89-%E2%80%95%E3%82%88%E3%82%8A%E8%89%AF%E3%81%84%E3%82%B3%E3%83%BC%E3%83%89%E3%82%92%E6%9B%B8%E3%81%8F%E3%81%9F%E3%82%81%E3%81%AE%E3%82%B7%E3%83%B3%E3%83%97%E3%83%AB%E3%81%A7%E5%AE%9F%E8%B7%B5%E7%9A%84%E3%81%AA%E3%83%86%E3%82%AF%E3%83%8B%E3%83%83%E3%82%AF-Theory-practice-Boswell/dp/4873115655)的な視点も含まれており，Go以外の言語でも使えそう．

- [gofmt](http://golang.org/cmd/gofmt/)でコードの整形をすること
- [コメント](http://golang.org/doc/effective_go.html#commentary)は文章で書くこと．`godoc`がいい感じに抜き出してくれる．対象となる関数（変数）名で初めて，ピリオドで終わること

```go
// A Request represents a request to run a command.
type Request struct { ...
```

```go
// Encode writes the JSON encoding of req to w.
func Encode(w io.Writer, req *Request) { ...
```

- 外から参照されるトップレベルの識別子にはコメントを書くべき
- 通常の[エラー処理](http://golang.org/doc/effective_go.html#errors)に`panic`を使わないこと．errorと複数の戻り値を使うこと
- エラー文字列は他の出力で利用されることが多いので，（固有名詞や頭字語でない限り）大文字で始めたり，句読点で終わったりしないこと
    - 例えば，`fmt.Errorf("Something bad")`のように大文字で始めるのではなく，`fmt.Errorf("something bad")`のようにしておくことで，`log.Print("Reading %s: %v", filename, err)`としても，文の途中に大文字が入るようなことがなくなる
   
- エラーの戻り値を`_`で破棄しないこと．関数がエラーを返すなら，関数が成功したかをチェックすること．エラーハンドリングをして，どうしようもないときに`panic`とする
- パッケージのインポートは空行を入れることでグループとしてまとめるとよい

```go
import (
    "fmt"
    "hash/adler32"
    "os"

    "appengine/user"
    "appengine/foo"
        
    "code.google.com/p/x/y"
    "github.com/foo/bar"
)    
```

- `.`によるパッケージのインポートはテストで使える
    - 例えば，以下のように依存の問題で，テストしたいパッケージ名が使えない場合に使える

```go
package foo_test

import (
    . "foo"
    "bar/testutil"  // "foo"をimportしている
)
```

（上の場合，`bar/testutil`が`foo`パッケージをインポートしているため，テストファイルは`foo`パッケージにはなれない．`.`をつかって`foo`をインポートすると，このテストファイルが`foo`パッケージであるかのように見なすことができる．ただし，このようなケースを除いて`.`をつかったインポートは可読性が落ちるため使うべきではない）

- 通常の処理はなるべく浅いネストで記述すること．最初にエラー処理をネストして記述すること．これにより可読性が高まる．例えば，

```go
if err != nil {
    // エラー処理
} else {
    // 通常処理
}
```

のように書くのではなく，以下のようにする．

```go
if err != nil {
    // エラー処理
    return // or continue, etc.
}
// 通常処理       
```

- "URL"や"NATO"といった頭字語は大文字もしくは小文字で一貫して記述すること
    - 例えば，"URL"は"URL"もしくは"url"とすること，つまり"urlPony"か"URLPony"とする
- 1行の文字数に厳格な決まりはないが，長過ぎるのは避けるべき．同様に，読みやすさを犠牲にしてまで行を短くしようとするのも避けるべき．コメントは見やすさを考慮して80文字以内に抑えるべきである
- 複数の単語から成る名前をつけるときはアンダースコアを使わずに，MixedCapsまたはmixedCapsのように単語の先頭だけ大文字を用いる．外部から参照されない定数は，mixedCapsとし，最初の単語の先頭を小文字にする
- 関数の戻り値に同じ型が2つ以上含まれる，もしくはコンテキストから返り値が推測できないような場合は戻り値に名前をつけるとよい．例えば，

```go
func (f *Foo) Location() (float64, float64, error)
```

と書くより，以下のように名前をつけたほうが分かりやすい

```go
func (f *Foo) Location() (lat, long float64, err error)
```

- 数行程度の小さな関数であれば，戻り値に名前は必要ない．中規模な関数であれば，戻り値には明示的に名前をつけるべき
- [パッケージのコメント](http://golang.org/doc/effective_go.html#commentary)は，空行なしでパッケージ名のすぐ上にかくこと

```go
// Package math provides basic constants and mathematical functions.
package math
```

```go
/*
Package template implements data-driven templates for generating textual
output such as HTML.
....
*/
package template
```

- [パッケージ名](http://golang.org/doc/effective_go.html#package-names)でパッケージの内部を参照することになるので，その内部でパッケージ名を使った変数名などをつくらなくてよい
    - 例えば，`chubby`という名前のパッケージを作ってる場合に，`ChubbyFile`という型は必要ない．このパッケージを使うユーザは`chubby.ChubbyFile`などと書くことになる．代わりに`File`とすれば，`chubby.File`とシンプルになり，可読性も落ちない
- メソッドのレシーバの名前は，それ自体を反映したものとすること
    - 普通は型名の省略形とする（例えば，"Client"なら"c"や"cl"）
    - "me"や"this"，"self"といった一般的な名前は使うべきではない
    - 一貫した名前を使うこと．例えば，一度"c"としたら，他の関数でも"c"をつかうこと．"cl"としない
- Goが初めての場合は，メソッドのレシーバを値型にするのか，ポインタ型にするのかを判断するのは難しい．迷った場合はポインタ型にすればよいが，小さな変更の少ないStructや基本型の値の場合は効率的な視点で値型にするのがよい．以下にいくつかのルールを列挙する．
    - もしレシーバがmapや関数，chanであれば，ポインタを使わないこと
    - もしレシーバがsliceでメソッドがそれをresliceやreallocateしないのであれば，ポインタを使わないこと
    - もしメソッドがレシーバに変更を加えるのであれば，ポインタを使うこと
    - もしレシーバが大きなstructやarrayであれば，ポインタを使うこと
    - もしレシーバがarrayやsliceでその要素がポインタであれば，ポインタを使うのがよい
    - 最後に，迷ったらポインタを使うこと
- テストがこけるときには，何が悪いのか，入力は何か，期待した結果は何か，実際の結果は何かを出力するべき
    - 例えば，典型的なGoのテストはこける際に以下のような出力をする

```go
if got != tt.want {
    t.Errorf("Foo(%q) = %d; want %d", tt.in, got, tt.want)    // or Fatalf, if test can't test anything more past this point
}
```

（順番は`実際の値!=期待値`で，`Errorf`の出力も同じ順番になっている．いくつかのテストフレームワークは，この逆で書くことを奨励しているが，Goの場合はこの順番とする）

- ヘルパー関数を使い，異なる入力に対するテストをする場合は，その呼び出しを異なる`TestFoo`関数でラップすれば，その名前でテストが落ちる．例えば以下のようにする

```go
 func TestSingleValue(t *testing.T) { testHelper(t, []int{80}) }
 func TestNoValues(t *testing.T) { testHelper(t, []int{}) }
```

（とにかく，将来コードをデバッグするひとへ丁寧な出力を提示するのは書き手に責任がある）

- 記述量が多い場合は，[Table Driven Test](https://code.google.com/p/go-wiki/wiki/TableDrivenTests)を使うことを考えるとよい
- 変数名は，短いほうがよい．得にスコープが狭い場合などは短くする．例えば，`lineCount`より`c`，`sliceIndex`より`i`が好ましい．以下に基本的なルールを列挙する
    - 変数がその宣言から離れた場所で使われるのであれば，説明的な名前にする
    - グローバル変数は，説明的な名前にする
    - メソッドレシーバは，1，2文字の短い名前にする
    - ループ変数は1文字（`i`や`r`）の短い名前にする

## SoundCloundの場合

SoundCloudは上を少し改良して利用している．

- 曖昧な場合や可読性が大きく高まる場合を除いて，名前付き返り値は使わないこと
- 必要な場合（`new(int)`や`make(chan int)`）や事前に割り当てるサイズが分かっている場合（`make(map[int]string, n)`や` make([]int, 0, 256)`）を除いて，`make`や`new`を使わないこと
- 番兵（sentinel value）には，`bool`や`interface{}`よりも`struct{}`を使うこと
    - 例えば，`map[string]struct{}`や`chan struct{}`
- パラメータが多く，1行が長くなる場合は，改行すること．例えば，

```go
func process(dst io.Writer, readTimeout,
    writeTimeout time.Duration, allowInvalid bool,
        max int, src <-chan util.Job) {
    // ...
}
```

とするのではなく，以下のようにする．

```go
func process(
    dst io.Writer,
    readTimeout, writeTimeout time.Duration,
    allowInvalid bool,
    max int,
    src <-chan util.Job,
) {
    // ...
}
```

同様に以下のように要素を割り当てる場合も，

```go
f := &Foo{} // or, even worse: new(Foo)
f.Site = "zombo.com"
f.Out = os.Stdout
f.Dest.Key = "gophercon"
f.Dest.Value = 2014
```

とするのではなく，以下のようにする．

```go
f := foo.New(foo.Config{ 
    Site: "zombo.com", 
    Out:  os.Stdout, 
    Dest: conference.KeyPair{ 
    Key:   "gophercon",
    Value: 2014,
    },
})
```
