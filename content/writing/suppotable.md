+++
date = "2016-09-15T18:42:54+09:00"
draft = true
title = "Golangでサポートしやすいツールを書く"
+++

[みんなのGo言語](https://www.amazon.co.jp/dp/477418392X)に書いたように自分は現在社内向けのPaaSの開発と運用に関わっている．開発と運用だけではなくユーザのサポートも一緒に行っている．ユーザのサポートはHipChat上に専用の部屋を作り何かあればチームの誰かにPingしてもらうようにしている（例えば新しい機能などもそこでアナウンスしている）．


### Debug

- サポートで難しいのはユーザの目の前にいれないこと
- どのような環境にいてどのバージョンのツールを使っていて何をしようとしているのかetc
- 対話ではっきりとさせていくのは難しい [The XY Problem](http://xyproblem.info/)
- はじめからやる．途中から追加する気にならない

```golang
const EnvDebug = "DEBUG_XXX"

var Debug bool

func init() {
    if env := os.Getenv(EnvDebug); len(env) != 0 {
        Debug = true
    }
}

func Debugf(format string, args ...interface{}) {
    if Debug {
        fmt.Fprintf(os.Stdout, "[DEBUG] "+format+"\n", args...)
    }
}
```

### Runtime

`runtime`パッケージが持っている以下のような情報は基本的にデバッグ出力時に見れるようにする（[golang-stats-api-handler](https://github.com/fukata/golang-stats-api-handler)と同じ）．他にもそのツールのバージョン情報なども出力するようにする．

```golang
Debugf("GO Version: %s", runtime.Version())
Debugf("GO OS: %s", runtime.GOOS)
Debugf("GO Arch: %s", runtime.GOARCH)
Debugf("Num CPU: %d", runtime.NumCPU())
```

機械的に取れる情報はツールで取れるようにする．機械的には判断できないところをコミュニケーションで補う．

### Proxy


### Mask

ユーザのサポートはHipChatなどのChatサービスで専用の部屋を作りそこで行っている（新機能などのアナウンスもそこで行う）．緊急時には上述したデバッグを有効にして出力結果を貼ってもらうことが多い．しかしデバッグ情報にはTokenなど他人には共有するべきでない情報が入ってしまうこともある（例えばAPI Clientのリクエストボディを単純にDumpしたりしていると）．緊急時だと何も考えずにそれをチャットに貼り付けてしまうユーザもいるためよろしくない．これらはツールの提供側でなんとかするべきである．

例えば以下のような`mask`関数を準備している（`[PRIVATE DATA HIDDEN]`に変えてしまう）．

```golang
const HiddenMsg = "[PRIVATE DATA HIDDEN]"

// mask masks private infomation
func mask(input string) string {
    re := regexp.MustCompile(`"oauth_token":\s*"[^\,]*`)
    return re.ReplaceAllString(input, fmt.Sprintf(`"oauth_token":"%s"`, HiddenMsg))
}
```

API Clientだとこれくらい雑な方が複雑にならない．

### Lint
