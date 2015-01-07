# Configure the DigitalOcean Provider
provider "digitalocean" {
  token = "${var.digitalocean_token}"
}

# Configure the DNSimple Provider
provider "dnsimple" {
  token = "${var.dnsimple_token}"
  email = "${var.dnsimple_email}"
}
