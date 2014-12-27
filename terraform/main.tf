# Configure the DigitalOcean Provider
provider "digitalocean" {
  token = "${var.digitalocean_token}"
}

# Create a new droplet of CoreOS
# This droplet is used for gate for dnsimple
resource "digitalocean_droplet" "deeeet-com-lb1" {
  name = "deeeet-com-lb1"
  image = "coreos-stable"
  private_networking = true
  region = "sgp1"
  size = "${var.size}"
  ssh_keys = ["${var.ssh_key_imac}","${var.ssh_key_mba}"]
  user_data = "${file("cloud-config.yml")}"
}

resource "digitalocean_droplet" "deeeet-com-web1" {
  name = "deeeet-com-web1"
  image = "coreos-stable"
  private_networking = true
  region = "sgp1"
  size = "${var.size}"
  ssh_keys = ["${var.ssh_key_imac}","${var.ssh_key_mba}"]
  user_data = "${file("cloud-config.yml")}"
}




