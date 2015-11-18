#!/bin/bash

echo "----> Remove draft"
cd public && git ls-files --others --exclude-standard | xargs rm && cd ..

echo "----> Run Hugo"
hugo

echo "----> Update atom"
cd public && mv index.xml writing/atom.xml
