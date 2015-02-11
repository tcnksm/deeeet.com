+++
date = "2015-02-11T23:32:16+09:00"
draft = true
title = "Docker bad points"
+++

## LXC containers are awesome, but Docker.io sucks

[http://iops.io/blog/lxc-application-containers-docker-initial-thoughts/](http://iops.io/blog/lxc-application-containers-docker-initial-thoughts/)

- for example an apt dependency on a package which then breaks libc6 for ssh
- Bad point (1 year ago)
- AuFS is not a good choice of FS. It requires kernel patches
- CLI/API abstraction is non intuitive.
- Private image storage is unnecessarily complex
- For some of you, Docker might be the best step forward especially if you do not have the in-house skills to create your own application container stack. But for those who have the time/skill set, I would highly recommend rolling your own instead.
- コンテナ技術初心者にとっては良い選択．

## Lets review.. Docker (again)

[http://iops.io/blog/docker-hype/](http://iops.io/blog/docker-hype/)

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

## boycott docker

[http://www.boycottdocker.org/](http://www.boycottdocker.org/)

Docker is vendor lock-in technology convenient for, and spreaded by cloud computing corporations.

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
- Security
- Repositories authentication
- Image authntication
- No authentication at all, Just trust DockerHub
- 配布パッケージはPGPでサインされていた
- ベンダーを信用すれば，暗号手法がそのバイナリのディストリビューシoョンを信頼した（Rocket）
- DebianやUbuntuではまず鍵をインポートしないといけない
- SELinux
- Docker does not deal with them at all It's easier to say that is impossible
-

## Docker Image Insecurity

[https://titanous.com/posts/docker-insecurity](https://titanous.com/posts/docker-insecurity)

- [decompress](#) -\> [tarsum](#) -\> [unpack](#)
- Untrusted input should not be processed before verifying its signature. Unfortunately Docker processes images three times before checksum verification is supposed to occur.
- ここに脆弱性が入り込む余地nがある

## Before you initiate a “docker pull”

[https://securityblog.redhat.com/2014/12/18/before-you-initiate-a-docker-pull/](https://securityblog.redhat.com/2014/12/18/before-you-initiate-a-docker-pull/)

- docker pullはダウンロードしたイメージのバリデートなしで解凍して読み込むので脆弱性が入り込む余地がある
- tarでダウンロードしてchecksumでバリデートしてから自分でdocker loadするのがよい　　


- http://www.krisbuytaert.be/blog/docker-vs-reality-0-1 (http://www.krisbuytaert.be/blog/docker-vs-reality-0-1)
- http://gregoryszorc.com/blog/2014/10/13/deterministic-and-minimal-docker-images/ (http://gregoryszorc.com/blog/2014/10/13/deterministic-and-minimal-docker-images/)
- 同じDockerfileで同じDockerイメージが作られるわけではない
- https://medium.com/@darrenrush/after-docker-unikernels-and-immutable-infrastructure-93d5a91c849e (https://medium.com/@darrenrush/after-docker-unikernels-and-immutable-infrastructure-93d5a91c849e)
- https://github.com/docker/docker/issues/4106 (https://github.com/docker/docker/issues/4106)
- IDでdocker pullできない
-

## Security

- [https://securityblog.redhat.com/2014/12/17/contaier-security-isolation-heaven-or-dependency-hell/](https://securityblog.redhat.com/2014/12/17/container-security-isolation-heaven-or-dependency-hell/)
- http://www.theregister.co.uk/2015/01/12/docker\_security\_immature\_but\_not\_scary\_says\_gartner/ (htntp://www.theregister.co.uk/2015/01/12/docker\_security\_immature\_but\_not\_scary\_says\_gartner/)
- http://web.nvd.nist.gov/view/vuln/detail?vulnId=CVE-2014-6408 (http://web.nvd.nist.gov/view/vuln/detail?vulnId=CVE-2014-6408)
- CVE-2014-6408
- http://www.theregister.co.uk/2014/11/25/docker\_vulnerabilities/ (http://www.theregister.co.uk/2014/11/25/docker\_vulnerabilities/)
- https://titanous.com/posts/docker-insecurity (https://titanous.com/posts/docker-insecurity)
- http://blog.docker.com/2014/12/initial-thoughts-on-the-rocket-announcement/ (http://blog.docker.com/2014/12/initial-thoughts-on-the-rocket-announcement/)
- http://www.infoq.com/jp/news/2013/10/docker-container-security (http://www.infoq.com/jp/news/2013/10/docker-container-security)
-
About Rocket

- http://www.slideshare.net/Yuryu/dockeros-tech-girl (http://www.slideshare.net/Yuryu/dockeros-tech-girl)
- http://www.centurylinklabs.com/interviews/what-is-rocket-and-how-its-different-than-docker/ (http://www.centurylinklabs.com/interviews/what-is-rocket-and-how-its-different-than-docker/)
- http://danielcompton.net/2014/12/02/modular-integrated-docker-coreos (http://danielcompton.net/2014/12/02/modular-integrated-docker-coreos)

Docker&OSS

- https://news.ycombinator.com/item?id=8699957 (https://news.ycombinator.com/item?id=8699957)


Other

- http://www.phoronix.com/scan.php?page=news\_item&px=Systemd-Import-QCOW2-XZ-Images (http://www.phoronix.com/scan.php?page=news\_item&px=Systemd-Import-QCOW2-XZ-Images)
