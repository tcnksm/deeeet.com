+++
date = "2015-04-13T22:03:28+09:00"
title = "CoreOS Meetup Tokyo #1 を開催した"
+++

[CoreOS Meetup Tokyo #1 - connpass](http://coreos-meetup-tokyo.connpass.com/event/12596/)

今回のMeetupは，etcd2.0のリリースやrktの登場，5月の[CoreOS Fest 2015](https://coreos.com/fest/)，また各社のCoreOSの導入事例の兆しを受けての開催．といってもCoreOSの利用事例はまだ少ないと感じたため，CoreOSだけではなくその関連技術やプラットフォームをテーマとした．それでも20分の発表8本というとても濃いMeetupとなり非常に勉強になった．またそこまで人は集まらないと思っていたところ100人枠に350人の応募があり，注目の高さにも驚いた（次回は抽選にするなど考慮します）．

発表資料は全て，[CoreOS Meetup Tokyo #1 - 資料一覧 - connpass](http://coreos-meetup-tokyo.connpass.com/event/12596/presentation/)にまとめてある．が，簡単にMeetupの内容をまとめておく．各種テーマが散っているので自分なりにまとめておく．

## 概要

まず，自分からはCoreOSについて知らない人でもMeetupにキャッチアップできるできるようにCoreOSの概要を簡単に紹介した．

<script async class="speakerdeck-embed" data-id="27e1fef591484f0b91d46cc44ebd434e" data-ratio="1.77777777777778" src="http://speakerdeck.com/assets/embed.js"></script>

[Introduction of CoreOS](https://speakerdeck.com/tcnksm/introduction-of-coreos-at-coreos-meetup-tokyo-number-1-number-coreosjp)

CoreOSとは何か，モチベーションは何か，どんな特徴がありどんな技術が使われているのかについて話した．CoreOSについてはRebuildでも簡単にしゃべらせてもらったので参考にしてください．

- [Rebuild: 83: Living In A Container (deeeet)](http://rebuild.fm/83/)

## 要素技術

次にCoreOSで使われている技術について．今回はコンテナの話が2本とFleetの概要の発表が1本だった．

- [@mopemope](https://twitter.com/mopemope), ["CoreOS/Rocket"](http://www.slideshare.net/YutakaMatsubara/rocket-46800960?ref=http://coreos-meetup-tokyo.connpass.com/event/12596/presentation/) - rktとは何か，どのような思想で作られているのか，Dockerとは何が違うのか，現状何ができるのかについて．特にDockerとの比較はとてもわかりやすくて良かった．「Dockerほど高機能ではないが，その分シンプルで組み合わせ可能」という説明が良かった．
- [@kawamuray](https://github.com/kawamuray), ["Docker + Checkpoint/Restore"](http://www.slideshare.net/kawamuray/coreos-meetup?ref=http://coreos-meetup-tokyo.connpass.com/event/12596/presentation/) - CoreOS関係ないw CRIUの応用はLive migrationくらいだと思っていたけど，コンテナの中身（アプリケーション）に依存せずに起動を高速化するという応用は今後大切になりそう（複数の役割のコンテナをMicroservices的に立てるときに1つだけ起動が遅くてそれを考慮しようとすると管理側に複雑さが入り込む，とくに分散システムだと問題が顕著になる）
- [@spesnova](https://twitter.com/spesnova), ["Understanding fleet"](https://speakerdeck.com/spesnova/understanding-fleet) - Fleetの仕組みについて．FleetのスケジューリングはMesosほど複雑なことをしてなくて，もっとも少ないUnitを実行しているAgentに均等にタスクを割り振っているだけ．自分的にはこのシンプルさが好きだし，これで十分なことも多いと思う．

## IaaS

CoreOS OEMの話をNIFTY Cloudの[@higebu](https://twitter.com/higebu)さんにしていただいた（["CoreOS OEM in NIFTY Cloud"](http://www.slideshare.net/higebu/20150409-core-osoemonniftycloud)）．CoreOSのOEMとは，IaaSプロバイダーがそのプラットフォームでCoreOSを利用可能にするために，プラットフォームの独自の設定などをCoreOSに取り込んでもらうための仕組みでCloudに特化したCoreOSならではのもの．NIFTY CloudもCoreOSが使えるようになっており，その経緯について話してももらった．

普通の人はIaaSサービスでCoreOSを使うだけなので，これは万人向けの話ではない．が，CoreOSがどのように提供されるのかを知ることは使う側としてとても大事だと思うので，非常に勉強になった．特にたくさんあるCoreOSのレポジトリがどんな役割があるのかを知れて良かった．

## プロダクション運用

実際にCoreOSで実運用を始めている話が2本あった．

- [@spesnova](https://twitter.com/spesnova), ["CoreOS 運用の所感"](https://speakerdeck.com/spesnova/coreos-yun-yong-falsesuo-gan) - Wantedlyでの運用について．etcd/fleetをオフにして運用しているとのこと．ダイナミックデプロイを犠牲にしても得られるCoreOS利点として，ホストマシンの構築タスクがほぼない．AMI焼く必要もない，脆弱性対応（Ghostとか）が楽，起動が速い，コンテナとOSの分離（ホストの抽象化）の促進はそうだなと思うし，導入の参考になると思う．Channelの選びかたも参考になった．Docker後の世界でOpsとDevがいかに協調するか，という話はとても面白かったし[賛同できた](https://twitter.com/deeeet/status/586133045473779712)
- [@harukasan](https://twitter.com/ianmlewis), ["CoreOSで運用する際に考えないといけないこと"](https://speakerdeck.com/harukasan/coreos-in-pixiv) - pixivでの運用について．こちらはFleetとetcdも使っているとのこと．とにかく導入時に考えるべきことが網羅されていて良かった．自分的にはCoreOSをどう捉えているのか，もしくはどのような場合に選択肢になるのか，k8sが必要になるのはどのラインか考え方がとても共感できた（cf. ["CoreOS Meetup Tokyo #1 で発表してきました #coreosjp - BLOG::はるかさん"](http://blog.harukasan.jp/entry/2015/04/10/112517)）

CoreOSのモニタリングはDataDogが人気っぽい．僕も自分のCoreOSクラスタはDDで監視している（cf. ["CoreOSクラスタのDockerコンテナの監視"](https://speakerdeck.com/tcnksm/coreoskurasutafalsedockerkontenafalsejian-shi-number-monitoringcasual)）

## プラットフォーム

最後にCoreOSの上でプラットフォームを構築するプロジェクトについての話が2本あった．

- [@jacopen](https://twitter.com/jacopen), ["OpenShift 3で、DockerのPaaSを作る話"](http://www.slideshare.net/jacopen/openshift-3dockerpaas?ref=http://coreos-meetup-tokyo.connpass.com/event/12596/presentation/) - OpenShiftはv3で今までのアーキテクチャーを一新してDockerとk8sの利用に舵を切っている．思想も面白くて，k8sに足りないPaaS的な側面，つまり，Webサービスの開発のライフサイクルの支援やユーザ管理などをOpenShiftが補うように構築されている．今回は奨励プラットフォームがRed Hat Atomicである部分をCoreOSで動かすというデモがあり面白かった（またWeb Hookの機能が面白いとの声もあった）．
- [@ianmlewis](https://twitter.com/harukasan), "Kubernetes on CoreOS" - CoreOSとk8sの関係は，[TECTONIC](https://tectonic.com/)の発表によってますます強くなっている．Dockerだけではなく，k8sを動かすホストとしてCoreOSを選択する事例は増えそう．

CoreOS上にプラットフォームを構築している例として他にもDocker PaaSの[Deis](http://deis.io/)などがある．

## まとめ

Meetupやその後で話したところCoreOSの導入事例は増えそうだなと感じた．特にDockerを載せるプラットフォームとしてはk8sほどのものを必要としないところは多いと思うのでCoreOSは良い選択になると思う．逆にk8sやOpenshiftのようなものを採用して実は裏はCoreOSです，という流れもあると思う．

今回発表はなかったが，[Cloud Foundry](http://cloudfoundry.org/index.html)がそのコンポーネントでetcdを使っているようにCoreOSのコンポーネントが単体で使われる事例も増えるのではと思う．特に日本では分散Key&Valueとして[consul](https://www.consul.io/)の導入が見られるが，Simple alternativeとしてetcdはあるのではと思う．

とにかく濃く，面白い発表をたくさん聞くことができてとても面白いMeetupだった．また機会があればお願いします．[@kazunori_279](https://twitter.com/kazunori_279)さん，[nishimurakaz](http://connpass.com/user/nishimurakaz/open/)さん，また会場提供の[FreakOut](https://www.fout.co.jp/)さんありがとうございました．

