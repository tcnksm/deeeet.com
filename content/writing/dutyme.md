+++
date = "2016-10-24T09:00:14+09:00"
title = "PagerDutyのOn-callを一時的に自分にアサインするdutymeというツールを書いた"
+++

現在のチームではインシデント管理に[PagerDuty](http://www.pagerduty.com/)を使っている．On-callはPrimaryとSecondaryの2人体勢でそれを1週間ごとにローテーションで回している．On-Callにアサインされている場合は夜中であれ日中であれPrimaryにアラートが飛ぶ（Primaryが反応できなければSecondaryにエスカレートされる）．そしてアラートを受けたら何かしらの対応を行う．

これはうまく回っているが問題もある．業務中（日中）はPrimaryやSecondaryに関係なくチームメンバーはどんどんデプロイしたりProduction環境で作業をしたりする．そしてオペレーションやデプロイ対象のコンポーネントによってはアラートが発生してしまうことがある．つまり作業者に関係なくアラートがPrimaryやSecondaryに飛んでしまう（Slackと連携しているので全員がそれをみることにはなるが）．

デプロイやオペレーションは各個人の責任でやっているのでまずは本人が対応するべきである．またPrimaryであれインシデントがない場合は自分のタスクに集中しているのでアラートが飛べばDisturbされてしまう（自分がPrimaryの場合は嫌だし自分のオペレーションで誰かをDisturbしたくもない）．そもそもスケジュールの粒度をもう少し細かく簡単に変更したい．

この問題を解決するために[`dutyme`](https://github.com/tcnksm/dutyme)というOn-callを一時的に自分にアサインするツールを書いた．以下ではこのツールの簡単な紹介を行う．なおコードは [tcnksm/dutyme](https://github.com/tcnksm/dutyme) に公開している．

## Requirement

`dutyme`を使うには[PagerDuty API v2](https://v2.developer.pagerduty.com/v2/page/api-reference)のTokenが必要になる．TokenはReadとWriteの権限を持っている必要がある．詳しくは["Generating an API Key – PagerDuty Support and Help"](https://support.pagerduty.com/hc/en-us/articles/202829310-Generating-an-API-Key)を参考．

## Usage

使い方は以下．

```bash
$ dutyme start
```

このコマンドを実行し必要な情報（PagerDutyのEmailスケジュール）を入力するだけでアサインが変更される．一度入力した情報はファイルに保存できるので次回からは何も入力することなくアサインを変更できる．

以下は利用の様子．

<img src="/images/dutyme.gif" class="image">


## How it works

`dutyme`はスケジュールを書き換えているわけではない．Pagedutyの[Override](https://support.pagerduty.com/hc/en-us/articles/202830170-Creating-and-Deleting-Overrides)という機能を使ってスケジュールの上書きをしている．なのでベースのスケジュールが壊れる心配はない（Overrideは消すのも簡単）．

実装はGo言語でclientには https://github.com/PagerDuty/go-pagerduty を使い（Go言語でPagerDuty関連のツールを作りたい場合はこれを使えば良さそう），tty プロンプトの制御には自分で書いた https://github.com/tcnksm/go-input を使っている．

## Install

インストールは`go get`もしくは`brew`が使える．

```bash
$ brew tap tcnksm/dutyme
$ brew install dutyme
```

## Conclusions

要望やBugなどは https://github.com/tcnksm/dutyme/issues までお願いします．現状は最低限使うための機能しかないがもう少し機能の追加はする予定．

