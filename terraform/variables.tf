variable "digitalocean_token" {
  description = "DigitalOcean API token"
}

variable "keys" {
  description = "ID of the SSH keypair to use DigitalOcean"
}

variable "key_path" {
  description = "Path to the private portion of the SSH key specified"
  default = "~/.ssh/coreos_digitalocean"
}

variable "size" {
  description = "Size of DigitalOcean Droplet"
  default     = "512MB"
}
