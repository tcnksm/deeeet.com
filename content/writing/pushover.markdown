---

title: 'Pushover使ってみた'
date: 2014-02-09
comments: true
categories: ruby
---

[Pushover](https://pushover.net/)

PushoverはiOS/Androidの通知アプリ．提供されるシンプルなAPIを介して，アプリに通知を送れる．HTTP POSTさえできればよいので，Shell Scriptからでもrubyやperlからでも簡単に通知が送れる．

Rubyを使って遊んでみた．

```ruby
require 'net/https'

url = URI.parse("https://api.pushover.net/1/messages.json")

req = Net::HTTP::Post.new(url.path)
req.set_form_data({
                    token: "****",
                    user:  "****",                    
                    message: "Check this link, http://deeeet.com/",
                    title: "お知らせ",    
                    device: "tcnksm_iphone",        
                    url: "tel:117",
                    url_title: "Call now",
                    sound: "alien"
                    })
                    
res = Net::HTTP.new(url.host, url.port)
res.use_ssl = true
res.verify_mode = OpenSSL::SSL::VERIFY_PEER
res.start {|http| http.request(req)}
```

`user`はsign upするともらえるUser Key．`token`はアプリを登録するともらえるAPI Token. `message`は通知の本文． この3つが必須でこれだけでも通知は可能．

`title`は通知のタイトル．指定しない場合は登録したアプリ名が使われる．`device`は通知したいデバイスを指定する．指定しない場合は登録されている全てのデバイスに通知される．

通知は以下のような感じ．

<img src="/images/push_normal.PNG" class="image">

通知をタップすると，詳細が表示される．

<img src="/images/push_normal2.PNG" class="image">

通知本文内のURLは自動で判別されるため，ブラウザで開くことができる．`url`と`url_title`パラメータを与えれば，追加でURLを送ることもできる．これで長いURLも送ることができるし，アプリのURLスキームも使えるので，例えば上のように`tel:117`とすれば，タップでそのまま電話アプリを開いて117に電話するなんてこともできる（117はありえんが）．また`sound`パラメータで通知音を変更することもできる．使える音は[ここ](https://pushover.net/api#sounds)にある．

`priority`パラメータで通知のレベルも変更することができる．レベルは，Low(-1)，Normal(0)，High(1)，Emergency(2)の4つがある．

- Low: 通知は送られるが，通知音は鳴らない
- Normal: デフォルト．自分で設定するQuiet Hoursの間は通知音は鳴らない
- High: Quiet Hoursであっても通知音が鳴る
- Emergency: 通知内の確認ボタンをタップするまで通知音が鳴り続ける

例えば通知のレベルをHighにすると，通知は以下のように赤色になる．

<img src="/images/push_hp.PNG" class="image">

通知のレベルをEmergencyにする場合は，以下のように`retry`で通知の間隔，`expire`で通知の持続時間を指定する必要がある．

```ruby
req.set_form_data({
                    token: "****", 
                    user: "****",  
                    title: "めっちゃ緊急！",
                    message: "Something happen",
                    priority: 2,
                    retry: 30,
                    expire: 300,
                    })
```

通知は以下のように，Highより赤く表示される．

<img src="/images/push_em.PNG" class="image">

通知を止めるには，メッセージを開いて"Acknowledge Notification"をタップする必要がある．

<img src="/images/push_em2.PNG" class="image">

ざっと触ってみたけど簡単だった．基本，障害通知を意識して作られてる印象あるけど，もっといろいろ面白い使い道がありそう．[IFTTTのRecipe](https://ifttt.com/pushover)も作れるようになってる．IFTTTでは物足りないときに簡単にスクリプト組めそうでよい．

rubyしか見てないが，gemも既にある，[erniebrodeur/pushover](https://github.com/erniebrodeur/pushover)

参考

- 今回のサンプルのソース，[tcnksm/pushover](https://github.com/tcnksm/pushover)


