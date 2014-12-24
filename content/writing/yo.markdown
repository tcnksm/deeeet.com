---

title: 'ブログにYoボタンを設置した'
date: 2014-06-27
comments: true
categories: yo
---

最近はほとんどのコミュニケーションが**Yo**で完結している．得に日本はハイコンテキスト文化なので助かる．だいたい伝わってると思う．最近だと[Yoに人生を救われた](http://mizchi.hatenablog.com/entry/2014/06/24/210317)ひともいるくらいだ．

さて，ブログを書いたあとにわざわざ「ブログ書いたので読んでください」などと言うのは，粋じゃない．さらっと**Yo**するのが現代のスタイルだ．

ということで，**Yo**ボタンをブログに設置した．

<div id="yo-button"></div><br>

YoがインストールされたデバイスでこのYoボタンを押すと"SOTABLOG"というアカウントがYoのリストに登録される（PCとかだと手動で..）．すると，ブログ記事が更新される度に"SOTABLOG"から**Yo**されるようになる．


## 仕組み

といっても自分の個人アカウントが"SOTABLOG"で一人一人に手動で**Yo**するわけではない．[Yo Developers API](https://medium.com/@YoAppStatus/yo-developers-api-e7f2f0ec5c3c)を利用している．やり方は以下．

1. [http://yoapi.justyo.co/](http://yoapi.justyo.co/)から専用アカウントでAPIの登録する．しばらくするとメールで専用のAPI Tokenが送られてくる．
1. [http://button.justyo.co/](http://button.justyo.co/)で**Yo**ボタンを作成して，サイトに貼付ける．

あとは，以下のようにAPIを叩くと購読者全員に対して**Yo**される．

```bash
$ curl http://api.justyo.co/yoall/ -X POST -d "api_token=XXXXXX"
```

例えば，当ブログの場合は，Octopressを使っているので，`rake gen_deploy`の度にこのAPIを叩くようにしている．

他の事例としては，[YoApp/NFL](https://github.com/YoApp/NFL)がある．これはNFLの49erに対して，試合開始とともに**Yo**するスクリプト．他にも[サッカーのフランス代表チーム](http://yoequipedefrance.fr/)も使っているっぽい．

これからもっといろいろな使われ方が出現しそう．

### 参考

- [Yo - It's that simple.](http://www.justyo.co/)
- [Yo | TechCrunch](http://techcrunch.com/2014/06/18/yo-yo/)
- [Yo App World Cup Feature Alerts Users When Goals Are Scored](http://www.ibtimes.com/yo-app-world-cup-feature-alerts-users-when-goals-are-scored-1608964)

俺は何をしてんだ...
