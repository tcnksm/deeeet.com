---
title: '"Orchesrating Docker"という本をレビューした'
date: 2015-01-26
comments: true
---

<img src="/images/orchestrating_docker.jpg" class="image"/>

- [Orchestrating Docker | Packt ](https://www.packtpub.com/virtualization-and-cloud/orchestrating-docker)
- [Orchestrating Docker: Amazon.com: Books](http://www.amazon.com/Orchestrating-Docker-Shrikrishna-Holla/dp/1783984783)

[Packt Publishing](https://www.packtpub.com/)から1月22日に出版された["Orchestrating Docker"](https://www.packtpub.com/virtualization-and-cloud/orchestrating-docker)という本にレビュアーとして参加した．本の中身は，Dockerの基礎と[CoreOS](https://coreos.com/)や[dokku](https://github.com/progrium/dokku)といった周辺ツールをサンプルコードとともに幅広く紹介するという内容になっている．日本の技術界隈では見かけなかった話題もちょくちょく含まれていて面白い．

英語の本をレビュー依頼を受けるのは[よくあるらしい](https://twitter.com/repeatedly/status/503111928923713536)が，実際にやったひとの話は見かけないので簡単にどんな感じだったかを簡単に書いておく．

### 経緯

9月あたりにPacktの編集者からDocker本のレビューに興味がないかとメールが届いた．日本人の自分が選ばれた理由は[codarwallへの投稿](https://coderwall.com/p/u/tcnksm)を見たからとのこと．ネイティブスピーカーではないことを伝え，それでもとの返答をもらったので，何事も経験だと思い了承した．

### 報酬

報酬はレビューした本とPackt内の電子書籍をどれか1つの贈呈（["Mastering Concurrency in Go"](https://www.packtpub.com/application-development/mastering-concurrency-go)を希望した）．今回は自分の経験のためという名目があったので得に不満はない．仕事もそれに見合った働きしかしていないと思う．

### レビューの流れ

レビューする原稿は一度に2章づつメールで送られてくる．`.doc`形式で送られてくるので，MS wordもしくはGoogle docsのコメント機能を使って気になるところや，技術的におかしなところにコメントを加えていく．文法的な誤りの指摘は不要とあらかじめ言われていたので，その辺は無視する．また，自分が試したことがないサンプルがあれば，実際にコマンドを叩きながらちゃんと動くかを確認する．

毎回章ごとにアンケートが添付されているので，そこで章の総評を行う．例えば，

- この章で著者が逃しているトピックはないか？あればそれは何か？
- 点数をつけるなら10点中何点か？満点にするにはどうすれば良いか？
- 次章に登場するべきトピックは何か？

など，ざっくりとした内容の質問が並ぶ．

場合によっては，著者と直接やりとりをすることもあるらしいが，自分の場合はそれはなかった．レビューが終わったらコメントした原稿とアンケートをメールに添付して返信する．これを繰り返す．

### 英語

普段から自分が好きで追っかけてるテーマなのでそれほど大変ではなかった．著者にもよるけど，技術文章の場合は調べないといけないような複雑な文法表現は少ないし，専門分野であれば単語も分かっている．

コメントも長文を書くわけでないので，それほど苦ではなかった．伝わりにくいと思えば，参考リンクとして外部のブログを貼ってそちらに任せたりした．

### 良かったこと

このテーマだったら自分で買って読んでいただろうし，それをいち早く読めたのは良かった．また自分ならこうやって説明するのになあという視点で読めたのは良かった．これは今後ブログを書くときなどにためになったと思う．

### 不満だったこと

とにかく締め切りが厳しかった．こちらの都合関係なしに1章1日でやれと言われたりした．にも関わらず，原稿が送られ来るのは大幅に遅れてきたりして雑な感じだった（ポジティブに捉えるならば，本作りとはこういうものなのだなと思うことができた）．

## まとめ

最後に本の総評をしておくと5.0点満点中3.5点だと思う．めっちゃ良い本！とは言えない．書籍の良さは多くの情報を集約/構造化してわかりやすく伝えてくれることだと思うが，本書は集約/構造化が弱く，散漫に感じるかもしれない．そもそもDocker界隈は流れが早いため，まだまだそれを理想的な形で実現するのは難しいので仕方のないことだとは思う．流れが早いのを分かった上で周辺技術を広く浅く伝えようという意図はあるので，その辺を掴みたいひとには良い本かと思う．

オライリーから出版される以下はどうなるのか楽しみ．

- [Docker: Up and Runnin](http://www.amazon.com/gp/product/1491917571/ref=pd_lpo_sbs_dp_ss_1?pf_rd_p=1944687742&pf_rd_s=lpo-top-stripe-1&pf_rd_t=201&pf_rd_i=1783984783&pf_rd_m=ATVPDKIKX0DER&pf_rd_r=0TN7FPBYNDKAYFTF99FB)
- [Docker Cookbook](http://www.amazon.com/gp/product/149191971X/ref=pd_lpo_sbs_dp_ss_3?pf_rd_p=1944687742&pf_rd_s=lpo-top-stripe-1&pf_rd_t=201&pf_rd_i=1783984783&pf_rd_m=ATVPDKIKX0DER&pf_rd_r=0TN7FPBYNDKAYFTF99FB)
- [Using Docker](http://www.amazon.com/gp/product/1491915765/ref=pd_lpo_sbs_dp_ss_2?pf_rd_p=1944687742&pf_rd_s=lpo-top-stripe-1&pf_rd_t=201&pf_rd_i=1783984783&pf_rd_m=ATVPDKIKX0DER&pf_rd_r=0TN7FPBYNDKAYFTF99FB)

