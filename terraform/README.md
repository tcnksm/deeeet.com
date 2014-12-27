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

You need to register your ssh-key on DigitalOcean, [https://cloud.digitalocean.com/ssh_keys](https://cloud.digitalocean.com/ssh_keys).

```bash
$ ssh-keygen -q -t rsa -f ~/.ssh/coreos_digitalocean -N '' -C coreos_digitalocean
```

And to operate on CoreOS, you also need to register key to your ssh-agent.

```bash
$ ssh-add ~/.ssh/coreos_digitalocean
```

You also need discovery url for etcd get below command and edit `cloud-config.yml`. 

```bash
$ curl -w "\n" https://discovery.etcd.io/new
```

## References

- [Terraform, CoreOS, and Digital Ocean](https://gist.github.com/andyshinn/92f9175a8cc79185314e)
