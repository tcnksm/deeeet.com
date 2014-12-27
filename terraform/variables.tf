variable "digitalocean_token" {
  description = "DigitalOcean API token"
}

variable "ssh_key_imac" {
  description = "ID of the SSH key of iMac to use DigitalOcean"
}

variable "ssh_key_mba" {
  description = "ID of the SSH key of MBA to use DigitalOcean"
}

variable "size" {
  description = "Size of DigitalOcean Droplet"
  default     = "512mb"
}
