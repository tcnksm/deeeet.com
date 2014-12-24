---

title: 'Docker cheat sheet with examples'
date: 2013-12-08
comments: true
categories: docker
---

[Docker Cheat Sheet](https://gist.github.com/wsargent/7049221) is a nice documentation. It provides us Docker basic commands and system and It's easy to understand. But there are less exaples, I reconstructed it with real examples. You should refer above document about installation. 

## Set up

Pull a base image.

```
docker pull ubuntu
```

It's annoy to restore Container ID, you may forget to restore. You can set below alias. With this, you can get the ID of the last-run Container ([15 Docker tips in 5 minutes](http://sssslide.com/speakerdeck.com/bmorearty/15-docker-tips-in-5-minutes))


``` bash
alias dl='docker ps -l -q'
```


## Container

To create a Container. 

``` bash
docker run -d ubuntu /bin/sh -c "while true; do echo hello world; sleep 1; done"
```

To stop a Container.

``` bash
docker stop `dl`
```

To start a Container. 
``` bash
docker start `dl`
```

To restart a Container.

``` bash
docker restart `dl`
```

To Connect to a running Container.

``` bash
docker attach `dl`
```

To copy file in a Container to the host.

``` bash
docker cp `dl`:/etc/passwd .
```

To mount the directory in host to a Container.

``` bash
docker run -v /home/vagrant/test:/root/test ubuntu echo yo
```

To delete a Container.

``` bash
dockr rm `dl`
```

## Info of Container

To show running Containers. With `-a` option, it shows running and stopped Containers. 

``` bash
docker ps
```

To show Container information like IP adress.

``` bash
docker inspect `dl`
```

To show log of a Container. 

``` bash
docker logs `dl`
```

To show running process in a Container.

``` bash
docker top `dl`
```


## Image


To create a image from a Container. For tag name, \<username>/\<imagename\> is [recommended](http://docs.docker.io/en/latest/use/workingwithrepository/#committing-a-container-to-a-named-image). 

``` bash
docker run -d ubuntu /bin/sh -c "apt-get install -y hello"
docker commit -m "My first container" `dl` tcnksm/hello
```

To create a image with Dockerfile. 

``` bash
echo -e "FROM base\nRUN apt-get install hello\nCMD hello" > Dockerfile
docker build tcnksm/hello .
```

To login to a image. 

``` bash
docker run -rm -t -i tcnksm/hello /bin/bash
```

To push a imges to remote repository. You need to sign up to [Docker index](https://index.docker.io/) in advance. [Exmple uploaded image](https://index.docker.io/u/tcnksm/hello). 

``` bash
docker login
docker push tcnksm/hello
```

To delete a image

``` bash
docker rmi tcnkms/hello
```

## Info of Image

To show all images

``` bash
docker images
```

To show image information like IP adress.

``` bash
docker inspect tcnksm/hello
```

To show command history of a image. 

``` bash
docker history tcnksm/hello
```





