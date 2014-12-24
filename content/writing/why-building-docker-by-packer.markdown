---

title: 'DockerイメージのビルドにPackerを使うべき理由'
date: 2014-03-03
comments: true
categories: docker packer
---

["Ask HN: Do you bake AMIs for AWS deployments?"](https://news.ycombinator.com/item?id=7066002)での，Mitchell Hashimoto氏の[コメント](https://news.ycombinator.com/item?id=7067648)より．簡単に抄訳．

- ソフトウェアのインストールや設定の知識は，依然としてShellscriptやChef，Puppetに残っている．Packerを使えば，Dockerのコンテナの作成に現時点で存在している経験やCIプロセスなどを利用できる．
- 共通のフォーマットの設定．Dockerfileの記述は特有である．それは良いが，現状様々なイメージ(AMIやDockerのコンテナ，Virtualboxなど)が存在する．Dockerが全てではないとき，イメージをビルドするために様々なツールをメンテするのは負担になる．Packerを使えば，一つの方法で，さまざまなプラットフォームに対応できる．たとえ企業がDockerのみに移行しても．
- 移植性．Packerは低リスクでDockerのコンテナに対応できる．DockerfileはDockerのためのものである．例えばDockerが気に入らない場合や，Dockerがある状況に対して適切ではない場合に，Dockerfileは別のフォーマットに移し替えられなければならない．
- 拡張性．Packerは簡単にプラグインを作ることができる．Dockerは特別なコマンドの追加をサボートしていないが，Packerなら可能（それが必要かは別にして）．
- プロセスがシンプル．Packerのイメージのビルドプロセスは，1..Nと順に進むだけで，余計なプロセスはない．DockerのコンテナやAminatorのAMIのビルドは異なるプロセスをもつ．新しいプロセスは，CIの特別な処理や，新人への教育，新たなメンテナンスを生む．

最後にPackerの今後についても言及している．現時点では，Packerには，Dockerのようにステップごとにスナップショットをとる機能はない．そのためbuildし直すと処理ははじめからになる．しかし，現時点でそのスナップショットの機能に取り組んでおり，将来サポートされる予定らしい．これができれば，`docker build`のように`packer build`の場合も，必要なステップから処理が再開されるようになる．クールだ．

Packerを使ったdockerイメージのビルドは，["Packerを使ってChef/Puppet/AnsibleでDockerのイメージをつくる"](http://deeeet.com/writing/2014/03/02/build-docker-image-by-packer/)に書いた．とても簡単．
