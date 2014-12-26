#!/bin/bash
# This is simple deploy script with rsync

DIR=$(cd $(dirname ${0})/../.. && pwd)
cd ${DIR}

# This is temporary operation to use same atom.xml's URL as previous blog
cp public/index.xml public/writing/atom.xml

# Send all files 
echo rsync -avze "'ssh -p ${BLOG_PORT}'" --delete \
      --chmod=Du=rwx,Dg=rx,Do=rx,Fu=rw,Fg=r,Fo=r \
      public/ taichi@${BLOG_IP}:~/www/public
