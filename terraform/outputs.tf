output "deeeet-com-lb1" {
  value = "${digitalocean_droplet.deeeet-com-lb1.ipv4_address}"
}

output "deeeet-com-web1" {
  value = "${digitalocean_droplet.deeeet-com-web1.ipv4_address}"
}
