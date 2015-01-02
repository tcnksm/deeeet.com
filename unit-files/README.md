Deploy deeeet.com by fleet
====

This is unit files to deploy deeeet.com on CoreOS cluster on DigitalOcean.

## Usage

To start, [deeeet.com]() and its discovery services.

```bash
$ fleetctl start instances/*
```

To start, LB service.

```bash
$ fleetctl start static/deeeet-com-lb.service
```


