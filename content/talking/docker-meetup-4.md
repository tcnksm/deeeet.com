---
title: "CoreOSクラスタにDockerコンテナをデプロイする"
date: 2015-01-21
comments: true
categories: 
---

<script async class="speakerdeck-embed" data-id="6d2cf7b07fc001328d145ab31af9093f" data-ratio="1.77777777777778" src="https://speakerdeck.com/assets/embed.js"></script>

[Docker Meetup Tokyo #4](http://connpass.com/event/10318/)

CoreOSの概要とDockerを実際に運用しようと思ったときにDockerが抱える問題をCoreOSがどのようにそれを解決するかについて発表した．デモでは[Terraform](https://www.terraform.io/)を使ってDigitalOcean上にCoreOSクラスタを立てて，デモアプリケーションコンテナを動的にスケールさせる様子を実演した（ソースは全て[tcnksm/docker-meetup-4-demo](https://github.com/tcnksm/docker-meetup-4-demo)にある）．

### 雑感

簡単にMeetupの感想を書いておく．

今回はDockerそのものの発表よりも，オーケストレーションやサービスディスカバリーなどの周辺ツールやサービスの発表が多かった．ツール（もしくはDocker専用のOS）では，[CoreOS](https://coreos.com/)，[Kubernetes](http://kubernetes.io/)，[RedHad Atomic host](http://www.projectatomic.io/)，サービスでは[Amazon EC2 Container Service (ECS)](http://aws.amazon.com/ecs/)，[Google Container Engine](https://cloud.google.com/container-engine/)，[tutum](https://www.tutum.co/)といった主要なもの全ての発表があった．完全に周辺ツールへの注目が高まっている．Docker machineやswarmという単語はほとんど聞かなかったので期待感は薄そう．

得にコンテナの動的なデプロイへの注目が高いと感じた．Dockerによりホストが抽象化されるので，どのマシンにコンテナを動かしても同じように扱うことができる．動的なデプロイとは，複数のマシンをクラスタリングし，マシンのリソースや役割などに基づき適切なマシンにコンテナをデプロイする手法である（つまりデプロイ先が動的に決まる）．周辺ツールは，そのようなマシンのクラスタリングや，スケジューリング，コンテナの連携といった問題を解決する．まだどうなるか分からないが，2015年はこの辺に大きな動きがありそう．

また，実際にプロダクションへのDocker投入の話がWantedlyとドワンゴからありとても参考になった．共通していたのは，どちらも静的なデプロイをしていたところ．静的なデプロイというのは，動的デプロイと逆で，決まったIPに決まったコンテナをデプロイする方法（プロダクションでのDockerの運用はこの手法を多く見かける）．この理由は，オーケストレーションやスケジューリング系のツールがまだまだ成熟しておらず，プロダクションでは不安定，運用も大変で得られるメリットが少ないため，と推測した．

とにかく面白い発表をたくさん聞くことができたので，とても良いMeetupだった．今回Docker meetupで発表の機会をもうけて頂いた[@stanaka](#)さん，[@kazunori_279](#)さんありがとうございました．他のスタッフのかたもありがとうございました．次はDockerCon JPですかね．


### 参考

- [CoreOSに入門した](http://deeeet.com/writing/2014/11/17/coreos/)
- [Fleetの使い方，Unitファイルの書き方](http://deeeet.com/writing/2014/11/20/fleet/)
- [CoreOSクラスタ内のDockerコンテナの動的リンク](http://deeeet.com/writing/2014/11/26/coreos-etcd-docker-link/)
- [TerraformでCoreOSクラスタを構築する](http://deeeet.com/writing/2015/01/07/terraform-coreos/)
- [Docker Meetup Tokyo #4 - 資料一覧](http://connpass.com/event/10318/presentation/)





