Deploy deeeet.com by fleet
====

This is unit files to deploy deeeet.com on CoreOS cluster on DigitalOcean.

## UI

Control from [fleet-ui]().

```bash
$ docker run --rm -p 3000:3000 -e ETCD_PEER=${ETCD_PEER} -v ~/.ssh/deeeet-com:/root/id_rsa purpleworks/fleet-ui
```

## Usage

To start, [deeeet.com]() and its discovery services.

```bash
$ fleetctl start instances/*
```

To start, LB service.

```bash
$ fleetctl start static/deeeet-com-lb.service
```


