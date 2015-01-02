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

# Install Golang
ENV GOVERSION 1.4
RUN mkdir /goroot && curl https://storage.googleapis.com/golang/go${GOVERSION}.linux-amd64.tar.gz | tar xvzf - -C /goroot --strip-components=1
RUN mkdir /gopath

# Set Environmental variable for golang
ENV GOROOT /goroot
ENV GOPATH /gopath
ENV PATH $PATH:$GOROOT/bin:$GOPATH/bin

# Install fleet
RUN go get -d github.com/coreos/fleet/...
RUN cd $GOPATH/src/github.com/coreos/fleet && ./build && cp ./bin/fleetctl /usr/local/bin/.


# Install captainhook
RUN go get github.com/bketelsen/captainhook

# Setup captainhook
ADD etc/captainhook/update-deeeet-com.json /etc/captainhook/update-deeeet-com.json
ADD usr/local/bin/update-container.sh /usr/local/bin/update-container.sh

CMD ["captainhook","-listen-addr=0.0.0.0:8080","-echo","-configdir=/etc/captainhook"]
