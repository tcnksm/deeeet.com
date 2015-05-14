+++
date = "2015-05-11T22:35:55+09:00"
title = "Golang Cross Compiler on Heroku (with Docker)"
en = true
+++

Heroku unveils new CLI functionality `heroku docker:release` (cf. ["Heroku | Introducing 'heroku docker:release': Build & Deploy Heroku Apps with Docker"](https://blog.heroku.com/archives/2015/5/5/introducing_heroku_docker_release_build_deploy_heroku_apps_with_docker)). You can run Heroku's [Cedar](https://devcenter.heroku.com/articles/cedar) environment on Docker container and test your application in local environment (Environment parity). In addition to that, you can create [Slug](https://devcenter.heroku.com/articles/platform-api-deploying-slugs) from that docker image and deploy it directly to Heroku.

Before this release, Heroku provided the way to create Slug by [Buildpack](https://devcenter.heroku.com/articles/buildpacks). Buildpack is powerful but for me it's a little bit complex and hard to write from scratch. From this release you can create Slug from `Dockerfile`. It's more clearly and easy to understand.

So I played it and wrote a simple service, [tcnksm/gox-server](https://github.com/tcnksm/gox-server). This is a golang cross compile service and you can run it on Heroku (Sample application is on [https://gox-server.herokuapp.com/](https://gox-server.herokuapp.com/)). You don't need to prepare golang runtime on your local PC. You can get a binary from it (Currently support platform is Darwin/Linux/Windows, 386/amd64 and repository must be on Github). 

Usage is simple. Just provide github repository and user name. For example, if you want to get [github.com/Soulou/curl-unix-socket](https://github.com/Soulou/curl-unix-socket) compiled binary,

```bash
$ curl -A "`uname -sp`" https://gox-server.herokuapp.com/Soulou/curl-unix-socket > curl-unix-socket
$ chmod a+x curl-unix-socket
```

(This is just POC and playing with Heroku with Docker. Don't depend on this service for production tooling, you should prepare your own build environment. And if repository owner provides binary as release, you should use it.)

## Tips of writing Dockefile for Heroku

`Dockerfile` for this project is [https://github.com/tcnksm/gox-server/blob/master/Dockerfile](https://github.com/tcnksm/gox-server/blob/master/Dockerfile).

I've started from minimal template,

```bash
$ heroku docker:init --template minimal
Wrote Dockerfile (minimal)
```

Miminal requirement we must follow is below,

- Start `FROM heroku:cedar:14`
- Changes localized to the `/app` directory

While I was writing `Dockefile` for Heroku Slug, I got some tips. So I'll share them.

### Debugging

You can run application by `heroku docker:start` command. Actually this is just docker container, so you can enter it like you do `heroku run bash` for debug. Docker image name is `heroku-docker-${hash}-start`,

```bash
$ docker run -it heroku-docker-${hash}-start /bin/bash
```

Or using `exec` to running container.

### Slug size

Slug size must be under `300MB` ([https://devcenter.heroku.com/articles/slug-compiler#slug-size](https://devcenter.heroku.com/articles/slug-compiler#slug-size)). Check it by below commands,

```bash
$ docker run -it heroku-docker-${hash}-start /bin/bash
$ tar cfvz /tmp/slug.tgz -C / --exclude=.git --exclude=.heroku ./app
$ ls -lh /tmp/slug.tgz
```

(`tar` command is same as `heroku docker:release` command does)

### Procfile

You need to prepare `Procfile` to run the application.

In `Procfile`, you should not include environmental variable like `$PORT`. It works on Heroku, but doesn't work on local environment with `heroku docekr:start`. Because `Procfile` is  directly used for `docker run` command and environmental variable in `Procfile` would extract from your host machine, not docker container. So your need to read environment variable from your source code.

### WORKDIR

You may set `WORKDIR` on `Dockerfile`, root directory of `docker run`. To enable it on Heroku environment, you need to write `.procfile.d`, so that directory is changed when starting application.

```bash
ONBUILD RUN echo "cd /app/src/root"  >> /app/.profile.d/init.sh
```
