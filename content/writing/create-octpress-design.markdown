---

title: 'Octopressのデザインテーマの作り方'
date: 2013-10-09
comments: true
categories: 
---

ブログのデザインを一新した．
良い機会なので3rd party Octopressテーマとして[公開した](https://github.com/tcnksm/mnmlpress)．

デザインテーマは`rake install[THEME]`でインストールできる．
このrakeのタスクがやっているのは単純で, ただsassとsourceを置き換えているだけ．

``` ruby
task :install, :theme do |t, args|
  cp_r "#{themes_dir}/#{theme}/source/.", source_dir
  cp_r "#{themes_dir}/#{theme}/sass/.", "sass"
end
```

作り方としては，

1. デフォルトのclassicや[3rd Party Octopress Themes](https://github.com/imathis/octopress/wiki/3rd-Party-Octopress-Themes)から気に入ったものをインストール
2. `rake preview`でローカルで表示しつつsassとsourceを編集
3. 完成したら，`.theme/YOUR_THEME`にsassと_postを抜いたsourceをコピー

とすればよい．簡単．

