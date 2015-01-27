deeeet.com
====

[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)][license]

[license]: https://github.com/tcnksm/deeeet.com/blob/master/LICENSE

This is the repository for the [deeeet.com](http://deeeet.com/). This is a [Hugo](http://gohugo.io/) project, which is static site generator in golang.

## Service deploy

Every service or tool is containerized and released by `fleet`. CoreOS cluster is worked on DigitalOcean. To build CoreOS cluster on DigitalOcean, see [deeeet.com/terraform](/terraform). 

To release base service (blog and its discovery service), 

```bash
$ fleetctl start unit-files/instances/base/*
```

To release load-balancing service,

```bash
$ fleetctl start unit-files/static/basic/deeeet-com-lb.service
```

To release hook service (which is hooked dockerhub work and re-release base services),

```bash
$ fleetctl start unit-files/static/basic/deeeet-com-hook.service
```

## Local development

If you want to run the site at local environment, run the following commands.

```bash
$ go get -v github.com/spf13/hugo
$ hugo server --buildDrafts --watch
```

### Docker

You can run blog with docker, 

```bash
$ docker build -t tcnksm/deeeet-com .
$ docker run -p 80:80 tcnksm/deeeet-com
```

You can use automated build images. See DockerHub automated build status [here](https://registry.hub.docker.com/u/tcnksm/deeeet-com/).

### CoreOS

You can run blog on CoreOS. To run CoreOS cluster, 

```bash
$ vagrant up
```

You need to change `fleetctl` and `etcdctl` endpoint,

```bash
$ export FLEETCTL_ENDPOINT=http://172.20.20.101:4001
$ export ETCDCTL_PEERS=http://172.20.20.101:4001
```

After that, you just execute `fleet` command to start services.

## CSS Design

Design is written by [sass](http://sass-lang.com/). After editting it, run the following commands,

```bash
$ gem install sass
$ sass scss/main.scss static/css/main.css
```

## Author

[tcnksm](https://github.com/tcnksm)
