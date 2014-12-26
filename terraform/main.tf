# Configure the DigitalOcean Provider
provider "digitalocean" {
  token = "${var.digitalocean_token}"
}

# Create a new droplet of CoreOS
resource "digitalocean_droplet" "deeeet-com-lb1" {
  # Here we select ubuntu but this will be replaced by
  # https://github.com/ibuildthecloud/coreos-on-do later
  name = "deeeet-com-lb1"
  image = "ubuntu-14-04-x64"
  private_networking = true
  region = "sgp1"
  size = "${var.size}"
  ssh_keys = ["${var.keys}"]

  # Place `cloud-config.yml`
  provisioner "file" {
    connection {
      user = "root"
      key_file = "${var.key_path}"
    }

    source = "cloud-config.yml"
    destination = "/root/cloud-config.yml"
  }

  # Execute coreos-on-do
  # This replaces Ubuntu to Coreos by using kexec
  provisioner "remote-exec" {
    connection {
      user = "root"
      key_file = "${var.key_path}"
    }

    inline = [
      "curl -sL -O https://raw.githubusercontent.com/ibuildthecloud/coreos-on-do/master/coreos-on-do.sh",
      "bash -l -i coreos-on-do.sh -V current -C alpha -c /root/cloud-config.yml"
    ]
  }  
}



