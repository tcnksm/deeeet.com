---

title: 'Werckerの仕組み，独自のboxとstepのつくりかた'
date: 2014-10-16
comments: true
categories:
cover_image: wercker.png
---

[Wercker](http://wercker.com/)はTravisCIやDrone.ioのようなCI-as-a-Serviceのひとつ．GitHubへのコードのPushをフックしてアプリケーションのテスト，ビルド，デプロイを行うことができる．

Werckerは，TravisCIのように，レポジトリのルートに`wercker.yml`を準備し，そこに記述された実行環境と実行コマンドをもとにテスト/ビルドを走らせる．

Werckerには，その実行環境をbox，実行コマンド（の集合）をstepとして自作し，あらかじめWercker Directoryに登録しておくことで，様々なテストからそれらを呼び出して使うという仕組みがある．実際，Werkcerで標準とされているboxやstepも同様の仕組みで作成されている（[wercker · GitHub](https://github.com/wercker)）．

今回，WerkcerでのGolangのCross-compileとリリースのために，いくつかboxとstepを自作した．

- [tcnksm/wercker-box-gox](https://github.com/tcnksm/wercker-box-gox)
- [tcnksm/wercker-step-ghr](https://github.com/tcnksm/wercker-step-ghr)
- [tcnksm/wercker-step-zip](https://github.com/tcnksm/wercker-step-zip)
- [tcnksm/wercker-step-gox](https://github.com/tcnksm/wercker-step-gox)
- [tcnksm/wercker-step-goveralls](https://github.com/tcnksm/wercker-step-goveralls)

これらの作り方を簡単にまとめておく．まず，大まかなWerckerの仕組み説明し，次に具体的なboxとstepの作り方をそれぞれ説明する．

## Werckerの仕組み

Werckerには**pipeline**という概念がある．pipelineは，**Build**フェーズと**Deploy**フェーズに分けられ，フェーズは複数の**step**で構成される．すべてのフェーズは1つの**box**と呼ばれる環境上で実行される．

![](http://f.cl.ly/items/2O3V2n3A1n2d3u3S363D/wercker_pipeline.png)

[How wercker works](http://blog.wercker.com/2013/07/12/How-wercker-works.html)

1つのpipelineは1つの`wercker.yml`に記述する．例えば，以下のようにBuildフェーズとDeployフェーズ，それらの具体的なstepを記述する．

```yaml
box: box
build:
  steps:
    - stepA
    - stepB
deploy:
  steps:
    - step1
    - step2
```

### Buildフェーズ

Buildフェーズは，GitHubやBitbucketへのコードのpushを契機に始まり，アプリケーションのビルド，テスト，コンパイルを行う．生成物がある場合は，**Packege**としてDeployフェーズに渡す．


### Deployフェーズ

Deployフェーズは，Packegeを受け取り，それを外部サービスへデプロイする．例えば，Webアプリケーションであれば，Herokuへデプロイし，バイナリであれば，[Github Release](https://help.github.com/articles/creating-releases/)や[bintray.com](https://bintray.com/)へリリースする．


### box

各フェーズはboxと呼ばれる同一の環境上で実行される．boxはOSと一連のパッケージがインストールされたVMである．例えば，rubyがインストールされたbox，Golangがインストールされたboxなどがある．

boxはWerckerが提供するもの，もしくは自分でプロビジョニングを定義してWercker Directoryに登録したものを利用することができる．

例えば，Werckerが提供するGolangの実行環境が整ったboxを使いたい場合は，以下のように`werker.yml`を記述する．

```yaml
box: wercker/golang
```

### Step

フェーズを構成するのが複数のstepであり，stepは名前がつけられた一連のコマンドの集合である．

stepは，Werckerが提供するもの，自分で定義してWercker Directoryに登録したもの，もしくは`script`として`wercker.yml`に直接定義したものを使うことができる．

例えば，Jekyllで静的サイトを生成するBuildフェーズは以下のように`wercker.yml`を記述する．

```yaml
build:
  - bundle-install
  - script:
    name: generate static site
    code: |-
      bundle exec jekyll build --trace --destination "$WERCKER_OUTPUT_DIR"
```

この場合`bundle-install`はWerckerが提供する標準のstepであり，bundlerのインストールや，Gemfileを元に依存gemのインストールを行う（[wercker/step-bundle-install](https://github.com/wercker/step-bundle-install/blob/master/run.sh)）．`script`は`generate static site`と名付けられたstepであり，`code`に実行したいコマンドを直接記述している．

### Services

アプリケーションによっては，テストの際にデータベースやメッセージキューを一緒に使いたい場合がある．このようなアプリケーションとは別のソフトウェアプロセスを使うために，Werckerではboxの他に**services**を準備することができる．

servicesも，標準のもの，もしくは独自で準備してWercker Directoryに登録したものを使うことができる．

例えば，データベースにMongoDB，メッセージキューにRabbitMQを使いたい場合は，`wercker.yml`に以下を記述する．

```yaml
box: wercker/ruby
services:
  - wercker/mongodb
  - wercker/rabbitmq
```

servicesには，環境変数を使ってアクセスすることができる．例えば，上の例の場合は，以下のような環境変数を使うことができる．

- `WERCKER_MONGODB_HOST`
- `WERCKER_MONGODB_PORT`
- `WERCKER_RABBITMQ_HOST`
- `WERCKER_RABBITMQ_PORT`


### Environmental Variables

Werckerは実行時に独自の環境変数を設定する（[Environmental Variables](http://devcenter.wercker.com/articles/steps/variables.html)）．例えば，`WERCKER_GIT_REPOSITORY`にGitのレポジトリ名を，`WERCKER_STEP_NAME`にstepの名前を設定する．これらは各stepから参照することができる．

環境変数は，Werckerのダッシュボードから独自の値を設定することもできる．これは，自分以外からは隠蔽できるので，例えば，外部サービスに接続するための`TOKEN`などを設定することができる．

### Packeageの受け渡し

BuildフェーズからDeployフェーズへのPackageの受け渡しには，`WERCKER_OUTPUT_DIR`ディレクトリを利用する．

Werckerでは，すべてのstepを`WERCKER_SOURCE_DIR`ディレクトリへの移動で始める．Buildフェーズでは，レポジトリのソースが，Deployフェーズでは，Buildフェーズで`WERCKER_OUTPUT_DIR`に出力されたPackageが`WERCKER_SOURCE_DIR`に配備される．

## boxのつくり方

まず，boxのつくり方を説明する． boxを自作する利点は，ビルド時間の短縮にある．プロビジョニングはBuildフェーズの途中でstepとして定義することもできるが，テストの度にそれを実行するのは時間がかかりすぎる．

boxの作成は，アプリケーションと同様にpipelineを作成して行う．boxを作成する流れは以下のようになる．

1. box専用のGithub（Bitbucket）レポジトリの作成
2. `wercker-box.yml`の作成
3. レポジトリをWerckerに登録
4. DeployフェーズにWercker directoryへの登録を指定

具体的なプロビジョニングは`wercker-box.yml`に記述する．boxのプロビジョニングにはBashスクリプト，もしくはChef，Puppetが使える．ここではBashスクリプトで説明する．他は以下を参考．

- [Creating your own boxes with Chef](http://devcenter.wercker.com/articles/boxes/chef.html)
- [Creating your own boxes with Puppet](http://devcenter.wercker.com/articles/boxes/puppet.html)

### wercker-box.yml

以下にシンプルな`wercker-box.yml`を示す．

```yaml
name: hello
version: 0.0.1
inherits: wercker/ubuntu12.04-webessentials@0.0.3
type: language
platform: ubuntu@12.04
description: Say hello world
keywords:
  - hello
    script: |
      sudo apt-get update -y
      sudo apt-get install -y hello
```

各項目を簡単に説明する．

- name
    - boxの名前．`werkcer.yml`でboxを指定する際に利用する．例えば，アカウント名が`tcnksm`である場合は，`tcnksm/hello`という名前で指定する．
- version
    - boxのバージョン．同じバージョンではWercker Directoryにデプロイできないので，boxを新しくする度にバージョンを上げる必要がある．バージョンを使ってboxを指定することもできる．例えば，`tcnksm/hello@0.0.1`のように指定できる．
- inherits
    - 継承するbox名．プロビジョニングはこのboxに対して行われる．基本的にはWerckerの標準boxを使うことになると思う．例えば, Golangの実行環境が整ったboxに対してプロビジョニングを行いたい場合は，`wercker/golang`を指定する．
- type
    - boxのタイプ．`main`か`service`を指定する．普通のboxであれば`main`，servicesとして使いたい場合は`service`とする．
- platform
    - プラットフォーム．現在（2014年10月）は，Ubuntu12.04のみしかサポートされていない．
- description，keyword
    - boxの簡単な説明とキーワード．これらはメタデータとしてWecker directoryに登録される．
- script
    - 実際のプロビジョニングを記述する．

他にもserviceを作成したい場合は，そのサービスにアクセスするための環境変数を`env`という項目で登録する必要がある．

### Wercker Directoryへの登録

あとは上で作成した`wercker-box.yml`をGithub（Bitbucket）のレポジトリに上げ，Werckerと連携する．

Werckerと連携したら，Deployフェーズの登録をする．登録は，settingsタブのDeploy targetsから行う．Targetには`Wercker Diretory`を指定する．ターゲットの名前は自分が分かりやすい名前をつければよい．

![](http://f.cl.ly/items/222d453f1R2w1F3a3o1V/Screen%20Shot%202013-07-08%20at%203.55.20%20PM.png)

これで，アプリケーションと同様にレポジトリへのPushを契機に，boxのプロビジョニングとWerckerディレクトリへの登録が継続的に行われるようになる．デプロイが完了したら，そのboxはすぐに別のpipelineから利用できる．

## stepのつくり方

次に，stepの作り方を説明する．stepを作成する利点としては，`wercker.yml`をシンプルに保つことができること，他で使い回しが出来ることなどが挙げられる．stepもわざわざ作成しなくても，scriptとして，直接コマンドを定義することができる．ただ，複雑なことをやろうとするとscriptは肥大化し，`wercker.yml`の可読性はどんどん下がる．

stepの作成も，pipelineを作成して行う．stepを作成する流れは以下のようになる．

1. step専用のGithub（Bitbucket）レポジトリの作成
2. `wercker-step.yml`の作成
3. `run.sh`の作成
3. レポジトリをWerckerに登録
4. DeployフェーズにWercker directoryへの登録を指定

`wercker-step.yml`にstepの定義，`run.sh`に実際に実行したいコマンドを記述する．

### wercker-step.yml

以下にシンプルな`wercker-step.yml`を示す．

```yaml
name: hello
version: 0.1.0
description: Say hello
kyewords:
  - hello
properties:
  first-name:
    type: string
    required: true
  last-name:
    type: string
```

各項目を簡単に説明する．

- name
    - stepの名前．`werkcer.yml`でstepを指定する際に利用する．例えば，アカウント名が`tcnksm`である場合は，`tcnksm/hello`という名前で指定する．
- version
    - stepのバージョン．同じバージョンではWercker Directoryにデプロイできないので，stepを新しくする度にバージョンを上げる必要がある．バージョンを使ってstepを指定することもできる．例えば，`tcnksm/hello@0.1.0`のように指定できる．
- description，keyword
    - stepの簡単な説明とキーワード．これらはメタデータとしてWecker directoryに登録される．
- properties
    - `run.sh` に渡す引数を定義する．引数は`wercker.yml`から指定できる．`required: true`により引数を必須にすることができ，指定されていない場合にstepを失敗させることができる．

`properties`に指定した引数は，環境変数として`run.sh`に渡される．例えば，上の例の場合は，以下のような環境変数に値が格納されることになる:

- `WERCKER_HELLO_FIRST_NAME`
- `WERCKER_HELLO_LAST_NAME`

このstepは`werkcer.yml`では，以下のように記述して利用する．

```yaml
steps:
  - tcnksm/hello:
    first-name: taichi
    last-name: nakashima
```

### シェルスクリプト書きたくない

stepは単に`run.sh`を起点にするだけなので，その中から`.js`や`.rb`を呼び出せばよい．ただ，boxにその言語環境が必ずしも準備されているわけではないので，stepの汎用性が下がるということに注意する必要がある．

### インストールが必要なコマンドを使いたい

`run.sh`からboxに依存することなく特別なコマンドを叩きたい場合がある．その場合は，インストールコマンドを直接書いてしまえばよい．

バイナリをあらかじめレポジトリに含めることもできる．例えば，自分が作成した[tcnksm/wercker-step-ghr](https://github.com/tcnksm/wercker-step-ghr)は`ghr`バイナリを`bin`ディレクトリに含めており，`run.sh`からそれを直接呼び出して使っている．

### Wercker Directoryへの登録

boxと同じようにWercker上でDeployフェーズを登録すればよい．デプロイが完了したら，すぐにboxはすぐに別のpipelineから利用できる．

## まとめ

肥大化した`wercker.yml`は扱いづらいので，これからも何かあればboxとstepは自作すると思う．

Wercker Directoryの仕組みは，DockerHubの仕組みに似ていて扱いやすい．というか，Werckerには`wercker-lab/docker`というboxが準備されていてDockerを使うことができる．次は，その辺で遊んでみようと思う．
