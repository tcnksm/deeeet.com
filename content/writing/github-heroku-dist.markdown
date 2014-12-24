---

title: 'HerokuとGithubを使った統一的なツール配布'
date: 2014-08-07
comments: true
categories: golang
---

Go言語ではクロスコンパイルがとても簡単で，複数プラットフォーム向けのバイナリをつくってそれを配布するというのがさらっとできる．

単純にやるなら，

1. クロスコンパイルした各バイナリをzip等に固める
1. Github Releaseや[bintray](https://bintray.com/)，[Dorone.io](https://drone.io/)などにホストする

そして，ユーザには自分のプラットフォームに合ったものをダウンロード／展開してPATHの通ったところに置いてもらう．

開発者からすると，すごい簡単．ホストするまで完全に自動化できる．でも，ユーザからすると若干めんどくさい．

もっとツールを使い初めてもらうまでの敷居を下げたい．

## TL;DR

全プラットフォーム共通で以下のようにツールをインストールできるようにする．若干長いが1コマンド！

```bash
$ L=/usr/local/bin/ghr && curl -sL -A "`uname -sp`"  http://ghr.herokuapp.com/ghr.zip | zcat >$L && chmod +x $L
```

このような配布をHerokuとGithubを使ってできるようにする．

## 実例

このようなツール配布を行っている例はいくつかある．

- [heroku/hk](https://github.com/heroku/hk)
- [flynn/cli](https://github.com/flynn/flynn/tree/master/cli)

例えば，Herokuのhkは，以下のようにインストールできる．

```bash
$ L=/usr/local/bin/hk && curl -sL -A "`uname -sp`" https://hk.heroku.com/hk.gz | zcat >$L && chmod +x $L
```

## 動作の概要

Githubにリリースを作成し，各プラットフォーム向けのパッケージがホストされているとする．

動作の流れは以下のようになる．

1. ユーザがHerokuアプリに対してリクエストを投げる
1. アプリはリクエストに基づきプラットフォームを判定し，それに合ったGithub Release上のパッケージへのリダイレクトを返す
1. ユーザはプラットフォームに合ったパッケージをGithub Releaseから得る

## 具体的な動作

Githubリリースの作り方，ワンライナーの動作，Herokuアプリについて簡単に説明する．

### Github Release

まず，Github Releaseページに作成したパッケージをホストしておく．パッケージ名は以下のルールに従うようにする．

```bash
${NAME}_${VERSION}_${OS}_${ARCH}.zip
```
`NAME`はツール名，`OS`はプラットフォーム名，`ARCH`はプロセッサを指定する．すると，Github Release上のダウンロードURLは以下のようになる．

```bash
https://github.com/tcnksm/${NAME}/releases/download/${VERSION}/${NAME}_${VERSION}_${OS}_${ARCH}.zip
```

これは自動化できる（["高速に自作パッケージをGithubにリリースするghrというツールをつくった"](http://deeeet.com/writing/2014/07/29/ghr/)）．

### ワンライナー

ワンライナーでやっているのは，

1. 環境変数`L`にインストールしたいPATHを指定する
1. `curl`では，`-L`オプションでリクエストで`30X`の場合にリダイレクトするようにし，`-A`でユーザエージェントを指定する
1. `zcat`でzipを展開して`L`に吐き出す

ユーザエージェントは`uname`で指定する．`-s`オプションでシステム名（e.g., Darwin，Linux）を，`-p`オプションでプロセッサ（e.g., i386）を出力するようにする．

### Herokuアプリ

`curl`のアクセス先は，専用に立てたHerokuアプリになる．Heorkuアプリでは，ユーザエージェントを元にプラットフォームを判別し，Github Releaseページ上のパッケージにリダイレクトさせる．

アプリはGo言語で書いた．以下はその抜粋．

```go

func main() {
    http.HandleFunc("/"+os.Getenv("NAME")+".zip", binary)
}

func binary(w http.ResponseWriter, r *http.Request) {
    platform := guessPlatform(r.UserAgent())
    http.Redirect(w, r, binaryURL(platform), http.StatusTemporaryRedirect)
}

func binaryURL(platform string) string {
    return os.Getenv("BASE_URL") + "/download/" + os.Getenv("VERSION") + "/" + os.Getenv("NAME") + "_" + os.Getenv("VERSION") + "_" + platform + ".zip"
}

func guessOS(userAgent string) string {
    if isDarwin(userAgent) {
        return "darwin"
    }

    if isWindows(userAgent) {
        return "windows"
    }

    return "linux"
}

func guessArch(userAgent string) string {
    if isAmd64(userAgent) || isDarwin(userAgent) {
        return "amd64"
     }
     
     return "386"
}

func guessPlatform(userAgent string) string {
    userAgent = strings.ToLower(userAgent)
    return guessOS(userAgent) + "_" + guessArch(userAgent)
}

func isDarwin(userAgent string) bool {
    return strings.Contains(userAgent, "mac os x") || strings.Contains(userAgent, "darwin")
}

func isWindows(userAgent string) bool {
    return strings.Contains(userAgent, "windows")
}

func isAmd64(userAgent string) bool {
    return strings.Contains(userAgent, "x86_64") || strings.Contains(userAgent, "amd64")
}

```
[tcnksm/re-dist-ghr](https://github.com/tcnksm/re-dist-ghr)

Github ReleaseページへのリダイレクトURLは，バージョン名(`$VERSION`)やツール名（`$NAME`）を環境変数で指定しておき，それから組み立てるようにしている．

## 運用

新しいバージョンをリリースしたら，Herokuアプリの`$VERSION`環境変数を更新するだけなのでとても楽．

さらに言えば，Herokuアプリのセットアップは[Terraform](http://www.terraform.io/)を使っているので（["TerraformでHerokuアプリのセットアップ"](http://deeeet.com/writing/2014/08/04/terraform-heroku/)），設定ファイル書き換えて`terraform apply`するだけ．自動化できそう．

Github Release上のパッケージ名が上記のルールに従っていれば，誰でも環境変数を変えるだけで使える．興味があればForkで何でもいいので使ってください．

## 他のやりかた

もちろんOSXに向けてHomebrewレシピ，Debina系に向けてdebパッケージ，Red Hat系に向けてRPMパッケージがそれぞれ準備されているのが理想的．でも，個人開発だとそれを作る，メンテしていくコストが高い．

ただHomebrewのレシピは，クソ簡単なので準備してあげるとよい（["HomeBrewで自作ツールを配布する"](http://deeeet.com/writing/2014/05/20/brew-tap/)）．

## 参考

- [独自のDebパッケージやaptリポジトリを作ってみよう](http://sourceforge.jp/magazine/14/01/17/090000)
- [独自のRPMパッケージやyumリポジトリを作ってみよう](http://sourceforge.jp/magazine/14/01/10/090000)
