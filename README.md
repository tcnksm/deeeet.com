deeeet.com
====

[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)][license]

[license]: https://github.com/tcnksm/deeeet.com/blob/master/LICENSE

This is the repository for the [deeeet.com](http://deeeet.com/). This is a [Hugo](http://gohugo.io/) project, which is static site generator in golang.

## Local

If you want to run the site at local environment, run the following commands.

```bash
$ go get -v github.com/spf13/hugo
$ hugo server --buildDrafts --watch
```

Or run with docker.

```bash
$ docker run -p 80:80 tcnksm/deeeet-com
```

See DockerHub automated build status [here](https://registry.hub.docker.com/u/tcnksm/deeeet-com/).

Or run it on CoreOS.

```bash
$ vagrant up
$ export FLEETCTL_ENDPOINT=http://172.20.20.101:4001
$ export ETCDCTL_PEERS=http://172.20.20.101:4001
$ fleetctl start instances/*
$ fleetctl start static/
```

## Design

Design is written by [sass](http://sass-lang.com/). After editting it, run the following commands,

```bash
$ gem install sass
$ sass scss/main.scss static/css/main.css
```

## Author

[tcnksm](https://github.com/tcnksm)
