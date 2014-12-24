---

title: '使いやすいシェルスクリプトを書く'
date: 2014-05-18
comments: true
categories: 
---

できればシェルスクリプトなんて書きたくないんだけど，まだまだ書く機会は多い．シェル芸やワンライナーのような凝ったことではなく，他のひとが使いやすいシェルスクリプトを書くために自分が実践していることをまとめておく．

## ヘルプメッセージ

書いてるシェルスクリプトが使い捨てではなく何度も使うものである場合は，本体を書き始める前に，そのスクリプトの使い方を表示する`usage`関数を書いてしまう．

これを書いておくと，後々チームへ共有がしやすくなる．とりあえず`usage`見てくださいと言える．また，あらかじめ書くことで，単なるシェルスクリプトであっても自分の中で動作を整理してから書き始めることができる．関数として書くのは，`usage`を表示してあげるとよい場面がいくつかあり，使い回すことができるため．

以下のように書く．

```bash
function usage {
    cat <<EOF
$(basename ${0}) is a tool for ...

Usage:
    $(basename ${0}) [command] [<options>]

Options:
    --version, -v     print $(basename ${0}) version
    --help, -h        print this
EOF
}
```

バージョンを書いたりもする．

```bash
function version {
    echo "$(basename ${0}) version 0.0.1 "
}    
```

## 出力に色をつける

ErrorやWarningによって出力の色を変えて出力を目立たせられると良い．コンソールの出力への色づけはエスケープシーケンスを利用する．基本の構文は以下．

```bash
\033[{属性値}m{文字列}\033[m
```

属性値を変更するだけで，文字色や背景色，文字種を変更することができる．自分は以下のような関数を準備して使う．

```bash
red=31
green=32
yellow=33
blue=34

function cecho {
    color=$1
    shift
    echo -e "\033[${color}m$@\033[m"
}
```

以下のように使う．

```bash
cecho $red "hello"
```
## 対話処理　

例えば，以下のようにユーザ名やパスワードを対話的に入力させることはよくある．

```bash
printf "ID: "
read ID

stty -echo
printf "PASSWORD: "
read PASSWORD
stty echo
```

これが何度も実行するスクリプトだったりすると，毎回入力させるのは鬱陶しい．環境変数で事前に設定できるようにしてあげると親切．

```bash
if [ -z "${ID}" ]; then
    printf "ID: "
    read ID
fi

if [ -z "${PASSWORD}" ]; then
    stty -echo
    printf "PASSWORD: "
    read PASSWORD
    stty echo
fi    
```

シェルを起動する度に環境変数を設定するのが鬱陶しいと言われたら["direnv"](http://deeeet.com/writing/2014/05/06/direnv/)を教えてあげる．

## サブコマンド（引数処理）

サブコマンドやオプションを持たせて処理を分岐したいことはよくある．引数処理をシェルスクリプトでやる場合は，`case`文を使う．例えば，第一引数をサブコマンドとする場合は以下のようにする．

```bash
case ${1} in

    start)
        start
    ;;

    stop)
        stop
    ;;

    restart)
        start && stop
    ;;

    help|--help|-h)
        usage
    ;;

    version|--version|-v)
        version
    ;;
    
    *)
        echo "[ERROR] Invalid subcommand '${1}'"
        usage
        exit 1
    ;;
esac
```

マッチ後の処理を関数にしておけばきれいに書けるし，関数の使い回しもできる．`|`を使えば，複数のマッチを書くことができる．何度も使うような処理には短縮コマンドを準備してあげると良い（例えば，`list`に対して`ls`など）．また，エラーの際には上で言及した`usage`を表示してあげるとより親切になる．

オプションを複数とる場合は，`while`で回す．例えば以下のようにする．

```bash
while [ $# -gt 0 ];
do
    case ${1} in

        --debug|-d)
            set -x
        ;;

        --host|-h)
            HOST=${2}
            shift
        ;;

        --port|-p)
            PORT=${2}
            shift
        ;;

        *)
            echo "[ERROR] Invalid option '${1}'"
            usage
            exit 1
        ;;
    esac
    shift
done
```

オプション引数は，そのときの第二引数とする．`set -x`はいちいち書いたり消したりせずに，`--debug`オプションで切り替え可能にしておくと，開発中にはとても捗る．






