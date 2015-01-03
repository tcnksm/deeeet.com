FROM tcnksm/deeeet-com-base:1.0

# This is temporary operation.
# to use same atom.xml's URL as previous blog.
RUN cp /app/index.xml /app/writing/atom.xml

