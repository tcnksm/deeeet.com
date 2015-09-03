+++
date = "2015-09-01T18:13:38+09:00"
draft = true
title = "Apache Kafkaに入門した"
cover_image = "kafka-logo-wide.png"
+++

[Apache kafka](http://kafka.apache.org/)

最近仕事で[Apache Kafka](http://kafka.apache.org/)の導入を進めている．Kafkaとは何か? どこで使われているのか? どのような理由で作られたのか? どのように動作するのか（特にメッセージの読み出しについて）? を簡単にまとめておく（メッセージングはまだまだ勉強中なのでおかしなところがあればツッコミをいただければ幸いです）．

バージョンは _0.8.2_ を対象に書いている．

## Apache Kafkaとは?

2011年に[LinkedIn](https://www.linkedin.com/)から公開されたオープンソースの分散メッセージングシステムである．Kafkaはウェブサービスなどから発せられる大容量のデータ（e.g., ログやイベント）を高スループット/低レイテンシに収集/配信することを目的に開発されている．公式のトップページに掲載されているセールスポイントは以下の4つ．

- **Fast** とにかく大量のメッセージを扱うことができる
- **Scalable** Kafkaはシングルクラスタで大規模なメッセージを扱うことができダウンタイムなしでElasticかつ透過的にスケールすることができる
- **Durable** メッセージはディスクにファイルとして保存され，かつクラスタ内でレプリカが作成されるためデータの損失を防げる（パフォーマンスに影響なくTBのメッセージを扱うことができる）
- **Distributed by Design** クラスタは耐障害性のある設計になっている

## どこで使われているのか?

[Use Cases](http://kafka.apache.org/documentation.html#uses)をあげると，メッセージキューやウェブサイトのアクティビティのトラッキング（LinkedInのもともとのUse Case），メトリクスやログの収集，[Storm](https://storm.apache.org/)や[Samza](http://samza.apache.org/)を使ったストリーム処理などにおいて

利用している企業は例えばTwitterやNetflix，Square，Spotify，Uberなどがある（cf. [Powered By](https://cwiki.apache.org/confluence/display/KAFKA/Powered+By)）．

## Kafkaの初期衝動

Kafkaのデザインを理解するにはLinkedInでなぜKafkaが必要になったのかを理解するのが早い．それについては2012年のIEEEの論文["Building LinkedIn's Real-time Activity Data Pipeline"](http://sites.computer.org/debull/A12june/pipeline.pdf)を読むのが良い．簡単にまとめると以下のようになる．

LinkedInでは大きく2つのデータを扱っている．1つはウェブサイトから集められる大量のユーザのアクティビティデータ．これらをHadoop（バッチ処理）を通して機械学習しレコメンド/ニュースフィードなどサービスの改善に用いている．それだけではなくこれらのデータはサービスの監視（セキュリティなど）にも用いている．2つ目はシステムのログ．これらをリアルタイムで処理してサービスのモニタリングを行っている．これらは近年のウェブサービスではよく見かける風景．

問題はそれぞれのデータの流れが1本道になっていたこと．アクティビティデータはバッチ処理に特化していたためリアルタイム処理ができない，つまりサービス監視には遅れが生じていた．同様にシステムのログは，リアルタイム処理のみに特化していたため長期間にわたるキャパシティプランニングやシステムのデバッグには使えなかった．サービスを改善するにはそれぞれタイプの異なるデータフィードを最小コストで統合できるようにする必要があった．またLinkedInのようにデータがビジネスのコアになる企業ではそのデータを様々なチームが簡単に利用できる必要があった．

これら問題を解決するために大ボリュームのあらゆるデータを収集し様々なタイプのシステム（バッチ/リアルタイム）からそれを読めるようにする統一的ななメッセージプラットフォームの構築が始まった．

最初は既存のメッセージシステム（論文にはActiveMQを試したとある）の上に構築しようとした．しかしプロダクションレベルのデータを流すと以下のような問題が生じた．

- 並列でキューのメッセージを読むにはメッセージごとに誰に読まれたかを記録する必要がある（mutex）．そのため大量のデータを扱うとメモリが足りなくなった．メモリが足りなくなると大量のRamdom IOが発生しパフォーマンスに深刻な影響がでた
- バッチ処理/リアルタイム処理の両方でキューを読むには少なくとも2つのデータのコピーが必要になり非効率になった

このような問題から新しいメッセージシステム，Kafkaの開発が必要になった．Kafkaが目指したのは以下．

- あらゆる種類のデータ/大容量のデータを統一的に扱う
- 様々なタイプのシステム（バッチ/リアルタイム）が同じデータを読める
- 高スループットでデータを処理する（並列でデータを読める）

## どのように動作するのか?（概要）

KafkaはBroker（クラスタ）とProducer，Consumerという3つのコンポーネントで構成される．Producerはメッセージの配信を行いConsumerはメッセージの購読を行う．そしてKafkaのコアであるBrokerはクラスタを構成しProducerとConsumerの間でメッセージの受け渡しを行うキューとして動作する．

<img src="http://kafka.apache.org/images/producer_consumer.png" />
[http://kafka.apache.org/images/producer_consumer.png](http://kafka.apache.org/images/producer_consumer.png)

**メッセージのやりとり**

KafkaはTopicを介してメッセージのやりとりを行う．Topicとはメッセージのフィードのようなものである．例えば，検索に関わるデータを"Search"というTopic名でBrokerに配信しておき，検索に関わるデータが欲しいConsumerは"Search"というTopic名を使ってそれをBrokerから購読する．

**Pull vs Push**

BrokerがConsumerにデータをpushするのか（fluentd，logstash，flume），もしくはConsumerがBrokerからデータをpullするのかはメッセージシステムのデザインに大きな影響を与える．もちろんそれぞれにPros/Consはある．KafkaはPull型のConsumerを採用している．それは以下の理由による．

- pushだと様々なConsumerを扱うのが難しく，Brokerがデータの転送量などを意識しないといけない．Kafkaの目標は最大限のスピードでデータを消費することだが，（予期せぬアクセスなどで）転送量を見誤るとConsumerを圧倒してまう．PullだとConsumerが消費量を自らが管理できる．
- pullだとバッチ処理にも対応できる．pushだと自らそれを溜め込んだ上でConsumerがそれを扱えるか否かに関わらずそれを送らないといけない
- (pullでしんどいのはBrokerにデータがまだ届いてない場合のコストだがlong pollingなどでそれに対応している)

**メッセージのライフサイクル**

BrokerはConsumerがメッセージを購読したかに関わらず設定された期間のみ保持してその後削除する．これはKafkaの大きな特徴の1つである．例えば保存期間を2日間に設定すれば配信後2日間のみデータは保持されその後削除される．

このためConsumerサイドがメッセージをどこまで読んだがを自らが管理する（Brokerが管理する必要がない）．普通は順番にメッセージを読んでいくが，Consumerに問題があれば読む位置を巻き戻して復旧することもできる（最悪どれくらいでConsumerを復旧できるかによりデータの保存期間が決まり保持するデータのサイズが決まる）．

この2つの特徴のためConsumerはBrokerにも他のBrokerにも大きな影響を与えない．

## 高速にメッセージを消費する

Kafkaの肝はBrokerからConsumerへの高スループットである（と思う）．これをどのように実現しているかを説明する．

**並列でキューを読むのは大変**

高速にメッセージを消費するにはBrokerのデータを並列に読む必要がある．そもそも"初期衝動"のところで説明したように複数のConsumerが並列でキューを読むのは大変である．

- 重複なく送るためにはメッセージごとにどのConsumerに読まれたかを管理する必要がある
- キューの書き込みまでは順序性が確保されるが並列で読むと複数のConsumerに消費された瞬間順序は失われる


Kafkaのデザインはこれらを解決するようになっている．

**Brokerにおけるメッセージの保存**

まずBrokerのメッセージの保存方法に特徴がある．KafkaはTopicごとに1つ以上のPartitionという単位でメッセージを保存する．メッセージはそれぞれのPartitionの末尾に追記される．これによりPartitionごとにメッセージの順序性が担保される．例えば以下の図はあるTopicの3つのPartitionにメッセージが追記されていることを示す．

<img src="http://kafka.apache.org/images/log_anatomy.png" />
[http://kafka.apache.org/images/log_anatomy.png](http://kafka.apache.org/images/log_anatomy.png)


**Partitionの使われ方**

Partitionには大きく以下の2つの目的がある．

- 複数のサーバーでメッセージを分散させるため（1つのサーバーのキャパを超えてメッセージを保存できる）
- 並列処理のため

どのように並列処理するか? Consumerはグループ単位でメッセージを購読する．そして"1つのPartitionのデータは1つのConsumerグループ内の1つのConsumerにのみ消費される"という制限でこれを実現する（つまりConsumerの並列数はPartition数を超えられない）．以下の図は2つのConsumerグループAとBに属する複数のConsumerが並列にメッセージを購読している様子を示す．グループ内では並列処理だがグループ間で見ると伝統的なPub/Subモデル（1対1）のモデルに見える．

<img src="http://kafka.apache.org/images/consumer-groups.png"/>
[http://kafka.apache.org/images/consumer-groups.png](http://kafka.apache.org/images/consumer-groups.png)

この仕組みには以下のような利点がある．

- あるPartitionを読むConsumerは特定の1つなので，メッセージが誰にどこまで読まれたかまで記録する必要はなくて，単純にどこまで読まれたかを通知しておけばよい
- 読んでるConsumerは1つなのでConsumerはlazyに読んだ場所を記録しておけばよくて処理に失敗したら再びよみにいけば良い（at-least-once）
- どのメッセージが読まれたかをlazilyに記録できるためにパフォーマンスを保証できる（Partitionのオーナーを同じように決められ無い場合はスタティックにConsumerを割り当てるか/ランダムにConsumerをロードバランスするしか無い．ランダムにやると複数のプロセスが同時に同じPartitionを購読するのでmutexが必要になりBrokerの処理が重くなる）

**順序性の補足**

Partition内，つまりConsumer内では順序性が確保される．つまりBrokerに記録された順番で消費される．がPartition間では保証されない．

ProducerはBrokerにメッセージを配信するときにKeyを指定することができる．このKeyにより同じKeyが指定されたメッセージを同じPartitionに保存することができる．Partition内の順序性とKeyで大抵のアプリケーションには問題ない（とのこと）．完全な順序性を確保したければPartitionを1つにすれば良い（Consumerも一つになってしまうが）．

## まとめ

先に紹介した論文["Building LinkedIn's Real-time Activity Data Pipeline"](http://sites.computer.org/debull/A12june/pipeline.pdf)は他にも面白いことがたくさん書いてある．例えば高スループットを実現するためにBrokerのバッファ書き込みを自分たちで実装するのではなくてカーネルのメモリキャシュ機構をちゃんと使うようにした（Brokerが動いているサーバーのメモリ32GBのうち28-30GBがキャッシュに使われている）とか．のでKafkaを使おうとしているひとはぜひ一度目を通してみるといいと思う．

次はGo言語を使ってProducerとConsumerを実装する話を書く．

## 参考

- [Building LinkedIn's Real-time Activity Data Pipeline](http://sites.computer.org/debull/A12june/pipeline.pdf)
- [Apache Kafka入門](http://www.amazon.co.jp/Apache-Kafka%E5%85%A5%E9%96%80-%E4%BC%8A%E6%A9%8B-%E6%AD%A3%E7%BE%A9-ebook/dp/B00JU43ONW)
- （["Apache Kafka, Samza, and the Unix Philosophy of Distributed Data"](http://www.confluent.io/blog/apache-kafka-samza-and-the-unix-philosophy-of-distributed-data)はApache KafkaをUnix哲学/パイプという観点から説明していてわかりやすい）
- [Apache Kafka 0.8.0の新機能／変更点 - 夢とガラクタの集積場](http://kimutansk.hatenablog.com/entry/20130703/1372803004)
- [Apache Kafka, 他とは異なるメッセージングシステム](http://www.infoq.com/jp/news/2014/01/apache-afka-messaging-system)
- [StormとKafkaによるリアルタイムデータ処理 - Yahoo! JAPAN Tech Blog](http://techblog.yahoo.co.jp/programming/storm/)
