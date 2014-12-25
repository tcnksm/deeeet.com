#!/bin/bash
# This is simple deploy script with rsync

DIR=$(cd $(dirname ${0})/../.. && pwd)
cd ${DIR}

# This is temporary operation to use same atom.xml's URL as previous blog
cp public/index.xml public/writing/atom.xml

# Send all files 
rsync -avze 'ssh -p 61203' --delete \
      --chmod=Du=rwx,Dg=rx,Do=rx,Fu=rw,Fg=r,Fo=r \
      public/ taichi@133.242.140.185:~/www/public
