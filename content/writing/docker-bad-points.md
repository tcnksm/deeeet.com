+++
date = "2015-02-14T23:32:16+09:00"
draft = true
title = "ここがヘンだよDocker"
+++

2014年の後半あたりからDocker，Docker Inc.への批判を多く見かけるようになった（もちろんもともと懸念や嫌悪を表明するひとはいた）．それを象徴する出来事としてCoreOSチームによる新しいコンテナのRuntimeである[Rocket](https://github.com/coreos/rocket)のリリースと，オープンなアプリケーションコンテナの仕様の策定を目指した[App Containerプロジェクト](https://github.com/appc/spec)の開始があった．

- [CoreOS is building a container runtime, Rocket](https://coreos.com/blog/rocket/)

批判は，セキュリティであったり，ドキュメントされていない謎の仕様やバグだったり，コミュニティの運営だったり，と多方面にわたる．これらは具体的にどういうことなのか？なぜRocketが必要なのか？は具体的に整理されていないと思う．これらは，今後コンテナ技術を使っていく上で，ある意味[オーケストレーション](http://deeeet.com/writing/2014/12/01/docker-link-pattern/)とかと同じくらい重要な部分であると思うので，ここで一度まとめておきたい．

なお僕自身は，コンテナ技術に初めて触れたのがDockerであり，かつ長い間Dockerに触れているので，Docker派的な思考が強いと思う．またセキュリティに関しても専門ではない．なので，以下の記事はなるべく引用を多くすることを意識した．また，あくまで僕の観測範囲であり，深追いしていないところも多い，気になるひとは自分で掘ってみて欲しい．

## 批判まとめ

「Dockerがホストを抽象化し，Dockerさえあればどこでもイメージを起動できる」というのはDockerを使うことの利点として語られることだけど，別の見方をすればDockerがないと動かせないということになる．

- [boycott docker](http://www.boycottdocker.org/)
    - Docker is vendor lock-in technology convenient for, and spreaded by cloud computing corporations.
    - Better than VMs?
        - どこでも動くの？
        - At least KVM, qemu, VMware and VirtualBox are not required to be executed under GNU/Linux
        - Docker images can be run only under dockerized GNU/Linux. Let's call it DockerOS. Moreover, as a rule, you will require specific Linux-kernel version compatible with provided images.
    - VMはVMのこと知ってるひとのものでは？
        - In the case of KVM, software developer hardly knows if his program is running under either real hardware, or virtual one.
        - Software developers forced to vendor lock-in their software, forced to make it workable under strict restrictions like single process per container.
    - Plays well with others?
    - 特定の言語やフレームワーク，パッケージシステムなどが必要ない？
        - Your application has to be Docker locked-in. FreeBSD Jails, VServer, OpenVZ containers are just an isolated chrootwith possible network stack separation: they does not impose any specific conditions for your software.
    - No way to escape dependency hell
        - PostgresSQLやRedisのどのバージョンを使うかは考慮しているが，library or packageの依存については何も考えてない
    - Deployment hell
        - 今までオペレーターがやってきたデバッグ術が使えない（Everything must be de using completely different approaches and vendor (Docker) specific tools.）

- [Lets review.. Docker (again) | Cal Leeming Blog](http://iops.io/blog/docker-hype/)
    - performance was so bad, that disabling caching features actually resulted in faster build times.
    - Dockerfile
        - Dockerfileという名前，https://github.com/docker/docker/issues/9198 (https://github.com/docker/docker/issues/9198)
        - Includeしたい, https://github.com/docker/docker/issues/735 (https://github.com/docker/docker/issues/735)
        - ENVとWORKDIR, https://github.com/docker/docker/issues/2637 (https://github.com/docker/docker/issues/2637) (Need to check)
        - $HOME環境変数問題, https://gist.github.com/foxx/0c4f02de6e3906fa1c98 (https://gist.github.com/foxx/0c4f02de6e3906fa1c98)
        - Cache問題
    - COW FSを選択できるようになったのはよい
    - 一部だけCache無効にとかできない
    - enforcing linear instruction execution even in situations where it is entirely inappropriate
    - DockerHub
        - 複数のFROMを指定できない
        - https://github.com/docker/docker/issues/3378 (https://github.com/docker/docker/issues/3378)
        - https://github.com/docker/docker/issues/5714 (https://github.com/docker/docker/issues/5714)
        - https://github.com/docker/docker/issues/5726 (https://github.com/docker/docker/issues/5726)
    - Cache問題
    - http://kimh.github.io/blog/en/docker/gotchas-in-writing-dockerfile-en/ (http://kimh.github.io/blog/en/docker/gotchas-in-writing-dockerfile-en/)
    - It also has no version enforcement, for example the author of dockerfile/ubuntu:14.04 could replace the contents of that tag, which is the equivalent of using a package manager without enforcing versions
    - パッケージマネージをバージョン指定なしでつかってるのと同じ
    - pre/post script hooksさえ指定できない
    - プロジェクトのストラクチャーを限定してくる
    - 一つのディレクトリに一つのDockerfile
    - Security
        - ホストでRoot権限のデーモンを動かし続けるのはめちゃ危険
        - puts ultimate trust in namespace capabilities which expose a much larger attack surface than a typical hypervisor
            -  NameSpaceの能力に頼りまくってるけど，ハイパーバイザー以上に攻撃可能な部分を晒している…
    - Containers are not VMs
        - Hypervisorのほうが安定しているから本当に理由がない限りDockerを使うべきではない
    - Docker is unnessary
        -  if you're not using snapshots then your production environment scaling is dependant on the stability of Docker Hub.
- [The case against Docker - Andreas Jung](https://www.andreas-jung.com/contents/the-case-against-docker)
    - A typical build under Docker was  5-10 times slower than executing the same scripts and code on the same machine directly under the shell.
    - Pushing the three images - each about 1.3 GB in size - took more than two hours.
    - Starting exist-db, executing a small Plone script for site setup and finally starting the Plone instance takes about ten minutes (under one minute without Docker)
    - Nobody could told me where and why this happened.
    - But restarting Docker also means that your containers go away and need to get restart - major pain in the ass factor...why is Docker so stupid and monolithic that containers can not continue to run? This is bad application design.
    - The slowness of Docker is a big pain.
    - There is not even a producedure for cleaning up the mess on the system
    - The theory and ideas behind Docker are great, its architecture and implementation is a mess.
    - It is unreliable, it is unpredictable, it is flaky.


## セキュリティ問題

Dockerを使ったことがあるひとならわかると思うがDockerを使うにはルート権限が必須である．デーモンが常に動いており，それにクライアントがコマンドを発行するアーキテクチャになっているので，Dockerコンテナが動いているホストでは常にルートのプロセスが動き続けることになる．

これは怖くて，コンテナはカーネルを共有しているので，もし特権昇格の脆弱性であるコンテナがハイジャックされたら，他の全てのコンテナと**ホストも**攻撃されることになる（[Container Security: Isolation Heaven or Dependency Hell | Red Hat Security](https://securityblog.redhat.com/2014/12/17/container-security-isolation-heaven-or-dependency-hell/)）．

実際Docker 1.3.1以前のバージョンでは脆弱生も見つかっている．

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

（この問題に関しては，yumとかaptがやってきた署名による配布モデルが実装されれば良いのではないかと思っている．）　

## Dockerfile問題

Dockerfileには，なんでこれができないの？ということやハマりどころが多い．

### このDockerfileから10年後も同じDockerイメージができるの？

- [Gregory Szorc's Digital Home | Deterministic and Minimal Docker Images](http://gregoryszorc.com/blog/2014/10/13/deterministic-and-minimal-docker-images/)

よく言われているように答えは「No」．Dockerはコンテナ内部で起動するデーモン（e.g., PostgresSQLやRedis）は特定のバージョンを使うかを固定できるが，それが依存するライブラリやパッケージに関しては何もできない．Dockerfileを書いたことがある人ならわかると思うが，必ず`apt-get update`を書くので．

これに関しては，`go get`と同じ批判かなと思う．セキュリティ的にも最新のライブラリやパッケージが使われるにこしたことはないと思うし，またどれだけちゃんとテストするか，にもつながると思う．もちろん皆が皆それができる環境ではないからこそこういう批判が登場するのだが．


## Registry問題

- [Allow images to be pulled by ID #4106](https://github.com/docker/docker/issues/4106)

## コンテナ仕様問題

## Docker Inc.の方向性問題

僕はこの問題を追っていてOSSだけど，企業なんだなということを実感した．

- [Why Docker and CoreOS split was predictable – Daniel With Music](http://danielcompton.net/2014/12/02/modular-integrated-docker-coreos)
- [Announcing Docker Machine, Swarm, and Compose for Orchestrating Distributed Apps | Hacker News](https://news.ycombinator.com/item?id=8699957)

## Rocketとは何か

- [CoreOS 共同創設者 Alex Polvi が語る: コンテナ、Rocket と Docker の比較ほか](https://jp.linux.com/news/linuxcom-exclusive/426261-lco2015021001)
- [What is Rocket and How It’s Different Than Docker | Century Link Labs](http://www.centurylinklabs.com/interviews/what-is-rocket-and-how-its-different-than-docker/)
- [Docker向けOSとか](http://www.slideshare.net/Yuryu/dockeros-tech-girl)

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


## LXC containers are awesome, but Docker.io sucks

- for example an apt dependency on a package which then breaks libc6 for ssh
- Bad point (1 year ago)
- AuFS is not a good choice of FS. It requires kernel patches
- CLI/API abstraction is non intuitive.
- Private image storage is unnecessarily complex
- For some of you, Docker might be the best step forward especially if you do not have the in-house skills to create your own application container stack. But for those who have the time/skill set, I would highly recommend rolling your own instead.
- コンテナ技術初心者にとっては良い選択．

## Container

仮想化はプログラムを完全に隔離する（例えばLinuxを動かしつつBSDを動かすことができる），がコンテナ化はそこまで隔離されない，

- また，2つのコンテナが異なるバージョンのカーネルモジュールを使うことはできない．
- コンテナは，デフォルトで多くのケーパビリティ（System-level kernel capabilities）を継承している．Dockerではオプションでそれらを管理できるが，VMでアプリケーションを動かす以上にアプリケーションが何を必要とするかに対する深い理解が必要になる．コンテナとその中のアプリケーションはホストのカーネルのケーパビリティに依存することになる．
- コンテナは"Write once, run anywhere"ではない．ホストのカーネルを使うので，アプリケーションはホストのカーネルと互換性が必要である．単に多くのアプリケーションが特定のカーネルの特徴に依存していないだけであって，**全て**のアプリケーションがそうであるわけではない．
