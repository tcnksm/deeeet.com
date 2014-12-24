---

title: 'Middlemanを使ってみた'
date: 2014-02-05
comments: true
categories: design
---

[deeeet.com](http://deeeet.com/)

[Middleman](http://middlemanapp.com/)は，[Haml](http://haml.info/)と[Sass](http://sass-lang.com/), [Compass](http://compass-style.org/)がデフォルトで使えるため，簡単にいい感じのサイトをつくることができる．例えば，[Packerの公式サイト](http://www.packer.io/)などMiddlemanで作られていてとてもいい感じだ（Githubのレポジトリみるかぎり，Mitchellさんデザインも自分でやっている...?）．他にも個人のBlogをMiddlemanで作ってるひともいる．今後，簡単なサイト立てるときはまた使いそうなので，まとめておく．

HamlやSassを使うために特別に設定を書く必要はない．ただ拡張子を，Hamlの場合は，`.html.haml`（laytoutファイルは`.haml`）に，Sassの場合は，`.scss`にしておけばよい．buildの際は，HamlはhtmlにSassはcssとして生成される．Sassは`:css_dir`のアンダースコアで始まらないファイルがcssとして吐き出される（つまり`@import`されるpartialなどは無視される）．

設定ファイルである`config.rb`では，Liveloadを有効にしておくと，ソースを更新する度に，ブラウザで再読み込みをしてくれるので便利．

```ruby
activate :livereload
```

デプロイなどはOctopressと同じように以下のようなRakeタスクを作っておくと楽になる．

```ruby
ssh_user       = ""
ssh_port       = ""
document_root  = "~/www/"
rsync_args     = ""
source         = "build"

desc "Build middleman"
task :build do
    system("middleman build")
end

desc "Deploy website via rsync"
task :deploy do
    puts "## Deploying website via Rsync"
    system("rsync -avze 'ssh -p #{ssh_port}' #{exclude} #{rsync_args} #{"--delete" unless rsync_delete == false} #{source}/ #{ssh_user}:#{document_root}")
end

desc "Build & deploy"
task :gen_deploy do
    Rake::Task["build"].invoke
    Rake::Task["deploy"].invoke
end
```

Compassは初めて使ったがとても便利だった．例えば，hoverしたときの色の変化にtransition効果（時間変化）をつけたいとする．この場合は，CompassのCSS3モジュールにmixinが準備されているので，以下のように呼び出してすぐに使える．

```css
@import "compass/css3/transition";
a:hover{
    color: $color-hover;
    @include transition-duration(1s);
}
```

他にも[公式のReference](http://compass-style.org/reference/compass/)のサンプル等を参考にすれば，複雑なCSSの知識なしにいろいろできる．

[Font Awesome](http://fortawesome.github.io/Font-Awesome/)も簡単に使える．middleman用のライブラリ[cristianferrarig/font-awesome-middleman](https://github.com/cristianferrarig/font-awesome-middleman)をインストールして，`:fonts_dir`に公式からダウンロードしたFontを配置するだけ．

今回作成したサイトのソースは[tcnksm/deeeet.com](https://github.com/tcnksm/deeeet.com/blob/master/source/stylesheets/parts/_header.scss)にある．

参考

- [CSSの常識が変わる！「Compass」、基礎から応用まで！ | 株式会社LIG](http://liginc.co.jp/designer/archives/11623)
