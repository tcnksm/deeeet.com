#!/bin/bash
# Create A(ddress) Record on DNSimple.
# DNSimple API document is here, http://developer.dnsimple.com/

# POST contents 
JSON="
{
    \"record\": {
        \"name\": \"\",
        \"record_type\": \"A\",
        \"content\": \"${BLOG_IP}\",
        \"ttl\": 3600
    }
}
"

# Create record
curl  -H "X-DNSimple-Token: ${DNSIMPLE_EMAIL}:${DNSIMPLE_TOKEN}" \
      -H "Accept: application/json" \
      -H "Content-Type: application/json" \
      -X POST \
      -d "${JSON}" \
      https://api.dnsimple.com/v1/domains/deeeet.com/records


echo "Check the DNS record configuration"
dig @ns1.dnsimple.com deeeet.com A

echo "Check the domain is using the DNSimple name server"
dig NS deeeet.com +short
