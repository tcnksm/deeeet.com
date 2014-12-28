FROM debian:wheezy
MAINTAINER tcnksm <nsd22843@gmail.com>

# Install dependencies
RUN apt-get update && apt-get install -y \
                curl \
                --no-install-recommends \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*


# Install nginx
RUN apt-get update && apt-get install -y nginx \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*

# Install confd
RUN cd /usr/local/bin \
    && curl -kL https://github.com/kelseyhightower/confd/releases/download/v0.7.1/confd-0.7.1-linux-amd64 -o confd \
    && chmod +x confd

# Delete default configurations
RUN rm /etc/nginx/sites-enabled/default
RUN rm /etc/nginx/nginx.conf

# Add new settings
ADD etc/nginx/nginx.conf /etc/nginx/nginx.conf
ADD etc/confd/conf.d/nginx.toml /etc/confd/conf.d/nginx.toml
ADD etc/confd/templates/nginx.tmpl /etc/confd/templates/nginx.tmpl
ADD usr/local/bin/confd-watch.sh /usr/local/bin/confd-watch.sh

CMD ["usr/local/bin/confd-watch.sh"]
