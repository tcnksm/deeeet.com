---

title: 'シンプルにVagrantのprovisioningでchef-soloを使い始める'
date: 2014-02-16
comments: true
categories: vagrant
---

とにかくシンプルに始めたい．cookbookの作成には`knife-solo`を使う．例としてapacheのインストールをして，共有フォルダをホストのブラウザから閲覧できるようにする．

まずレシピの雛形を生成する．

```bash
$ knife cookbook create apache -o site-cookbook
```

次にレシピの編集する．

```ruby
# recipes/default.rb

# Install apache
execute "apt-get update"
package "apache2" do
    action :install
end

# Link to share folder
execute "rm -fr /var/www"
link "var/www" do
    to "/vagrant"
end
```

Vagrantfileは以下のようにする．

```
Vagrant.configure("2") do |config|
    config.vm.box = "precise64"
    config.vm.box_url = "http://files.vagrantup.com/precise64.box"
    config.vm.network :forwarded_port, guest: 80, host: 8080
    config.vm.provision :chef_solo do |chef|
        chef.cookbooks_path = "site-cookbooks"
        chef.run_list = ["apache::default"]
    end
end
```
