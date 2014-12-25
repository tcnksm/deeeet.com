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

## Design

Design is written by [sass](http://sass-lang.com/). After editting it, run the following commands,

```bash
$ gem install sass
$ sass scss/main.scss static/css/main.css
```

## Author

[tcnksm](https://github.com/tcnksm)
