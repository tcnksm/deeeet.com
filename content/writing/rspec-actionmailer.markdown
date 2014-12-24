---

title: 'How to test ActionMailer'
date: 2013-11-07
comments: 
categories: ruby
---

Railsに付属の[actionmailer](https://github.com/rails/rails/tree/master/actionmailer)．Railsプロジェクトではなく，単独でも使うことができる．erbテンプレートが使えたり，htmlメールが送れるため，簡単なバッチをつくるときによく利用する．最小限の利用サンプルは[こちら](https://github.com/tcnksm/snippets/tree/master/ruby/actionmailer)．

テストできるのは，メール送信数と送信先，送信元，件名，本文．まず，spec_helperの設定．

``` ruby
ActionMailer::Base.delivery_method = :test
ActionMailer::Base.perform_deliveries = true
```

送信数．意図した数のメールが送られているか．

``` ruby
it "sends an mail" do
    expect(ActionMailer::Base.deliveries.count).to eq(1)
end
```

送信先．意図したアドレスに配信されたか．

``` ruby
it "renders the receiver mail" do
    expect(ActionMailer::Base.deliveries.first.to).to eq(["test@mail.net"])
end
```

送信元．意図したアドレスから配信されているか．

``` ruby
it "renders the sender mail" do
    expect(ActionMailer::Base.deliveries.first.from).to eq(["sender@mail.net"])
end
```

件名．意図した件名で配信されているか．

``` ruby
it "set the success subject" do
    expect(ActionMailer::Base.deliveries.first.subject).to match(/[Success]/)
end
```

本文．意図した本文で配信されているか．

``` ruby
it "sends the hello body" do
    expect(ActionMailer::Base.deliveries.first.body).to match(/Hello, #{user}./)
end
```

今回のテストはすべて[ここ](https://github.com/tcnksm/snippets/tree/master/ruby/actionmailer/spec)にまとめてある．
