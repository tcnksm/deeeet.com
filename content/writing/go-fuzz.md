+++
date = "2015-12-21T00:25:30+09:00"
draft = true
title = "Go言語でファジング"
+++

この記事は[Go Advent Calendar 2015](http://qiita.com/advent-calendar/2015/go)の21日目の記事です．

今年もGoコミュニティーから多くのツールが登場した．その中でも異彩を放っていたのがGoogleのDynamic testing toolsチームの[@dvyukov](https://twitter.com/dvyukov)氏による[go-fuzz](https://github.com/dvyukov/go-fuzz)である．

`go-fuzz`はGo関数のファジングを行うツールである．このツールはとても強力で標準パッケージで100以上，[golang.org/x/](golang.org/x/)パッケージで40以上，その他を含めると300以上のバグを発見するという実績を残している（cf. [Trophies](https://github.com/dvyukov/go-fuzz#trophies)）．本記事ではそもそもファジングとは何か? そして`go-fuzz`でどのようにファジングを行うかについて解説する．

## ファジングとは?

- [Fuzz testing - Wikipedia, the free encyclopedia](https://en.wikipedia.org/wiki/Fuzz_testing)
- [ソフトウェアの脆弱性検出におけるファジングの活用](http://gihyo.jp/dev/feature/01/fuzzing)

「ファジング」とはソフトウェアのテスト手法である．対象となるソフトウェアにランダムなデータを大量に入力し意図しない挙動を検出する．

普通のソフトウェアは予期しないデータを受けても適切な処理，例えばエラーを返すなど，を行う．そしてそれはテストされる．しかし予期しない入力をすべてテストすることは難しい．適切に処理しているつもりであっても予期しないデータによりソフトウェアがクラッシュしてしまうことはありうる．このようなテストでファジングは光る．大量のランダムデータを入力し予期しないクラッシュを見つける．

ファジングの利点に以下が挙げられる．

- チープである
- バイアスがない

まずファジングは単純にランダムなデータを放り込むだけなので非常にチープな手法である．使うだけなら特別な知識は必要ない．次にランダムであるためテスターのバイアスがない．そのソフトウェアをつくっているひとほど思い込みが強くなってしまう（と思う）が，そのようなバイアスを排除することができる．

ファジングで入力となるデータは「ファズ」と呼ばれる．コマンドラインツールであれば引数や環境変数，ウェブサーバーであればHTTPリクエストである．ファジングではこのファズをいかに生成するのかが重要になる．完全にランダムにする，指定の範囲内で連続に値を変化させる，正常なデータの一部を変更させる．ある特定の制御文字列を対象にするといった手法がある．

## go-fuzzとは?

- [dvyukov/go-fuzz](https://github.com/dvyukov/go-fuzz)
- [GopherCon 2015: Dmitry Vyukov - Go Dynamic Tools](https://www.youtube.com/watch?v=a9xrxRsIbSU) ([Slide](https://talks.golang.org/2015/dynamic-tools.slide#1))

Go言語の関数に対してファジングを行うために開発されたのが`go-fuzz`である．`go-fuzz`はC/C++の[afl-fuzz](http://lcamtuf.coredump.cx/afl/)がベースになっている．

`go-fuzz`は完全にランダムなデータを入力するのではなく，正常なデータの一部を変更させランダムなデータを生成する．これにより単純にランダムな値で盲目的にテストをするのではなく，ある程度「ありそうな」データでテストを行うことができる．このためのデータセットをcorpusと呼び，`go-fuzz`はテストを繰り返しながらこのcorpusを成長させていく．

corpusはどのように成長するのか? `go-fuzz`は[AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree)を使い対象関数のテストのカバレッジ情報を取得する．カバレッジを上げるような入力が得られればそれをcorpusに登録する．これによりテストはより網羅的になる．

corpusは事前に与えることもできる．例えば対象とする関数の入力が画像データである場合は事前に幾つかの画像データを与えることができる．もしくはユニットテストなどで既にテストしている値を使うこともできる．

入力を繰り返し意図しない挙動が得られる（例えばpanicが起こる）と`go-fuzz`はそれを引き起こした入力とスタックトレースをファイルとして保存してくれる．開発者はその結果をもとにあらたにユニットテストを追加しコードを修正していく．

### 使いかた

`go-fuzz`によるファジングには以下の2つが必要である

- `Fuzz()`関数の準備
- `go-fuzz-buid`と`go-fuzz`の実行

まず`Fuzz()`関数は以下のような関数である．

```go
func Fuzz(data []byte) int
```

`data`は`go-fuzz`によって与えられるランダムな値である（ほとんどはinvalidな値である）．そしてこの値をテストしたい関数に入力として与える．`go-fuzz`はこの入力で関数が`panic`したりクラッシュしたり，メモリを割り当てすぎてhangしないかを監視する．

`Fuzz()`の返り値はcorpusの作成に使われる．以下の3つの値のうちどれかを返す．

- `1`- 入力がふさわしいデータであると考えられる場合（例えば関数がエラーを返さずに正常に処理された場合その入力はその関数にとってふさわしい入力であると考えることができる．ここから新たなランダムな値を生成すれば新たなエラーを発見できる可能性が高い）
- `-1` - 入力がカバレッジを上げるようなふさわしい入力であると考えられてもcorpusには追加したくない場合
- `0` - 上記以外の場合（例えばエラーが返った場合）


関数が書けたら以下で専用のバイナリをつくる．`zip`形式で出力される．

```bash
$ go-fuzz-build pkg
```

そして以下でテストを実行する．

```bash
$ go-fuzz -bin=pkg_fuzz.zip -workdir=dir 
```

`-bin`に上で生成したバイナリを指定する．テストは止めるまで無限に実行される．corpusやテストの結果は`-workdir`で指定するディレクトリに出力される．例えばプログラムをクラッシュさせるような入力が得られた場合は`crashers/`ディレクトリ内にその値とスタックトレースがファイルとして出力される．

ちなみに作成されたcorpusはバージョン管理システムに保存するべきである．そうすれば他の人もそれを再利用することができる．

## 使ってみる

言葉だけでは分かり難いので実際に使ってみる．例えば以下のような関数をテストしてみる．

```go
func CoolFunc(str string) error {

if len(str) < 1 {
    return fmt.Errorf("Input must not be empty")
}

if str[0] != 'A' {
    return fmt.Errorf("Input must start with A")
}

// Super cool processing.

// Bug hard to find !
if str == "ABCD" {
    panic("input must not be ABCD")
}

return nil
}
```

この関数は文字列を受け取ってめちゃめちゃクールな処理を行う．長さ0の文字列の入力は許容しない．また`A`で始まる文字列ではエラーが発生することまではわかっていおり適切にハンドルがされている．そして`ABCD`という値が入力されたときのみなぜか関数がクラッシュするというバグが混入しているとする．以下ではこのバグをファジングで発見する（当たり前だが普通はそもそもこのようなバグがあることは事前にわからない）．

まず`Fuzz()`は以下のようになる．


```golang
// +build gofuzz

func Fuzz(data []byte) int {
    if err := CoolFunc(string(data)); err != nil {
        return 0
    }
    return 1
}
```

エラーのときはすでにそれは適切にハンドルされているので`0`を返す．正常に動作した場合は`1`を返してcorpusの生成に利用するようにする．

ビルドしてファジングを実行する．

```bash
$ go-fuzz-build github.com/tcnksm-sample/go-fuzz
$ go-fuzz -bin=pkg-fuzz.zip -workdir=workdir
```

実行すると以下のような出力が得られる．

```bash
2015/12/20 21:23:54 slaves: 4, corpus: 3 (2s ago), crashers: 1, restarts: 1/0, execs: 0 (0/sec), cover: 0, uptime: 3s
```

`crashers:　1`とあり関数をクラッシュさせるような入力が得られたことがわかる．

`workdir/crashers`をみると以下のようなファイルが生成されている．

```bash
workdir/crashers
├── fb2f85c88567f3c8ce9b799c7c54642d0c7b41f6
├── fb2f85c88567f3c8ce9b799c7c54642d0c7b41f6.output
└── fb2f85c88567f3c8ce9b799c7c54642d0c7b41f6.quoted
```

まず拡張子がないファイルは具体的に関数をクラッシュさせた入力が含まれている（`.quoted`はその入力を""で囲ったもの）．この場合は`ABCD`が得られる．そして`.output`ファイルにはその際のスタックトレースが出力される．今回は以下のような出力が得られる．

```bash
$ cat workdir/crashers/fb2f85c88567f3c8ce9b799c7c54642d0c7b41f6.output
panic: input must not be ABCD

goroutine 1 [running]:
github.com/tcnksm-sample/go-fuzz.CoolFunc(0x820267e78, 0x4, 0x0, 0x0)
....
```

クラッシュが得られたどうするか? まずユニットテストにその入力を追加する．そしてコードを修正し適切にハンドルされるようにする．


## まとめ

自分のつくっているいくつかのツールでも試してみたが面白いバグを発見することはできなかった（特に複雑なことをしていないというものあるが..）．[ユーザの入力を受けるソフトウェアはすべてファジングするべき](https://blog.gopheracademy.com/advent-2015/go-fuzz/)という意見もある．会社で書いているソフトウェアにもファジングを導入していきたいと思う．ファジングはとにかく簡単なので導入は容易だと思う．

OSSのツールに対してファジングでバグを発見してコミットを行う実践的な方法は["go-fuzz github.com/arolek/ase"](https://medium.com/@dgryski/go-fuzz-github-com-arolek-ase-3c74d5a3150c#.2s399y3sg)が詳しい．

### 参考

- [dvyukov/go-fuzz](https://github.com/dvyukov/go-fuzz)
- [Fuzz testing - Wikipedia, the free encyclopedia](https://en.wikipedia.org/wiki/Fuzz_testing)
- [ソフトウェアの脆弱性検出におけるファジングの活用](http://gihyo.jp/dev/feature/01/fuzzing)
- [GopherCon 2015: Dmitry Vyukov - Go Dynamic Tools](https://www.youtube.com/watch?v=a9xrxRsIbSU) ([Slide](https://talks.golang.org/2015/dynamic-tools.slide#1))
- [american fuzzy lop (1.96b)](http://lcamtuf.coredump.cx/afl/)
- [DNS parser, meet Go fuzzer](https://blog.cloudflare.com/dns-parser-meet-go-fuzzer/)
- [Automated Testing with go-fuzz // Speaker Deck](https://speakerdeck.com/filosottile/automated-testing-with-go-fuzz)
- [go-fuzz github.com/arolek/ase](https://medium.com/@dgryski/go-fuzz-github-com-arolek-ase-3c74d5a3150c#.2s399y3sg)
- [Go Fuzz](https://blog.gopheracademy.com/advent-2015/go-fuzz/)
