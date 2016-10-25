+++
date = "2016-10-25T09:26:51+09:00"
title = "Golangにおけるinterfaceをつかったテスト技法"
+++

最近何度か聞かれたので自分がGolangでCLIツールやAPIサーバーを書くときに実践してるinterfaceを使ったテスト手法について簡単に書いておく．まずはinterfaceを使ったテストの基本について説明し最後に自分が実践している簡単なテクニックをいくつか紹介する．

なおGolangのテストの基本については [@suzuken](https://twitter.com/suzu_v) さんによる[「みんなのGo言語」](https://www.amazon.co.jp/dp/477418392X) の6章が最高なので今すぐ買ってくれ！

## 前提

自分はテストフレームワークや外部ツールは全く使わない．標準の`testing`パッケージのみを使う．https://golang.org/doc/faq#Packages_Testing にも書かれているようにテストのためのフレームワークを使うことは新たなMini language（DSL）を導入することと変わらない．最初にそれを書く人は楽になるかもしれないが新しくプロジェクトに参入してきたひとにはコストにしかならない（Golang以外も学ぶ必要がある）．例えば自分があるプロジェクトにContributeしようとして見たこともないテストフレームワークが使われているとがっくりする．

とにかくGolangだけで書くのが気持ちがいい，に尽きる．

## テストとinterface

テストという観点からみた場合のinterfaceの利点は何か？ interfaceを使えば「実際の実装」を気にしないで「振る舞い」を渡すことができる．つまり実装の切り替えが可能になる．interfaceを使うことでいわゆる[モック](https://en.wikipedia.org/wiki/Mock_object)が実現できる．

## どこをinterfaceにするのか

interfaceはモックポイントと思えば良い．外界とやりとりを行う境界をinterfaceにする．外界との境界とは例えばDBとやりとりを行う部分や外部APIにリクエストを投げるClientである．他にも考えられるがとりあえずここをinterfaceにする．


## 実例

以下では簡単なAPIサーバーを書くとしてinterfaceによるテスト手法の説明を行う．このAPサーバーはDBとしてRedisを使うとする．

まずはDBのinterfaceを定義する．

```golang
type DB interface {
    Get(key string) string
    Set(key, value string) error
}
```

次に実際のRedisを使った実装を書く．例えば以下のように書ける．

```golang
type Redis struct {
    // 接続情報など
}

func (r *Redis) Get(key string) string 
func (r *Redis) Set(key, value string) error
```

main関数から呼び出すときのことを考えてコンストラクタを実装すると良い（必要な接続情報などが与えられなかった時，もしくは必要な初期化処理に失敗した時にエラーを返せる）．

```golang
func NewRedis() (DB, error)
```

ここで重要なのは実際の実装である`Redis`を返すのではなくinterfaceの`DB`を返すこと．サーバー側ではこのinterfaceを使う．

次にサーバーの実装は以下のようにする．

```golang
type Server struct {
     DB DB
}

func (s *Server) Start() error {
}
```

`Server`はinterfaceの`DB`を持ち内部の実装（例えばhandlerなど）ではこのinterfaceを利用する．

main関数は以下のように書ける．

```golang
func main() {
     redis, err := NewRedis()
     if err != nil {
         log.Fatal(err)
     }

     server := &Server{
         DB: redis,
     }

     if err := server.Start(); err != nil {
         log.Fatal(err)
     }
}
```

（main関数には他にもflagの処理や設定ファイルを読み込みそれを各コンストラクタに渡すという処理が考えられる）

では`Server`のテストはどうすれば良いか？例えば今であればDockerを使ってしまえば簡単に実際のRedisを準備できるかもしれない．それができない，容易ではない場合はモックを考える．以下のように`DB` interfaceを満たすモック実装を準備する．

```golang
type TestDB struct {
}

func (d *TestDB) Get(key string) string 
func (d *TestDB) Set(key, value string) error 
```

これを利用すれば`Server`のテストは以下のように書ける．

```golang
func TestServer(t *testing.T) {
     testDB := &TestDB{}

     server := &Server{
         DB: testDB,
     }    
}
```

`Server`が必要なのは`DB` interface（振る舞い）であり実際の実装は何でも良い．これで実際にRedisを準備することなく`Server`の動きをテストすることができる．

以上がinterfaceを使ったテスト手法の基礎である．ここではDBを例にしたが他にも外部APIとやり取りを行うClientなどにも応用できる．また今回はinterfaceから実装したがすでに実際の実装がある場合もそれに対応したinterfaceを定義してしまえば同様のテストを書くことができる．

## いくつかのテクニック

以下では自分が実践しているいくつかのテクニックを紹介する．

## 環境変数で切り替える

毎回全てのテストをモックにすれば良いわけではない．ちゃんと実際の実装によるテストも必要である．自分はこの切り替えに環境変数を使う．環境変数を使うのはCIとの相性が良いからである．

例えば以下のようなコンストラクタを準備する．

```golang

const (
     EnvTestDSN = "TEST_DSN"
)

func testDB(t *testing.T) (DB, func()) {
     dsn := os.Getenv(EnvTestDSN)
     if len(den) == 0 {
           t.Log("Use TestDB")
           return &TestDB{}, func() {}
     }

    db, err := NewPostgreSQL(dsn)
     if err != nil {
         t.Fatal(“NewPostgreSQL failed: ”,err)
      }

     return db, func() {
         pSQL := db.(*PostgreSQL)
         pSQL.DB.DropTable(&SplunkInfo{})
     }
}
```

環境変数として接続情報（`DSN`）が与えられた場合は実際の実装である`PosgreSQL`を返す．与えられない場合はモックの実装を返す．

ちなみに2つ目の返り値はDBをcleanupするための関数で呼び出し側では`defer`と一緒に使う（例えばDockerなどでephemeralなデータストアを使う場合）．

## 外部パッケージの一部をinterfaceとして切り出す

例えば外部のAPIを利用する場合は公式などが提供しているClientパッケージを使ってしまうのが手っ取り早い．特にAPIの場合はリクエストに制限があったり安易に呼び出せないものあるのでモックが大切になる．この場合は自分は必要な部分のみをinterfaceとして切り出すという方法をとる（他にもレスポンスを保存する[Symmetric API Testing](https://blog.gopheracademy.com/advent-2015/symmetric-api-testing-in-go/)という方法もある）．

例えばGitHubのAPIを使いたい場合は https://github.com/google/go-github を使うが，以下のように必要なものを切り出してしまう．そしてメインロジックではこのinterfaceを利用するようにする．

```golang
type GitHub interface {
    CreateRelease(ctx context.Context, opt Option) (string, error)
    GetRelease(ctx context.Context, tag string) (string, error)
    DeleteRelease(ctx context.Context, releaseID int) error
}
```

## Testing as Public API

["Advanced Testing with Go"](https://speakerdeck.com/mitchellh/advanced-testing-with-go) の発表を見てなるほどなあと思い実践始めたのはtest用の関数をAPIとして公開する方法．

すべてを`main`パッケージに実装している間は良いがある程度の規模になるとパッケージの切り出しが大切になる．`*_test.go`に記述した関数は別のパッケージからは参照できないためモックの実装をどこに書くかが問題になる（呼び出し側で何度も実装するのは非効率）．この方法は`testing.go`や`testing_*.go`といったファイルを準備し外部から参照可能なテスト用のヘルパー関数を提供する，つまりテスト関数もAPIとして提供してしまう方法である．

例えば以下のような関数を準備する．

```golang
func TestDB(t *testing.T) DB
```

```golang
func TestConfig(t *testing.T) *Config
```

これで呼び出し側でのテスト用のモックなどの再実装を防ぐことができる．

## まとめ

ただしやりすぎると可読性が下がるのでやりすぎには注意する必要がある．
