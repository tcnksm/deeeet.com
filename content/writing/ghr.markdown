---

title: '高速に自作パッケージをGithubにリリースするghrというツールをつくった'
date: 2014-07-29
comments: true
categories: golang
---

[tcnksm/ghr・Github](https://github.com/tcnksm/ghr)

`ghr`を使えば，1コマンドでGithubにリリースページの作成とそこへのパッケージのアップロードが可能になる．複数パッケージのアップロードは並列で実行される．

## デモ

以下は簡単な動作例．

{%img /images/post/ghr.gif %}

上のデモでは，`v0.1.0`タグでリリースを作成し，`pkg/dist/v0.1.0`以下の6つのファイルを並列でアップロードしている（`ghr`を`ghr`でリリースしている）．1ファイルあたり，2.0M程度なのでまあま速いかと．アップロード結果は，[ここ](https://github.com/tcnksm/ghr/releases/tag/v0.1.0)で見られる．

## 背景

["Go言語のツールをクロスコンパイルしてGithubにリリースする"](http://deeeet.com/writing/2014/07/23/github-release/)

上で書いたように`curl`使って頑張ってAPIを叩いていたが，やっぱシェルスクリプトは嫌だし，アップロードが遅い．

Githubへのリリースを行う専用ツールで[aktau/github-release](https://github.com/aktau/github-release)というのもあるが，オプションが多くて，`curl`を使うのと大差ない．Descriptionなどは後でページから編集した方がよい．

とういことで，シンプルなインターフェース，かつ高速にリリース可能なものをつくった．

## 使い方

事前準備として[GithubのAPI Token](https://github.com/settings/applications)を環境変数にセットしておく．

```bash
$ export GITHUB_TOKEN="...."
```

あとは，プロジェクトのディレクトリで以下を実行するだけ．

```bash
$ ghr <tag> <package>
```

例えば，上のデモでは，以下を実行している．

```bash
$ ghr v0.1.0 pkg/dist/v0.1.0
--> Uploading: pkg/dist/v0.1.0/ghr_0.1.0_darwin_386.zip
--> Uploading: pkg/dist/v0.1.0/ghr_0.1.0_darwin_amd64.zip
--> Uploading: pkg/dist/v0.1.0/ghr_0.1.0_linux_386.zip
--> Uploading: pkg/dist/v0.1.0/ghr_0.1.0_linux_amd64.zip
--> Uploading: pkg/dist/v0.1.0/ghr_0.1.0_windows_386.zip
--> Uploading: pkg/dist/v0.1.0/ghr_0.1.0_windows_amd64.zip
```

ディレクトリを指定すれば，そのディレクトリ以下の全てのファイルが，ファイルを指定すれば，そのファイルのみがアップロードされる．

Go言語プロジェクトの場合は，[mitchellh/gox](https://github.com/mitchellh/gox)で並列クロスコンパイルすれば，もっと幸せになる．

## インストール

OSXの場合は，[Homebrew]()でインストールできる．

```bash
$ brew tap tcnksm/ghr
$ brew install ghr
```

他のプラットフォームの場合は，[リリースページ](https://github.com/tcnksm/ghr/releases)からパッケージをダウンロードして，`$PATH`の通ったところに配置する．

## 実装

Go言語で実装している．

並列アップロードはgoroutineを使って以下のように書いている．

```go
var errorLock sync.Mutex
var wg sync.WaitGroup
errors := make([]string, 0)

for _, path := range files {
    wg.Add(1)
    go func(path string) {
        defer wg.Done()

        fmt.Printf("--> Uploading: %15s\n", path)
        if err := UploadAsset(info, path); err != nil {
            errorLock.Lock()
            defer errorLock.Unlock()
            errors = append(errors,
            fmt.Sprintf("%s error: %s", path, err))
        }
    }(path)
}
wg.Wait()

```

## 今後

シンプルなインターフェースを保ちつつ，オプションを追加していく予定．

## まとめ

名前が[motemen/ghq](https://github.com/motemen/ghq)みたいになってしまったのすいません（Github用のツール，かつCLIで使うことを考慮して短い名前にすると自然と...）．

バグや意見は，GitHubの[Issue](https://github.com/tcnksm/ghr/issues)もしくは，[@deeeet](https://twitter.com/deeeet)までお願いします．

### 参考

- [Go の並行処理 - Block Rockin’ Codes](http://jxck.hatenablog.com/entry/20130414/1365960707)
- [Go言語のツールをクロスコンパイルしてGithubにリリースする](http://deeeet.com/writing/2014/07/23/github-release/)
- [HomeBrewで自作ツールを配布する](http://deeeet.com/writing/2014/05/20/brew-tap/)
