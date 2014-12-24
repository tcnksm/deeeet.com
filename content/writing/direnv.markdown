---

title: 'DotenvではなくDirenvを使う'
date: 2014-05-06
comments: true
categories: 
---

[Dotenv](https://github.com/bkeepers/dotenv)は，`.env`ファイルから環境変数を読み込むためのツール．他人には共有したくないパスワードやキーなどを`.env`に環境変数として記述しておき，実行時にそれを読み込むといった使い方をする．例えば自分は，vagrantからDigitalOceanを使う際に，`CLIENT_ID`や`API_KEY`を`.env`に記述して`Vagrantfile`でそれを読み込むという使い方をしていた．

ただ，Dotenvは汎用性が低い．Dotenvを有効にするには，プログラム内から明示的に`Dotenv.load`を呼ぶ必要がある，もしくは，`dotenv`でプログラムを起動する必要がある．例えば，[test-kitchen](https://github.com/test-kitchen/test-kitchen)の[digitaloceanドライバー](https://github.com/test-kitchen/kitchen-digitalocean)を使う際には，vagrantの場合と同様に`CLIENT_ID`や`API_KEY`が必要になる．しかし，test-kitchenでユーザが直接触るのは`.kitchen.yml`であり，`Dotenv.load`を記述する余地はない（直接test-kitchenのソースコードに記述することはできるが…）．

## TL;DR

[Direnv](https://github.com/zimbatm/direnv)を使うと，任意のディレクトリ以下で`.envrc`に記述した環境変数を**明示的な読み込みなしで**有効にすることができる．つまり，Dotenvのような`Dotenv.load`の記述なしで使える．

また，Direnvはgoで書かれているので，Rubyなしでも使える．


## 使用例

以下は，簡単な使用例．特定のディレクトリ内で`$SECRET_KEY`を利用する場合を考える．

```bash
$ pwd
/User/tcnksm/test

$ echo $SECRET_KEY

$ direnv edit .
# $Editorが開くので "export SECRET_KEY=thisisalsoanokaysecret"を記述する
direnv: loading .envrc
direnv: export +SECRET_KEY

$ echo $SECRET_KEY
thisisalsoanokaysecret

$ cd ..
direnv: unloading

$ echo $SECRET_KEY

```

特定にディレクトリに移動するだけで，`.envrc`が読み込まれ`$SECRET_KEY`が有効になる．


## 使いどころ

少なくとも以下の2つの場面で利用できそう．

- 他人に共有したくない設定を`.envrc`に環境変数として記述する
- `bundle exec`しないように`.evnrc`に`$PATH`を追加する（[参考](http://mattn.kaoriya.net/software/lang/ruby/20140314032519.html)）


## インストール

OSXの場合は，brewでインストールできる．

```bash
$ brew install direnv
```

以下を`.zshrc`に記述しておく．

```bash
eval "$(direnv hook zsh)"
```

その他のインストール方法は[README](https://github.com/zimbatm/direnv)を参考に．

## まとめ

Direnvはkitchen-digitaloceanにDotenvのサポートのPull Requestを送った際の[コメント](https://github.com/test-kitchen/kitchen-digitalocean/pull/10)で教えて頂いた．こういうことはどんどんやっていくべきだと思った．
