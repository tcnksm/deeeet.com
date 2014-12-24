---

title: 'DockerHub公式の言語StackをCentOSに移植した'
date: 2014-11-04
comments: true
categories: docker
---

[DockerHub公式の言語Stack](http://deeeet.com/writing/2014/09/25/dockerhub-official-language-stacks/)が出て非常に便利になった．が，これらは全てdebianベースである．やんごとなき理由でCentOSを使わざるを得ないこともあるので，公式言語Stackの一部をCentOSに移植した．

とりあえず，[ruby](https://github.com/tcnksm/dockerfile-centos-ruby)，[rails](https://github.com/tcnksm/dockerfile-centos-rails)，[perl](https://github.com/tcnksm/dockerfile-centos-perl)，[node](https://github.com/tcnksm/dockerfile-centos-node)，[java](https://github.com/tcnksm/dockerfile-centos-java)を作成した．すべて公式の言語Stackをフォークして作成しているので，公式と同様の使い方ができる．また全て[Automated Build](https://docs.docker.com/docker-hub/builds/)しているので，DockerHubからインストールしてすぐに使える．

上の全てのイメージは，[HerokuのStack](https://github.com/heroku/stack-images/blob/master/bin/cedar.sh)的なイメージである[tcnksm/dockerfile-centos-buildpack-deps](https://github.com/tcnksm/dockerfile-centos-buildpack-deps)をベースにしている．もし他の言語のイメージを作成したい場合も，これをベースにすることができる．

ただ，どうしもイメージの容量は大きくなってしまった．その辺は注意してください... またCentOSは慣れてないのでおかしなところがあればIssueかtwitterで指摘してください．









