---

title: 'Docker image with multiple versions of ruby'
date: 2013-12-12
comments: true
categories: docker
---

[tcnksm/docker-rbenv](https://github.com/tcnksm/docker-rbenv)

This can generate Docker image which is installed multiple versions of ruby by rbenv.

The image is pushed at docker.io, [tcnksm/rbenv](https://index.docker.io/u/tcnksm/rbenv/), so you can use it soon.

```
$ docker pull tcnksm/rbenv
```

or in Dockerfile,

```
FROM tcnksm/rbenv
```
## Dockerfile

I will describe this Dockerfile and how to edit it for your own image.

```
FROM base

MAINTAINER tcnksm "https://github.com/tcnksm"

# Install packages for building ruby
RUN apt-get update
RUN apt-get install -y --force-yes build-essential curl git
RUN apt-get install -y --force-yes zlib1g-dev libssl-dev libreadline-dev libyaml-dev libxml2-dev libxslt-dev
RUN apt-get clean

# Install rbenv and ruby-build
RUN git clone https://github.com/sstephenson/rbenv.git /root/.rbenv
RUN git clone https://github.com/sstephenson/ruby-build.git /root/.rbenv/plugins/ruby-build
RUN ./root/.rbenv/plugins/ruby-build/install.sh
ENV PATH /root/.rbenv/bin:$PATH
RUN echo 'eval "$(rbenv init -)"' >> /etc/profile.d/rbenv.sh # or /etc/profile

# Install multiple versions of ruby
ENV CONFIGURE_OPTS --disable-install-doc
ADD ./versions.txt /root/versions.txt
RUN xargs -L 1 rbenv install < /root/versions.txt

# Install Bundler for each version of ruby
RUN echo 'gem: --no-rdoc --no-ri' >> /.gemrc
RUN bash -l -c 'for v in $(cat /root/versions.txt); do rbenv global $v; gem install bundler; done'
```

Basically, this Dockerfile does what you do when you install multiple versions of ruby by yourself in Ubuntu environment.

1. Pull the base ubuntu image from docker.io (`FROM base`)
1. Install packages for building ruby (`RUN apt-get ...`)
1. Clone [rbenv](https://github.com/tcnksm/docker-rbenv/tree/master)
1. Clone [ruby-build](https://github.com/sstephenson/ruby-build)
1. Set environmental variable for rbenv (`ENV PATH /root/.rbenv/bin:$PATH`)
1. Set bash login command to read rbenv setting (`RUN echo 'eval "$(rbenv init -)"' >> /etc/profile.d/rbenv.sh`)
1. Add `versions.txt` which is defined ruby version which you want to install
1. Install ruby with `rbenv install`
1. Install bundler for each versions

If you want to install another version (this time, only 1.8.7, 1.9.3, 2.0.0), just edit `version.txt`.

Furthermore, if you want to install basic rubygems by Gemfile, add below,

```
ADD ./Gemfile /root/Gemfile
RUN bash -l -c 'cd /root/; for v in $(cat rubies.txt); do rbenv global $v; bundle install; done'
```

To build image,

``` bash
docker build -t USERNAME/IMAGENAME .
```

To push it to docker.io,

``` bash
docker login
docker push USERNAME/IMAGENAME

```

Reference

- [Docker for Rubyists](http://www.sitepoint.com/docker-for-rubyists/)
- [docker-plenv-vanilla](https://github.com/miyagawa/docker-plenv-vanilla)

