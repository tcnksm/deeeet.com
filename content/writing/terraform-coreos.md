+++
date = "2015-01-07"
title = "TerraformでCoreOSクラスタを構築する"
cover_image = "terraform-coreos.png"
+++

[CoreOS](https://coreos.com/)は[DigitalOcean](https://coreos.com/docs/running-coreos/cloud-providers/digitalocean/)や[Amazon EC2](https://coreos.com/docs/running-coreos/cloud-providers/ec2/)，[OpenStack](https://coreos.com/docs/running-coreos/platforms/openstack/)などあらゆるクラウドサービスやプラットフォームで動かすことができる．1つのCoreOSクラスタを複数のクラウドサービスや自社のベアメタルサーバーにまたがって構築することもできるし，それが奨励されている．また，クラスタのマシンの数はサービスの成長や負荷状況によって増減させる必要もある．

このようなCoreOSクラスタの構築を簡単に，かつ[Infrastructure as Code](http://d.hatena.ne.jp/naoya/20131215/1387090668)的に再現可能な形で行いたい場合，Hashicorpの[Terraform](https://www.terraform.io/)を使うのがよさそう（個人的に試しているだけなので数百規模のマシンではなく，数十規模の話．もし膨大なマシン数になったときにどうするのがよいのか知見があれば知りたい）．

以下では，Terraformを使ってDigitalOcean上にCoreOSクラスタを構築する方法について書く．コードは全て以下のレポジトリにある．

- [tcnksm/deeeet.com/terraform](https://github.com/tcnksm/deeeet.com/tree/master/terraform)

## CoreOSの設定ファイル

まず，CoreOSの設定ファイルである[cloud-config](https://coreos.com/docs/cluster-management/setup/cloudinit-cloud-config/)を準備する．

```yaml
#cloud-config

coreos:
  etcd:
    discovery: https://discovery.etcd.io/XXXX
    addr: $private_ipv4:4001
    peer-addr: $private_ipv4:7001
  fleet:
    public-ip: $private_ipv4
    metadata: role=lb,provider=digitalocean
  units:
    - name: etcd.service
      command: start
    - name: fleet.service
      command: start
  update:
    group: alpha
    reboot-strategy: best-effort
```

`cloud-config`の設定項目についてはweb上に良い記事がたくさんあるのでここでは詳しくは書かない．ただし`fleet.metadata`に`role`や`provider`といった値を書いておくと，`fleet`でスケジューリングを行うときにより柔軟な設定ができるようになるので，状況に合わせて既述しておくとよい．

## Terraformの設定ファイル

次にTerraformの設定ファイルである`.tf`ファイルを準備する．ここでは以下の2つのファイルを準備する．

- `variables.tf` - 外部から与える設定値を定義する
- `main.tf` - [Provider](http://www.terraform.io/docs/providers/)と[Resource](https://www.terraform.io/docs/configuration/resources.html)を定義する

（Terraformは実行時にカレントディレクトリの`.tf`ファイルを全て読み込むのでファイルの分割は自由にやってよい．すべてを1つの`.tf`ファイルに書いてしまうことも可能．ただし，Providerやマシンの数が増えると管理がキツくなるので適宜分けるのがよい）

### variable.tf

まず，外部から与える設定値を`variables.tf`に定義する．ここには，例えばDigitalOceanのAPI Tokenのような設定ファイルには直接書きたくない設定値を定義し，コマンド引数`-var`でそれを受け取れるようにする．

```ruby
variable "digitalocean_token" {
  description = "DigitalOcean API token"
}

variable "ssh_key_id" {
  description = "ID of the SSH key to use DigitalOcean"
}
```

`ssh_key_id`はDigitalOceanに登録してあるSSH KeyのIDで以下で取得できる．

```bash
$ curl -X GET \
     -H "Authorization: Bearer ${DIGITALOCEAN_TOKEN}" \
     "https://api.digitalocean.com/v2/account/keys" | jq .
```

### main.tf

次に`main.tf`に[Provider](http://www.terraform.io/docs/providers/)と[Resource](https://www.terraform.io/docs/configuration/resources.html)を定義する．今回の場合はDigitalOceanのResourceにはDropletの定義，例えばRegionやイメージのサイズなどを既述する．ここでは例としてCoreOSのStableイメージを2つ立ち上げる．

```ruby
# Configure the DigitalOcean Provider
provider "digitalocean" {
  token = "${var.digitalocean_token}"
}

resource "digitalocean_droplet" "lb1" {
  name = "lb1"
  image = "coreos-stable"
  private_networking = true
  region = "sgp1"
  size = "512mb"
  ssh_keys = ["${var.ssh_key_id}"]
  user_data = "${file("cloud-config.yml")}"
}

resource "digitalocean_droplet" "web1" {
  name = "web1"
  image = "coreos-stable"
  private_networking = true
  region = "sgp1"
  size = "512mb"
  ssh_keys = ["${var.ssh_key_id}"]
  user_data = "${file("cloud-config.yml")}"
}
```

基本の設定項目はCoreOS以外のイメージを使った場合と同じだが，CoreOSの場合は`user_data`を使って`cloud-config`を渡すようにする．Terraformの`file`関数を使ってファイルの中身を与える．

## クラスタの構築

実際にクラスタを立ち上げる．`.tf`ファイルのあるディレクトリで以下を実行する．まず，`plan`で実行を確認する．

```bash
$ terraform plan \
    -var digitalocean_token=${YOUR_TOKEN} \
    -var ssh_key_id=${YOUR_SSH_KEY_ID}
```

良さそうなら以下で適用し，クラスタを立ち上げる．

```bash
$ terraform apply \
    -var digitalocean_token=${YOUR_TOKEN} \
    -var ssh_key_id=${YOUR_SSH_KEY_ID}
```

これでDigitalOcean上にCoreOSクラスタが立ち上がる．

とても簡単．さらに今どのような構成でクラスタが動いているのか，コードから確認することもできるし，`terraform show`コマンドでみることもできる．

### クラスタのマシンの増減させる

クラスタのマシンを増減させたいときは，`main.tf`の`resource`を増やせばよい．`resource`を書いただけマシンが立ち上がる．逆に`resource`を消せば，次の実行時にはクラスタのメンバからは消える．

またDigitalOcean以外に，例えばAWSなどにマシンを立てたければ，ProviderとそのResourceを追加すればよい．自社のサーバーを使いたいときなどにProviderが提供されてなければPluginを作ればよい（参考，["TerraformのProviderを作った - tkak's tech blog"](http://tkak.hatenablog.com/entry/2014/11/07/074044)）．


## 落ち穂拾い

本筋とは外れるがいくつか軽い話題を書いておく．

### DNSimpleと連携する

Terraformを使ってCoreOSクラスタのあるマシンをDNSimpleのレコードに登録するには，以下のような`.tf`ファイルを準備し，上記の`.tf`ファイルと一緒に実行すればよい．例えば`lb1`というResource名で立ち上げたマシンを登録する．

```ruby
# Configure the DNSimple Provider
provider "dnsimple" {
  token = "${var.dnsimple_token}"
  email = "${var.dnsimple_email}"
}

# Add a record to the domain
resource "dnsimple_record" "coreos-test" {
  domain = "coreos-test.com"
  name = "@"
  value = "${digitalocean_droplet.lb1.ipv4_address}"
  type = "A"
  ttl = 3600
}
```

### terraform.tfvarsを使う

Terraformを実行しているときに鬱陶しいなと思うのが`-var`引数．Providerが増える度にどんどん増えるし，覚えきれない．シェルスクリプトを書いても良いが，Terraformは`terraform.tfvars`というファイルを準備すれば，それを読み込んでくれるという仕組みを持つ．

例えば，上記の場合`digitalocean_token`と`ssh_key`を毎回与えないといけないが，以下のような`terraform.tfvars`を準備すると，`-var`引数なしで実行できるようになる（もちろんこの`terraform.tfvars`はレポジトリからは外す）．

```
digitalocean_token="YOUR_TOKEN"
ssh_key_id="YOUR_SSH_KEY_ID"
```

今後は，[Packer](https://packer.io/)のように`${env.NAME}`で環境変数から値を設定できるようなるかもしれない．

- [Environment variables in .tf files #62](https://github.com/hashicorp/terraform/issues/62)

## まとめ

Terraformを使ってDigitalOcean上にCoreOSクラスタを構築する方法について書いた．この方法は`.tf`ファイルの`resource`を増やすことでマシンを増減させる．ので，最初に書いたように数百規模ではなく，数十規模のマシン数では十分に使えるし，管理も楽にできる．

さらにマシン数が増えるなら`.tf`ファイルをプログラムで生成するなどの工夫が必要かなと思う．


### 参考

- [Terraform, CoreOS, and Digital Ocean](https://gist.github.com/andyshinn/92f9175a8cc79185314e)
- [CoreOSに入門した | SOTA](http://deeeet.com/writing/2014/11/17/coreos/)

