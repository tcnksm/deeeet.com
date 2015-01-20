---

title: '複数プロジェクトを抱えるチームでのデプロイ自動化'
date: 2014-10-30
comments: true
categories: 
---

1つのチームで，10以上のプロジェクト，コードベースを抱える場合にどのようにデプロイの自動化を進めたか，工夫したこと，考慮したことなどをまとめておく．

デプロイツールには，Python製の[fabric](http://www.fabfile.org/en/latest/)を採用しているが，他のツールでも同様のことはできそう．なお，fabricの基本的な使い方などは既にインターネット上に良い記事がたくさんあるので書かない（最後の参考の項を見てください）．


## fabricの選択

シェルスクリプトとCapistranoを考慮した．

まず，シェルスクリプトは人によって書き方が違うため，統一が難しくメンテナンスコストも高い．また共通化も難しい．

次に，Capistranoは，裏でやってくれることが多く，学習コストも高い．プロジェクトによってはかなり特殊な環境へのデプロイも抱えているため，Capistranoの前提から外れることがあった．また，自分独りなら問題ないが，チームの負担が大きくなると感じた．

fabricは全てを自分で記述する必要がある．それは欠点である一方利点でもある．例えば，特殊な要件であっても柔軟に対応することができる．また，最初に自分が頑張れば，既述の統一や共通化により最小のフレームをつくり，チームメンバーへの負担も少なくできると感じた．

このような理由からfabricを採用した．

## 戦略

デプロイスクリプト（ここでは`fabfile.py`）は以下のように1つの専用のレポジトリ内にプロジェクトごとに作成した．理由としては，プロジェクトの数が多い場合，コードベースごとにデプロイスクリプトを抱えるのは，自動化の推進の弊害になるため．デプロイスクリプトをバラバラに管理すると，プロジェクトごとに独自文化が生まれ，統一を失うと感じたため．また，後述する共通化が困難になるため．

```bash
.
├── README.md
├── projectA
│   ├── README.md
│   └── fabfile.py
├── projectB
│   ├── README.md
│   └── fabfile.py
├── projectC
│   ├── README.md
│   └── fabfile.py
.
.
```

デプロイは開発者の手元からではなく，デプロイサーバから行う．これによりワークフローもシンプルになる．デプロイ時には専用のサーバにログインし，プロジェクトのディレクトリに移動して，`fab`コマンドを叩けば良い．またそのプロジェクトに入っていないひとでもデプロイを行うこともできる（ChatOpsの実現も容易）．

`README.md`も重要である．プロジェクトごとに考慮するべきことは全て`README.md`を見れば良いようにした（参考，["わかりやすいREADME.mdを書く"](http://deeeet.com/writing/2014/07/31/readme/)）．

## 共通化

プロジェクトは違っても，例えば，チャットツールへの通知やコードのチェックアウト，ビルドは共通化できる．共通化しておくことで，新しいプロジェクトの自動化の展開が容易になる．そのプロジェクト特有なものだけ既述して，あとは共通化したものを呼び出すだけでよくなる．

以下のように，レポジトリのトップレベルに`common`ディレクトリを作成し，共通作業をまとめるようにする．

```bash
common
├── __init__
├── git.py
├── hipchat.py
├── build.py
.
.
```

使うときは，各プロジェクトの`fabfile.py`からそれを呼び出すようにする．

```python
sys.path.append(os.pardir)
from common import git,hipchat,java
```

## 用語の統一

複数のプロジェクトを扱う場合，用語の統一は，属人性を廃して複数の開発者がどのプロジェクトでもデプロイできるようにするために非常に重要である．用語とは，例えば，`fab`コマンドと共に叩く関数名のことである．せっかく自動化しても，プロジェクトごとに様々なコマンドが存在したり，叩くべきコマンドが複雑になっては意味がない．

例えば，リリースは全て以下のように統一している（`stg`環境に`feature/ABC`ブランチをデプロイするという意味）．

```bash
$ fab stg release:feature/ABC
```

用語の統一は大変で，ドキュメント等でチームに周知し，コードレビューをしっかりやるしかない（できれば簡単なlintツールとかを作りたい）．

## 優しさ

[失敗する前提でデプロイする - hitode909の日記](http://hitode909.hatenablog.com/entry/2014/02/01/154226)

この記事がとても好きで，同じようなことを実践している．不測の自体や失敗は必ず起きる．そう言った場合に「次はこうすればよいですよ！」と指示を具体的なコマンドとともに表示するようにしている．用語は統一していても，特に初心者がいる場合にこういった優しさは大切になる．

## まとめ

俺が通り過ぎた後には自動化されたシステムしか残らない．

## 参考

### fabricについて

- [Fabric Essentials](http://www.slideshare.net/mumumu/fabric-essentials-28142569)
- [今日からすぐに使えるデプロイ・システム管理ツール Fabric 入門 - 科学と非科学の迷宮](http://shiumachi.hatenablog.com/entry/20130414/1365920515)
- [俺達のFabric 〜余計な仕事はFabricに任せよう〜｜サイバーエージェント 公式エンジニアブログ](http://ameblo.jp/principia-ca/entry-11925739692.html)
- [Python製デプロイツール Fabricを初めて使う際に役立つTips](http://dekokun.github.io/posts/2013-04-07.html)
- [Chefに挫折したあなたへ．Fabricのすすめ](http://hozumi.github.io/2013/03/chef-fabric-ja.html)
- [Fabric デプロイツールのPythonicな書き方 - Ian Lewis](http://www.ianlewis.org/jp/fabric-pythonic)

### 自動化や開発フローについて

- [はてなブログチームの開発フローとGitHub // Speaker Deck](https://speakerdeck.com/shibayu36/hatenaburogutimufalsekai-fa-hurotogithub)
- [スケールする開発組織の作り方 #jawsug // Speaker Deck](https://speakerdeck.com/naoya/sukerusurukai-fa-zu-zhi-falsezuo-rifang-number-jawsug)
- [SmartNewsにおける開発の考えかた // Speaker Deck](https://speakerdeck.com/kaiseh/smartnewsniokerukai-fa-falsekao-ekata)
- [kintoneを支えるKAIZENの技術 | Cybozu Inside Out | サイボウズエンジニアのブログ](http://developer.cybozu.co.jp/tech/?p=7021)
- [Cookpad's deployment and auto scaling // Speaker Deck](https://speakerdeck.com/mirakui/cookpads-deployment-and-auto-scaling)
- [ワンクリックデプロイ 〜いつまで手でデプロイしてるんですか〜 #devsumiA](http://www.slideshare.net/Ryuzee/devsumia)
- [ChatOps at GitHub // Speaker Deck](https://speakerdeck.com/jnewland/chatops-at-github)
- [Rebuild: 47: Live From GitHub Kaigi (Naoya Ito)](http://rebuild.fm/47/)
