FROM tcnksm/deeeet-com-base:1.0

# Add site source and execute hugo to build the site.
ADD . /site-source
RUN cd /site-source && hugo
RUN cp -r /site-source/public /app/

# This is temporary operation.
# to use same atom.xml's URL as previous blog.
RUN cp /app/index.xml /app/writing/atom.xml

