# Add a record to the domain
resource "dnsimple_record" "deeeet-com" {
  domain = "deeeet.com"
  name = "@"
  value = "${digitalocean_droplet.deeeet-com-lb1.ipv4_address}"
  type = "A"
  ttl = 3600
}

