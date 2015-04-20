+++
date = "2015-04-20T22:55:35+09:00"
draft = true
title = "Docker 1.6のとRegistry2.0"
+++

##

```bash
$ docker run -p 5000:5000 registry:2.0
```

```bash
$ docker push localhost:5000/hello-mine:latest
```

```bash
$ docker pull localhost:5000/hello-mine@sha256:7b1e9b3abea717e7f58765376628fa1bffe0adbeb03ff0ddf348058ee9a5381f
```

```bash
$ curl -v -X GET http://localhost:5000/v2/hello-mine/manifests/latest
```

わかったこと

- Dockerfileにdigest値を指定してbuildしてもdigest値は付与されない

知りたいこと（TODO）

- 同じタグで複数のイメージをpushしてみる（manifestがどうなるか）
- digest値を知る方法，なければつくるか`docker-digest tcnksm/test:latest` list
- Signatureの使い道
- Registry 2.0の仕組みとか

## References

- [Docker Registry 2.0](https://docs.docker.com/registry/overview/)
- [Faster and Better Image Distribution with Registry 2.0 and Engine 1.6 | Docker Blog](http://blog.docker.com/2015/04/faster-and-better-image-distribution-with-registry-2-0-and-engine-1-6/)
- [Add support for referring to images by digest #11109](https://github.com/docker/docker/pull/11109)
- [kelseyhightower/docker-registry-osx-setup-guide](https://github.com/kelseyhightower/docker-registry-osx-setup-guide)

