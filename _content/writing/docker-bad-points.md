+++
date = "2015-02-17T23:32:16+09:00"
title = "Dockerの諸問題とRocket登場の経緯"
+++

2014年の後半あたりからDocker，Docker Inc.への批判を多く見かけるようになった（もちろんもともと懸念や嫌悪を表明するひとはいた）．それを象徴する出来事としてCoreOSチームによる新しいコンテナのRuntimeである[Rocket](https://github.com/coreos/rocket)のリリースと，オープンなアプリケーションコンテナの仕様の策定を目指した[App Containerプロジェクト](https://github.com/appc/spec)の開始があった．

- [CoreOS is building a container runtime, Rocket](https://coreos.com/blog/rocket/)

批判は，セキュリティであったり，ドキュメントされていない謎の仕様やバグだったり，コミュニティの運営だったり，と多方面にわたる．これらは具体的にどういうことなのか？なぜRocketが必要なのか？は具体的に整理されていないと思う．これらは，今後コンテナ技術を使っていく上で，[オーケストレーション](http://deeeet.com/writing/2014/12/01/docker-link-pattern/)とかと同じくらい重要な部分だと思うので，ここで一度まとめておきたい．

なお僕自身は，コンテナ技術に初めて触れたのがDockerであり，かつ長い間Dockerに触れているので，Docker派的な思考が強いと思う．またセキュリティに関しても専門ではない．なので，以下の記事はなるべく引用を多くすることを意識した．また，あくまで僕の観測範囲であり，深追いしていないところもある，気になるひとは自分で掘ってみて欲しい．

## セキュリティ問題

Dockerを使ったことがあるひとならわかると思うがDockerを使うにはルート権限が必須である．デーモンが常に動いており，それにクライアントがコマンドを発行するアーキテクチャになっているので，Dockerコンテナが動いているホストでは常にルートのプロセスが動き続けることになる．クライアントとデーモンはHTTPでやりとりするため，外部ホストからコマンドを叩くこともできてしまう．

これは怖い．コンテナはカーネルを共有しているので，もし特権昇格の脆弱性であるコンテナがハイジャックされたら，他の全てのコンテナと**ホストも**攻撃されることになる（[Container Security: Isolation Heaven or Dependency Hell | Red Hat Security](https://securityblog.redhat.com/2014/12/17/container-security-isolation-heaven-or-dependency-hell/)）．

実際Docker 1.3.1以前のバージョンでは脆弱性も見つかっている．

- [CVE-2014-6407](http://web.nvd.nist.gov/view/vuln/detail?vulnId=CVE-2014-6407)
- [CVE-2014-6408](http://web.nvd.nist.gov/view/vuln/detail?vulnId=CVE-2014-6408)

### docker pullは安全なの？

上記の脆弱性では悪意のあるイメージによる攻撃が指摘されており，攻撃を受けやすいのは`docker pull`で外部からイメージを取得/展開するところである．ではここはちゃんと安全になっているのか？答えは「No」で，あまりよろしくないモデルになっており，よく批判されるところでもある．

- [Docker Image Insecurity · Jonathan Rudenberg](https://titanous.com/posts/docker-insecurity)

これは[Flynn](https://flynn.io/)の開発者が現在の`docker pull`の危険性を指摘したブログ記事．要約すると，Dockerは署名されたManifestなるもので公式のDockerイメージの信頼性を確認していると[主張している](https://blog.docker.com/2014/10/docker-1-3-signed-images-process-injection-security-options-mac-shared-directories/)がそれが全く動作していない，モデルとして危ないということを言っている．具体的には，

- イメージの検証は，`[decompress] -> [tarsum] -> [unpack]`処理の後に実行されるが，そもそもここに脆弱性が入り込む余地がある
- キーはDockerのコードには存在しておらず，イメージをダウンロードする前に[CDNからHTTPSで取得する](https://github.com/docker/docker/blob/0874f9ab77a7957633cd835241a76ee4406196d8/trust/trusts.go#L38)ようになっており，これは...

この問題を回避する方法が以下で紹介されている．

- [Before you initiate a "docker pull" | Red Hat Security](https://securityblog.redhat.com/2014/12/18/before-you-initiate-a-docker-pull/)

ここで紹介されているのは`docker pull`を使わない方法．具体的には，信頼できるサイトから，イメージの`.tar`ファイルをダウンロードして，Checksumがあればそれをチエックしたうえで，`docker load`でそれを読み込むという方法．

また，Dockerfileの`FROM`でも同様の問題が発生する．ので，ちょっとのタイポで異常なイメージがダウンロード/展開される危険がある．これを回避するためにそもそも[index.docker.io](https://registry.hub.docker.com/)へのアクセスも禁止してしまおうという方法も紹介されている．具体的には，`/etc/hosts`を以下のようにしてしまう．

```
127.0.0.1 index.docker.io
```

## Dockerfile問題

Dockerfileには，なんでこれができないの？やハマりどころが多い．

なんでこれができないの？で一番有名だったのが，Dockerfileが`Docekerfile`という名前しかちゃんと使えなかった問題がある．これは現時点で最新のバージョン1.5で解決された（[Docker 1.5の変更点](http://deeeet.com/writing/2015/02/11/docker-1_5/)）．それ以外にも，`INCLUDE`によるDockerfileの分割（[#735](https://github.com/docker/docker/issues/735)）や，`FROM`の複数指定（[#5726](https://github.com/docker/docker/issues/5726)）など，なんでこれできないのだろうということが多々ある．

またDockerfileはハマりどころも多い．一番ハマるのがCacheで，どういうときにCacheされるのか全く分からない．いつCacheが無効になるか分からずにビルドし直しでうおー！となったひとは多いと思う（[Gotchas in Writing Dockerfile](http://kimh.github.io/blog/en/docker/gotchas-in-writing-dockerfile-en/)）．他にも環境変数の挙動がおかしなときもある．

これらはバージョンが上がるに連れて解決されていくであろう問題だとは思う．が以下に関しては慎重にならないといけない．

### このDockerfileから10年後も同じDockerイメージができるの？

- [Gregory Szorc's Digital Home | Deterministic and Minimal Docker Images](http://gregoryszorc.com/blog/2014/10/13/deterministic-and-minimal-docker-images/)

よく言われているように答えは「No」．Dockerはコンテナ内部で起動するデーモン（e.g., PostgresSQLやRedis）は特定のバージョンを使うかを固定できるが，それが依存するライブラリやパッケージに関しては何もできない．Dockerfileを書いたことがある人ならわかると思うが，必ず`apt-get update`を書くので．

これに関しては，`go get`と同じ批判かなと思う．セキュリティ的にも最新のライブラリやパッケージが使われるにこしたことはないと思うし，またどれだけちゃんとテストするか，にもつながると思う（もちろん皆が皆それができる環境ではないからこそこういう批判が登場するのだが）

その一方でソフトウェアのインストールや設定の知識というのは，ChefやPuppet，Ansibleのようなツールに依然として存在しているし，今後もしばらくは必須になる．DockerfileのようなDockerのみでしか使えないものに依存するのは危ない．[Packer](https://www.packer.io/)は当初からその問題を解決しようとしている．詳しくは[@mitchellh](https://github.com/mitchellh)氏がHNの議論で詳しく語っており，軽く翻訳したので，そちらを参考にしてほしい．

- [DockerイメージのビルドにPackerを使うべき理由](http://deeeet.com/writing/2014/03/03/why-building-docker-by-packer/)

## Registry問題

- [Rebuild: 79: Deep Learning Anime (Naoya Ito)](http://rebuild.fm/79/)

Docker Registryもなかなかの嫌われものである．自分としては便利に使わせてもらっているが，不満はいくつかある．

まず，DockerHub．上述した`docker pull`の問題のように，セキュリティ等に関しては完全にDockerHubを信用しないといけない．Automated buildは便利だけど，時にPending地獄に陥りビルドが始まらず何もできなくなるときがある．リリースがDockerHubの安定性に左右されるのはあまり良い状態ではない．Post/Preフックで簡単なスクリプトを動かすこともできない．

では，[docker/docker-registry](https://github.com/docker/docker-registry)を使って自分で運用するのか．これも実際に運用したひとの辛い話しか聞かない（でかいイメージpushしたら死ぬとか）．立ち上げるのは簡単だが，一番大切な認証機構を準備するのに一苦労必要だったりする．

絶対自分で運用したくないから外部のプライベートレジストリサービス，例えば[Quay.io](https://quay.io/)など，を見ているが，ちゃんと使おうと思うと有料の壁にぶつかる（ただQuay.ioは機能的にも面白いし，CoreOSに買収されてるので期待感はあり，現時点では良い選択かなと思っている）．


## コンテナイメージの仕様問題

「Dockerがホストを抽象化しDockerさえあればどこでもイメージを起動できる」というのはDockerを使うことの利点として語られることだけど，別の見方をすればDockerがないと何もできないうことになる．["boycott docker"](http://www.boycottdocker.org/)はDockerのことをまるでDockerOSだと批判し，ベンダーロックインに陥る危険性を仮想化技術との比較で語っている．

そういうこともあり，統一的なコンテナイメージの仕様を作ろうという流れは以前からあった（つまり，誰でもコンテナのRumtimeを作れるようにしようと）．が，それに対して最近になるまでちゃんとした仕様を作るということをしていなかった．

## Docker Inc.の方向性問題

- [Why Docker and CoreOS split was predictable – Daniel With Music](http://danielcompton.net/2014/12/02/modular-integrated-docker-coreos)

僕はこの問題を追っていて，OSSだけど企業は企業なんだなあということを実感した．Dockerはもはや単にコンテナのRumtimeというコンポーネントでない．Dockerはプラットフォームを目指している．それは[DockerCon EU 2014](http://europe.dockercon.com/)で発表された各ツール群を見れば明らかである（[Announcing Docker Machine, Swarm, and Compose for Orchestrating Distributed Apps | Hacker News](https://news.ycombinator.com/item?id=8699957)）．これは企業としては当たり前の考え方だし，間違っているとも思わない．コミュニティの意向も間違いなくある．

が，Dockerをコンポーネントとして見ていたCoreOSのようなチームは，何でやねんとはなる．上で紹介したようなセキュリティなど今すぐにでも解決するべき問題がたくさんあるのにも関わらず，またDockerが進もうとしている領域は既に他のツールが解決しているのにも関わらず... これがRocketという新しいRumtimeの登場につながる．

## Rocketとは何か

- [CoreOS 共同創設者 Alex Polvi が語る: コンテナ、Rocket と Docker の比較ほか](https://jp.linux.com/news/linuxcom-exclusive/426261-lco2015021001)
- [What is Rocket and How It’s Different Than Docker | Century Link Labs](http://www.centurylinklabs.com/interviews/what-is-rocket-and-how-its-different-than-docker/)
- [#138: Rocket, App Container Spec, and CoreOS with Alex Polvi - The Changelog](http://thechangelog.com/138/)

まず，[App Container](https://github.com/appc/spec)という標準的なコンテナの仕様が作られ始めた．これにより，コンテナイメージの仕様問題（Dockerによるベンダーロックイン問題）を解決しようとしている．DockerイメージからACIを作る，ACIからDockerイメージを作れるようなツールも作成している．

次に[CoreOS/Rocket](https://github.com/coreos/rocket)は，その標準的なコンテナを動かすためのRuntimeである．App ContainerとRocketのレポジトリが分かれているのは，あくまでRocketは実装の1つであることを意図していると思う．DockerとRocketの違いは，ブラウザで言うところのChromeとFirefoxの違いだと思えばよい．

直近のRocketはDockerでも得にヤバいと言われている部分を解決した．

- ルート権限のデーモンとクライアントのアーキテクチャの廃止（誤解があったので追記．デーモンが動き続けていないというだけで実行そのものにはルート権限が必要です．常に動いているのとコンテナを起動しているときだけ動いているのは大きく違う）
- 安全なイメージの配布モデルの作成

内部を詳しくは見れていないが，他のCoreOSツールと同様に既にあるテクノロジーをなるべく使うように作られている（例えば内部では，[systemd-nspawn](http://www.freedesktop.org/software/systemd/man/systemd-nspawn.html)を使っている）．少し触ってみたが，まだまだ使いやすさとは決して言えないレベル．

## まとめ

Dockerの何がすごかったか，コンテナという技術を一般の人にも使いやすくしたところだと思う．現時点でRocketにはDockerほどの使いやすさはない．が，かといってDockerのセキュリティ問題などを無視するわけにもいかない．

今年はKubernetesやMesosといった周辺ツールにひと盛り上がりがありそうだが，ここで書いた諸問題に関してもちゃんと注視しておきたい．

## 参考

- [The case against Docker - Andreas Jung](https://www.andreas-jung.com/contents/the-case-against-docker)
- [Docker vs Reality , 0 - 1 | Everything is a Freaking DNS problem](http://www.krisbuytaert.be/blog/docker-vs-reality-0-1)
- [boycott docker](http://www.boycottdocker.org/)
- [Lets review.. Docker (again) | Cal Leeming Blog](http://iops.io/blog/docker-hype/)
- [Gregory Szorc's Digital Home | Deterministic and Minimal Docker Images](http://gregoryszorc.com/blog/2014/10/13/deterministic-and-minimal-docker-images/)
- [Docker Image Insecurity · Jonathan Rudenberg](https://titanous.com/posts/docker-insecurity)
- [Before you initiate a "docker pull" | Red Hat Security](https://securityblog.redhat.com/2014/12/18/before-you-initiate-a-docker-pull/)
- [Container Security: Isolation Heaven or Dependency Hell | Red Hat Security](https://securityblog.redhat.com/2014/12/17/container-security-isolation-heaven-or-dependency-hell/)
- [How secure is Docker? If you're not running version 1.3.2, NOT VERY • The Register](http://www.theregister.co.uk/2014/11/25/docker_vulnerabilities/)
- [Vulnerability Summary for CVE-2014-6408](http://web.nvd.nist.gov/view/vuln/detail?vulnId=CVE-2014-6408)
- [Docker's just a bit dodgy, but ready for rollout says Gartner • The Register](http://www.theregister.co.uk/2015/01/12/docker_security_immature_but_not_scary_says_gartner/)
- [Dockerとコンテナをセキュアにする](http://www.infoq.com/jp/news/2013/10/docker-container-security)
- [After Docker: Unikernels and Immutable Infrastructure](https://medium.com/@darrenrush/after-docker-unikernels-and-immutable-infrastructure-93d5a91c849e)
- [LXC containers are awesome, but Docker.io sucks](http://iops.io/blog/lxc-application-containers-docker-initial-thoughts/)
- [CoreOS 共同創設者 Alex Polvi が語る: コンテナ、Rocket と Docker の比較ほか](https://jp.linux.com/news/linuxcom-exclusive/426261-lco2015021001)
- [What is Rocket and How It’s Different Than Docker | Century Link Labs](http://www.centurylinklabs.com/interviews/what-is-rocket-and-how-its-different-than-docker/)
- [Docker向けOSとか](http://www.slideshare.net/Yuryu/dockeros-tech-girl)
- [CoreOS - はじめてのRocket - Qiita](http://qiita.com/mopemope/items/9f163e4715a8bb5846e9)
