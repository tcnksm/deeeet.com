---

title: 'ChefでOS Xの環境セットアップする'
date: 2013-10-16
comments: true
categories: 
---

[tcnksm/chef-dev-env](https://github.com/tcnksm/chef-dev-env) をつくった．以下のことができる．

- Homebrewパッケージのインストール
- dmgパッケージのインストール
- rubygemsのインストール
- dotfilesのインストールとセットアップ

OS X特有のレシピだとDockの設定とかできそうだけど，得にデフォで問題ないからやってない．
ここまできたら，AppStoreからのダウンロードもできたらなと思う．

インストール対象のパッケージはdata_bugsを使うといろいろ分けてすっきり書けた．
作業してて，これ使うなーと思ったらここにどんどん貯めていく感じで．

``` ruby
#data_bags/packages/homebrew.json
{
    "id": "homebrew",
    "targets": [
                "tig",
                "coreutils",
                "go",
                ....
                ]
}
```

で，後は以下のようにrecipeから呼び出して一気にインストール．

``` ruby
item = data_bag_item(:packages, "homebrew")
```

Ubuntuでの開発もやったりするからnode追加して，Ubuntu用も作る予定．

Chefの勉強のために始めた．こうやって自分の環境をコード的に作っていくのすごい楽しかった．

Chefの基礎と各ディレクトリの役割とかは["入門Chef Solo - Infrastructure as Code"](http://www.amazon.co.jp/%E5%85%A5%E9%96%80Chef-Solo-Infrastructure-as-Code-ebook/dp/B00BSPH158)を読んでほとんど理解できた．ChefをつかったOS Xのセットアップに関しては以下を参考にした．

- [Managing My Workstations With Chef](http://jtimberman.housepub.org/blog/2011/04/03/managing-my-workstations-with-chef/)
- [pivotal-sprout/sprout](https://github.com/pivotal-sprout/sprout)
- [dann/chef-macbox](https://github.com/dann/chef-macbox)




