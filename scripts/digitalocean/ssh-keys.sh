#!/bin/bash
# This script is used for getting ssh-key ID registered on DigitalOcean.

curl -X GET \
     -H "Authorization: Bearer ${DIGITALOCEAN_TOKEN}" \
     "https://api.digitalocean.com/v2/account/keys" | jq .

