Terraforming deeeet.com
====

Setup [CoreOS](https://coreos.com/) cluster and connect them with [DNSimple](https://dnsimple.com) by [terraform](https://www.terraform.io/).

## Usage

First, run `plan` to check what happens.

```bash
$ terraform plan
```

Then, run `apply` to execute.

```bash
$ terraform apply
```

## Setup

First you need to create ssh-key and register it on [https://cloud.digitalocean.com/ssh_keys](https://cloud.digitalocean.com/ssh_keys). And when terraforming, set above key id as `var.ssh_key_id`. 

```bash
$ ssh-keygen -q -t rsa -f ~/.ssh/deeeet-com -N '' -C deeeet-com
```

To operate on CoreOS, you also need to register key to your ssh-agent.

```bash
$ ssh-add ~/.ssh/deeeet-com
```
