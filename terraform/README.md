Terraforming deeeet.com
====

Setup [CoreOS](https://coreos.com/) cluster and connect them with [DNSimple](https://dnsimple.com) by [terraform](https://www.terraform.io/).

## Usage

First, run `plan` to check what happens.

```bash
$ terraform plan -var-file terraform.tfvars
```

Then, run `apply` to execute.

```bash
$ terraform apply -var-file terraform.tfvars
```

## Setup

You need `discovery` url for etcd get below command and edit `cloud-config.yml`. 

```bash
$ curl -w "\n" https://discovery.etcd.io/new
```
