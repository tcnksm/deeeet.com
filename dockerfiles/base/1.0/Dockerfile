FROM debian:wheezy
MAINTAINER tcnksm <nsd22843@gmail.com>

# Install dependencies
RUN apt-get update && apt-get install -y \
                curl \
                build-essential \
                ca-certificates \
                git \
                mercurial \
                bzr \
                --no-install-recommends \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*

# Install nginx
RUN apt-get update && apt-get install -y nginx \
        && apt-get clean \
        && rm -rf /var/lib/apt/lists/*

# Install Golang
ENV GOVERSION 1.4
RUN mkdir /goroot && curl https://storage.googleapis.com/golang/go${GOVERSION}.linux-amd64.tar.gz | tar xvzf - -C /goroot --strip-components=1
RUN mkdir /gopath

# Set Environmental variable for golang
ENV GOROOT /goroot
ENV GOPATH /gopath
ENV PATH $PATH:$GOROOT/bin:$GOPATH/bin

# Installing hugo
RUN go get -v github.com/spf13/hugo
RUN go install github.com/spf13/hugo

# Setup nginx stop deamon mode
RUN echo "daemon off;" >> /etc/nginx/nginx.conf
ADD etc/nginx/sites-enabled/ /etc/nginx/sites-enabled/
EXPOSE 80

CMD ["/usr/sbin/nginx"]
