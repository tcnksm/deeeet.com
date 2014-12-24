---

title: 'Set up ruby test environment by Vagrant and Chef'
date: 2013-11-20
comments: true
categories: 
---

chefを使ってVagrantのVM上にrbenvによる複数バージョンのrubyがインストールされた環境をつくる，[tcnksm/vagrant-chef-ruby](https://github.com/tcnksm/vagrant-chef-ruby)．

まず，Vagrantによる試験環境の構築．今回は[Ubuntu Precise 12.04 (64 bit)](http://cloud-images.ubuntu.com/vagrant/)を使う．

``` bash
vagrant init precise64 http://files.vagrantup.com/precise64.box
```

Vagrantのプラグインである[vagrant-omnibus](https://github.com/schisamo/vagrant-omnibus)を使えば，VMを立ち上げるときに，chefがなければ自動でインストールをしてくれる．`vagrant plugin install vagrant-omnibus`でインストールし，Vagrantfileを以下のように記述．

``` ruby
Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  ...
  # vagrant-omnibus (setup chef-environment in vm)
  config.omnibus.chef_version = "11.4.0"
  ...
end
```

次に，chefによるrubyのインストール．rubyのインストールレシピは他でも使いたいのでcookbookを作成した，[tcnksm/chef-rubies](https://github.com/tcnksm/chef-rubies)．Berksfileに今回作成したcookbookを指定する．

``` ruby
cookbook 'rubies', :git => 'https://github.com/tcnksm/chef-rubies'
```

後は，`berks install --path cookbooks`でこれをインストールして，以下でVMに対してchefを実行すれば，ruby1.8.7，1.9.3，2.0.0がインストールされる．

``` bash
knife solo cook -c config/solo.rb host
```



