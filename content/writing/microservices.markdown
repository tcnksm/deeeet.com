---

title: '"Microservices"を読んだ'
date: 2014-09-10
comments: true
categories: 
---

[James Lewis](https://twitter.com/boicy)氏と[Martin Fowler](http://www.martinfowler.com/)氏による["Microservices"](http://martinfowler.com/articles/microservices.html)を読んだ．以前ざっと目を通したが，最近よく耳にするようになったのでちゃんと読んだ．以下はそのメモ．

## 概要

- "Microservices" とはソフトウェアシステムの開発スタイルである
    - 近年このスタイルでの開発を見てきて良い結果が出ている
    - 初出は2012年の3月の["Micro services - Java, the Unix Way"](http://2012.33degree.org/talk/show/67)
- Microserviceは一連の小さなサービスで1つのアプリケーションを開発する手法
    - それぞれのサービスは自身のプロセスで動いており，軽量な機構（e.g., HTTP API）を通じて情報をやりとりする
    - これらのサービスは独立して自動デプロイされる
- 一枚岩として構築されるMonolithicスタイルのアプリケーションと比較すると分かりやすい
    - 一般的なエンタープライズのアプリケーションは，クライアントサイドのユーザインターフェース，データベース，サーバーサイドのアプリケーションの3つで構成される
    - サーバーサイドのアプリケーションは，HTTPリクエストを受け，データベースとやりとりし，クライアントにHTMLを返す
        - このようなサーバーサイドアプリケーションはMonolithicであり，システムへの変更は新しいバージョンのアプリケーションのビルドとデプロイを要する
- Monolithicシステムの構築は一般的には成功したスタイルである
    - リクエストを処理するロジックは単一のプロセスで動く
    - ロードバランサを配置しスケールアウトさせることもできる
- クラウドに多くのアプリケーションがデプロイされ始めるとMonolithicアプリケーションはフラストレーションになってきた
    - システムの変更サイクルは，全て結びついている
    - モジュール構造の維持や影響範囲の限定が困難になる
    - アプリケーションの一部だけスケールが必要なのに全体をスケールしなければならない
- これらのフラストレーションがMicroservicesアーキテクチャーを導きだした，Monolithicなアプリケーションと比較してMicroservicesは:
    - 独立してデプロイできる
    - 独立してスケールできる
    - しっかりしたモジュールの境界をもつ（影響範囲の限定）
    - 様々なプログラミング言語を利用できる
    - 異なるチームで運用できる
- Microservicesは新しい考え方ではない
    - 少なくともその根源はUNIXのデザイン哲学に立ち戻っている

## Microserviceの特徴

- 正式な定義はないが，共通の特徴を述べる
    - すべてのMicroservicesが全ての特徴を満たすわけではない

### サービスによるコンポーネント化

- コンポーネントを組み合わせてシステムを作りたい
- **コンポーネント**を入れ替え可能/アップグレード可能な独立したソフトウェアと定義する
- Microservicesはライブラリを使うが，主要なコンポーネント化はサービスへ分割することで行う
    - **ライブラリ**を1つのプログラム内で連結し，インメモリーで関数呼び出しを行うコンポーネントと定義する
    - **サービス**を別プロセス動作し，HTTPリクエストやRPCなどで連携するコンポーネントと定義する
- サービスをコンポーネントとして扱う主要な理由の1つは独立してデプロイできること
    - 良いMicroservicesアーキテクチャーはサービス間をなるべく粗結合にして，変更時のデプロイを少なくする
- サービスをコンポーネントとして扱うとインターフェースがより明確になる
- プロセス内のコールと比べてリモートのコールはコストが高いのでAPIはなるべく粗くある必要がある

### ビジネス能力に基づく組織化

- 巨大なアプリケーションを分割するとき普通は技術レイヤーでそれを区切る（[図](http://martinfowler.com/articles/microservices/images/conways-law.png)）
    - e.g., UIチーム，サーバーサイドチーム，データベースチーム
    - このようなチーム分割は，単純な変更を加えるだけでも際もチーム間の調整や予算承認が必要になる
    - [コンウェイの法則 - Strategic Choice](http://d.hatena.ne.jp/asakichy/20140502/1398981766)
- Microservicesはビジネス能力に基づきサービスの分割を行う（[図](http://martinfowler.com/articles/microservices/images/PreferFunctionalStaffOrganization.png)）
    - このようなサービスは，そのビジネス分野に対してUIやデータストレージ，外部連携といった幅広いスタックの実装が必要になる
    - 結果として，チームにはUXからデータベース，プロジェクト管理といったフルスタックな開発スキルが要求される
- Micorservicesの適切な粒度は？
    - 1サービスに数十人が参加している場合もあれば，1人で1サービスという例もある    

### プロジェクトではなくプロダクト

- ほとんどのアプリケーション開発はプロジェクトとして管理され，機能の一部がデプロイされて完遂する
    - 完遂するとソフトウェアはメンテナンスチームに引き渡されて，プロジェクトチームは解散する
- Microservicesでは，チームはプロダクトを持っていると意識する
    - これはAmazonの["you build, you run it"](https://queue.acm.org/detail.cfm?id=1142065)の考え方に影響を受けている
    - 開発者は常にプロダクションのソフトウェアの挙動やそれを利用するユーザのことを意識するようになる
- プロダクトとして考えることはそのビジネス能力について考えることにもなる
    - ソフトウェアを1つ1つが完遂するべき機能の集まりとしてではなく，ソフトウェアによりビジネス能力をいかに強化するかを継続して考えることになる
    
### スマートなエンドポイントと単純なパイプ

- Microservicesアプリケーションは，出来るだけ粗結合であることを目的にする
    - それぞれが独自のドメインロジックを持っていてUNIXのフィルターのように動作する
        - リクエストを受けて，適切なロジックを実行して，レスポンスを返す
    - BPELやWS-Choreographyのような複雑なプロトコルではなく，REST的な単純なプロトコルを用いる
- HTTP APIが用いられる
    - MicroservicesチームはWorld wide webに上に作られた原則やプロトコルを使う
- 軽量なメッセージングプロトコルも用いられる
    - RabbitMQやZeroMQなど
- Monolithicアプリケーションではメッセージのやりとりはインメモリーのメソッドの実行や関数呼び出しで行われる
    - MonolithicからMicroserviceへの移行ではパフォーマンスの低下が問題になる
    - 密なコミュニーションを粗めなコミュニーションと入れ替える必要がある
    
### 分散ガバナンス

- 中央政権的ガバナンスは単一の技術への統一へ向かう傾向がある
    - この手法は行き詰まる
    - 全ての問題が釘でそれに対する全ての解法がハンマーであるわけではない
- Microservicesは適切な場所で適切なツールを使うことを好む
    - Standupの簡単なレポートページを作るのにNode.jsを使っても良いし，リアルタイム性を求められる部分にC++を使っても良い
    - データベースも好きに選んでも良い
- "できる"であって"すべき"ではない，選択肢があるということ
- 分散ガバナンスの頂点は，Amazonにより有名になった"build it / run it"精神かもしれない
    - チームは運用を含め，構築したソフトウェア全ての側面に責任をもつ
    - このレベルの権限の委譲は普通のことではないが多くの企業が開発チームに多くの責任を与え始めている
    - 毎晩3時に起こされるとなると，コード書くときの質により集中するようになる

### 分散データ管理

- データ管理を分散させる方法は多く存在する
    - 抽象的なレベルで言うと，それはシステム間で現実世界の概念モデルが異なることを意味する
    - これは大きなエンタープライズ間の統合を行う時の共通の問題である
        - セールスから見た"customer"とサポートから見た"customer"は異なる
- この問題はアプリケーション間でも共通である
    - ドメイン駆動開発の["境界づけられたコンテキスト"](http://martinfowler.com/bliki/BoundedContext.html)で考えると良い
        - ドメイン駆動開発は，複雑なドメインを複数の境界づけられたコンテキストに分割し，それらの関係性をマップする（[図](http://martinfowler.com/bliki/images/boundedContext/sketch.png)）
- Microservicesはそれぞれのサービスがそれぞれデータベースを管理することを好む
    - Monolithicアプリケーションは一貫したデータの為に単一のデータベースを用いるのを好む
- データの分散管理は更新管理に影響を与える
    - 複数のリソースを更新する際，一般的には，一貫性を保つためにトランザクションを用いる
    - この方法は，Monolithicアプリケーションでも行われる
- このようなトランザクション処理は，一時的にサービス同士を結びつけることになる
    - 分散トランザクションは実装が難しく，結果としてMicroservicesは[サービス間でのトランザクション処理を行わないようにする](http://www.eaipatterns.com/ramblings/18_starbucks.html)
        - 一貫性は結果としての一貫性でしかないかもしれない
        - 問題は補完的な運用で処理される

### インフラの自動化

- Microservicesアプリケーションは，継続的デリバリーや継続的インテグレーションの経験をもつチームによって構築されている
    - このようなチームはインフラの自動化も行っている
    - ビルドパイプラインを作る（[図](http://martinfowler.com/articles/microservices/images/basic-pipeline.png)）
- ソフトウェアがちゃんと動作することを確認するために，十分な**自動テスト**を行う
    - そして新しい環境へ**自動デプロイ**も行う

### 障害設計

- サービスをコンポーネントとして扱うため，アプリケーションはサービスの障害に耐性のあるように設計される必要がある
    - サービスへのリクエストは失敗する可能性があるので，クライアントは出来る限り正常にこれに対応しなければならない
    - Microservicesチームはどのようにサービス障害がUXに影響を与えるかを常に考慮する
    - Netflixの[Simian Army](https://github.com/Netflix/SimianArmy)は，営業日であっても障害を誘発してアプリケーションの復旧とモニタリングをテストしている
- サービス障害はいつでも発生するので，いち早く障害を検知し，可能であれば自動で復旧させることが重要である
    - Microservicesはリアルタイムのモニタリングを重用視する
        - アーキテクチャー要素の監視（データベースが秒間どれだけのリクエストを受けているか）
        - ビジネスに関連したメトリクスの監視（分間どれだけの注文が発生したか）    

### 進化的設計

- サービスの分割により開発者は変化のスピードを落とすことなく変更をコントロールできる
- コンポーネント化するときどのように分割するのがよいか迷う
    - 独立して交換可能か，アップグレード可能かが重要
        - 他のコンポーネントに影響を与えることなく，コンポーネントを書き換えられるか
    - 多くのMicroservicesチームはサービスを長期間で進化させるより，廃棄されることを期待している
- [The Guardian](http://www.theguardian.com/uk)のウェブサイトはMonolithicとして設計されつつ，Microservices舵をきったよい例
    - まだMonolithicアプリケーションがコアであるが，新機能の追加には，MonolithicアプリケーションのAPIを使ってMicroservicesにより構築されている
    - この手法は，そもそも一時的な機能に追加するときに便利
    - そのようなウェブサイトの一部は開発速度の速い言語で構築され，簡単に統合することができるし，イベントが終了したらすぐに切り離すこともできる
- コンポーネント化するとより粗めのリリーススケジュールが立てられる
    - Monolithicアプリケーションでは，変更した際にアプリケーション全体をビルドし直してでプロイする必要があるが，Microservicesでは，変更を加えたサービスのみをデプロイし直せばよい
       - これはリリースのスピードを早める
    - 悪い点としてサービスの利用者に影響を与える
        - 伝統的な手法では，バージョニングによりこれを解決してきたが，Microservicesではそれを最後の手段にする
            - サプライヤーの変化に対して出来る限り耐性を持つようにデザインすれば多くのバージョニングを避けることができる
       
## Microservicesは未来か？

- Microservicesアプリケーションの先駆者としては，AmazonやNetflix，The Guardian，UK Government Digital Serviceなどが挙げられる
- Microservicesは経験的に良い結果が出ているが， 将来のソフトウェアアーキテクチャーの進むべき方向であるかは確証はない
- Microservicesはまだ十分に成熟していない
    - コンポーネントの境界をどこにするか決めるのは難しい
    - サービスの境界を超えたコードの移行は難しい
    - インターフェースの変更が大変
    - 後方互換を保つ必要がある
    - テストが複雑になる
    - 高いスキルが求められる
- Microservicesアーキテクチャーから始めるべきではない
    - Monolithicで初めて，モジュール性を保ち，問題になればそれをMicroservicesとして分割するのが良い

## 参考

### 英語

- [Migrating to Microservices](http://qconlondon.com/dl/qcon-london-2014/slides/AdrianCockcroft_MigratingToMicroservices.pdf) - [@adrianco](https://twitter.com/adrianco)氏によるNetflixにおけるMicroservicesの話．どのような技術を使っているのかや，デプロイはどうしているかなど，具体的な話をざっと掴める．
- [Microservices - Not A Free Lunch!](http://highscalability.com/blog/2014/4/8/microservices-not-a-free-lunch.html) - Microservicesのしんどい話．オペレーションが複雑になる，高いDevOpsスキルが必要になる，インターフェースの変更が困難，作業の重複，分散システムの複雑さ，テストが難しいなどなど．
- [MicroservicePrerequisites](http://martinfowler.com/bliki/MicroservicePrerequisites.html) - Martin Fowler氏による"Microservices"の続編．Microservicesを始めるために最低限必要なものまとめ．高速のプロビジョニング，基本的なモニタリング，高速な自動デプロイなど．
- ["Micro services - Java, the Unix Way"](http://2012.33degree.org/talk/show/67)
- [Microservices: Decomposing Applications for Deployability and Scalability](http://www.infoq.com/articles/microservices-intro)

### 日本語

- [マイクロサービス（microservices）とは何か — recompile.net](https://recompile.net/posts/microservices.html)
- [Rebuild: 55: Legacy Monolithic Macroservices (Naoya Ito)](http://rebuild.fm/55/)
- [クックパッドとマイクロサービス - クックパッド開発者ブログ](http://techlife.cookpad.com/entry/2014/09/08/093000)
- [“マイクロサービス化”で変化に耐えられる組織を目指す--クックパッド舘野CTO - ZDNet Japan](http://japan.zdnet.com/cio/sp_12executive/35052867/)
- [nodeconf.eu 1日目 (Future Node.js, microservices, hapi) - from scratch](http://yosuke-furukawa.hatenablog.com/entry/2014/09/09/174601)
- [マイクロサービス設計概論](http://www.infoq.com/jp/news/2014/06/introducing-microservices)
- [マイクロサービスとSOA](http://www.infoq.com/jp/news/2014/03/microservices-soa)


