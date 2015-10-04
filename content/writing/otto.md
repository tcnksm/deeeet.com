+++
date = "2015-10-04T22:07:21+09:00"
title = "Hashicorp Ottoを読む"
cover_image = "otto.png"
+++

Hashicorpから2015年秋の新作が2つ登場した．

- [Otto - HashiCorp](https://hashicorp.com/blog/otto.html)
- [Nomad - HashiCorp](https://hashicorp.com/blog/nomad.html)

Ottoがなかなか面白そうなのでコードを追いつつ，Ottoとは何か? なぜ必要になったのか? どのように動作するのか? を簡単にまとめてみる．

バージョンは _0.1.0_ を対象にしている（イニシャルインプレッションである）

## Ottoとは何か?

公式はVagrantの後継と表現されている．が，それはローカル開発環境の構築**も**担っているという意味で後継であり，自分なりの言葉で表現してみると「OttoはHashicorpの各ツールを抽象化し開発環境の構築からインフラの整備，デプロイまでを一手に担うツール」である．ちなみにOttoという名前の由来は[Automationと語感が似ているからかつ元々そういう名前のbotがいた](https://twitter.com/zembutsu/status/648956697034096641)からとのこと．

## なぜOttoか?

なぜVagrantでは不十分であったのか? なぜOttoが必要だったのか? 理由をまとめると以下の5つである．

- 設定ファイルは似通ったものになる
- 設定ファイルは化石化する
- ローカル開発環境と同じものをデプロイしたい
- microservicesしたい
- パフォーマンスを改善したい 

まず各言語/フレームワークの`Vagrantfile`は似通ったものになる．`Vagrantfile`は毎回似たようなものを書く，もしくはコピペしていると思う．それならツール側が最も適したものを生成したほうがよい．Ottoは各言語のベストプラクティスな設定ファイルを持っておりそれを生成する．

そして`Vagrantfile`は時代とともに古くなる，つまり化石化する．秘伝のソースとして残る．Ottoは生成する設定ファイルを常に最新のものに保つ．つまり今Ottoが生成する設定ファイルは5年後に生成される設定ファイルとは異なるものになる（cf. ["Otto: a modern developer's new best friend"](http://blog.bennycornelissen.nl/otto-a-modern-developers-new-best-friend/)）

そしてローカル開発環境と同じものを本番に構築したい（Environmental parityを担保したい）．現在のVagrantでも`provider`の仕組みを使えばIaaSサービスに環境を構築することはできる．が本番に適した形でそれを構築できるとは言い難い．Ottoは開発環境の構築だけではなく，デプロイ環境の構築も担う．

時代はmicroservicesである．Vagrantは単一アプリ/サービスの構築には強いが複数には弱い．Ottoは依存サービスを記述する仕組みをもつ（`Appfile`）．それによりmicroserviceな環境を簡単に構築することができる．

そしてパフォーマンス．最近のVagrantはどんどん遅くなっている．例えば立ち上げているVMの状態を確認するだけの`status`コマンドは2秒もかかる．Ottoはパフォーマンスの改善も目的にしている．

## Ottoは何をするのか?

Ottoが行うことは以下の2つに集約できる．

- Hashicorpツールの設定ファイルとスクリプトを生成する
- Hashicorpツールのインストール/実行をする

Ottoの各コマンドと合わせてみてみると以下のようになる．

- `compile` - アプリケーションのコンテキスト（e.g., 言語やフレームワーク）の判定と専用の設定ファイルである`Appfile`をもとにHashicorpツールの設定ファイル（`Vagrantfile`やTerraformの`.tf`ファイル，Packerのマシンテンプレート`.json`）と各種インストールのためのシェルスクリプトを生成する
- `dev` - 開発環境を構築する．Vagrantを実行する
- `infra` - アプリをデプロイするためのインフラを整備する．例えばAWSならVPCやサブネット，ゲートウェイなどを設定する．[Terraform](https://terraform.io/)を実行する
- `build` - アプリをデプロイ可能なイメージに固める．例えばAMIやDocker Imageなど．[Packer](https://www.packer.io/)を実行する
- `deploy` - 作成したイメージを事前に構築したインフラにデプロイする．Terraformを実行する（OttoのデプロイはImmutable Infrastructureを嗜好する）

## Ottoがつくるインフラの基礎

Ottoには[Foundation](https://ottoproject.io/docs/concepts/foundations.html)という概念がある（`foundation`という言葉は生成される設定ファイルやディレクトリ名に登場する）．これはOttoが構築するインフラの基礎，本番環境にアプリケーションをデプロイするために重要となるレイヤーを示す．このFoundationの例としては，以下のようなものが挙げられる．

- [Consul](https://www.consul.io/)によるサービスディスカバリー 
- [Vault](https://vaultproject.io/)によるパスワード管理 (Future)
- [Nomad](https://nomadproject.io/)によるスケジューリング (Future)

このレイヤーはモダンなアーキテクチャーではBest Practiceとされつつも構築はなかなか難しい．OttoはVagrantでローカル開発環境を構築するとき，本番環境のインフラを整備するときにこのレイヤーの整備も一緒に行う．

## Ottoの設定ファイル

単純なことをするならばOttoには設定ファイルは**必要ない**．プロジェクトのルートディレクトリで`compile`を実行すれば言語/フレームワークを判定し，それにあった`Vagrantfile`とインフラを整備するためのTerraformの`.tf`ファイルなどを生成してくれる．

より複雑なことをしたければ不十分である．Ottoは専用の`Appfile`という設定ファイルでカスタマイズを行うことができる．`Appfile`は[HCL](https://github.com/hashicorp/hcl)で記述する．例えば，以下のように依存するサービスを記述することができる

```ruby
application {
    dependency {
        source = "github.com/tcnksm-sample/golang-web"
    }
}
```

他にも，言語のバージョンを指定したり，デプロイするIaaSサービスやその`flavar`（e.g., AWSだと現在`simple`と`vpc-public-private`がある．`simple`は最小限のリソースを使うのみでScalabilityや耐障害性などは犠牲にする．`vpc-public-private`だとprivateネットワークやNATなども準備する）を設定することができる．

基本は適切なデフォルト値と自動で判別される値が存在する．`Appfile`はそれを上書きするものである．公式の説明の仕方を借りると`Appfile`は「どのようにマシンを設定するのかを記述するのではなく，アプリケーションが何であるかを記述する」ものである．

## Ottoを読む

自分が気になった部分のソースコードを軽く読んでみる．

### 概要

上述したように，Ottoは各Hashicorpツールのバイナリを実行しているだけある．大まかには以下のようになる．

- `compile`
    - 依存サービスがある場合はそれらを全て`.otto`以下のディレクトリにfetchする（依存先も`Appfile`と`.ottoid`を持っている必要がある）
    - 各`Appfile`と言語/フレームワークを判別結果をマージして`.otto`ディレクトリ以下に各種設定ファイルを生成する
- コマンドごとに`otto/compiled`以下の決められたディレクトリ内の設定ファイルをもとにバイナリを実行する
    - e.g., `build`を実行するとPackerのマシンテンプレートである`.otto/compiled/app/build/template.json`が使われる


### コア

Ottoのコアは[https://github.com/hashicorp/otto/blob/v0.1.1/otto/core.go](https://github.com/hashicorp/otto/blob/v0.1.1/otto/core.go)にある．基本的にどのコマンドもここに到達する．やっていることは単純でコンテキストをもとに実行するべき設定ファイルを決めてそれを元にバイナリを実行するだけ．

以下をみると各バイナリをどのように実行しているかをみることができる．

- [https://github.com/hashicorp/otto/tree/v0.1.1/helper/vagrant](https://github.com/hashicorp/otto/tree/v0.1.1/helper/vagrant)
- [https://github.com/hashicorp/otto/tree/v0.1.1/helper/terraform](https://github.com/hashicorp/otto/tree/v0.1.1/helper/terraform)
- [https://github.com/hashicorp/otto/tree/v0.1.1/helper/packer](https://github.com/hashicorp/otto/tree/v0.1.1/helper/packer)



### インストーラー

バイナリがインストールされていなければコマンド実行直後にインストールが実行される．[https://github.com/hashicorp/otto/tree/v0.1.1/helper/hashitools](https://github.com/hashicorp/otto/tree/v0.1.1/helper/hashitools)にインストーラーが書かれている．以下の[bintray.com](bintray.com)のURLからzipをダウンロードして展開しているだけ．

```golang
url := fmt.Sprintf(
    "https://dl.bintray.com/mitchellh/%s/%s_%s_%s_%s.zip",
    i.Name, i.Name, vsn, runtime.GOOS, runtime.GOARCH)
```

（なんでmitchellhアカウントなのだろう...）

### 言語/フレームワークの判定

まず`compile`のときにアプリケーションの言語/フレームワークの判定する方法．これはHerokuのBuildpackに似たことをする．アプリケーションに特有なファイル，例えばRubyならば`Gemfile`，が存在するかをチェックする．判定のルールは以下のような`struct`で保持する．

```golang
detectors := []*detect.Detector{
    &detect.Detector{
        Type: "go",
        File: []string{"*.go"},
    },
    ....    
```

そして以下で判別する．単純．

```golang
func (d *Detector) Detect(dir string) (bool, error) {
    for _, pattern := range d.File {
        matches, err := filepath.Glob(filepath.Join(dir, pattern))
        if err != nil {
            return false, err
        }
        if len(matches) > 0 {
            return true, nil
        }
    }
}
```

`.hcl`ファイルで`Detector`を書いて`~/.otto.d/detect`以下に置い読み込むというロジックを見かけたので自分で好きな判定ロジックを定義できるかもしれない．

### 設定ファイル/インストールスクリプトはどこにあるのか?

["ハシコープは人類を含む全ての概念をバイナリにして配布した"](https://twitter.com/kenjiskywalker/status/648884208572600323)

[https://github.com/hashicorp/otto/tree/v0.1.1/builtin/app](https://github.com/hashicorp/otto/tree/v0.1.1/builtin/app)以下に各言語の`Vagrantfile`やpackerのマシンテンプレート，それらが呼び出すインストールスクリプトが存在する．そしてOttoはそれらを[go-bindata](https://github.com/jteeuwen/go-bindata)を使ってバイナリとして埋め込んでいる．`app.go`の先頭をみるとそのための`go generate`文が見える．

```golang
//go:generate go-bindata -pkg=goapp -nomemcopy -nometadata ./data/...
```

### 時代はシェルスクリプト

`Vagrantfile`のインストールスクリプト，Packerのマシンテンプレートが呼び出す`provisioner`のスクリプト，など全てがゴリゴリのシェルスクリプトで書かれている．`Dockerfile`以後，時代はシェルスクリプトになっている気がする．大変そう．

ちなみにデーモンの管理は`upstart`が使われている（cf. [https://github.com/hashicorp/otto/blob/v0.1.1/builtin/foundation/consul/data/common/app-build/upstart.conf.tpl](https://github.com/hashicorp/otto/blob/v0.1.1/builtin/foundation/consul/data/common/app-build/upstart.conf.tpl)）．


## まとめ

とりあえず何か始めたいと思うときは便利であるし，期待感はある．が，最後にこれはどうなるんだろうと思ったことをまとめておく．

設定ファイルをバイナリに含めたら変更が辛くなるのではないか? もし設定ファイルに不備があったらそれを修正して新しくバイナリをリリースしないといけなくなる．利用者は開発者なので問題はなさそうだけど，一度ダウンロードしたものをすぐにアップグレードしてくれるだろうか（一応利用しているバイナリが最新であるかそうでないかを判定し，古い場合には警告を出す[仕組み](https://github.com/hashicorp/go-checkpoint)はある）．Atlasを使ってファイルをホストする方式ではだめだったのか? boxを使うのはダメだったのか?（重いかな..）．

今のところ`compile`するたびに`.otto`ディレクトリは作り直される．同じ環境であることは担保するのは`.ottoid`ファイルしかない．これはどこまで非互換な変更を対処してくれるのか．ローカル開発環境は良いが，デプロイがぶっ壊れることはないだろうか.. （が，これはottoというよりはTerraformの問題な気もする）．


## 参考

- [HashiConf 2015 参加してきました＆KeyNoteまとめ](http://pocketstudio.jp/log3/2015/10/01/joined-hashiconf-2015-at-portland/)
