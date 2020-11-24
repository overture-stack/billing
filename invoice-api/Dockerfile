# Copyright 2020(c) The Ontario Institute for Cancer Research. All rights reserved.

FROM node AS prebuilder

WORKDIR /app
COPY src/ /app/src/
COPY \
    tsconfig.json\
    package.json\
    yarn.lock\
    /app/

# Build JS
RUN \
  yarn install && \
  npx tsc -p .


##
# Jetison the prebuilder to keep the image compact
##
FROM node:slim as runtime
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Install
RUN \
  sed -i 's/# \(.*multiverse$\)/\1/g' /etc/apt/sources.list && \
  apt-get update && \
  apt-get -y upgrade && \
  apt-get install -y bash-completion vim && \
  apt-get clean

ENV NODE_ENV=production

WORKDIR /srv/invoice-api

COPY \
    run.sh\
    /srv/invoice-api/

COPY --from=prebuilder\
    /app/build/\
    /srv/invoice-api/build/

COPY --from=prebuilder\
    /app/node_modules/\
    /srv/invoice-api/node_modules/

# SET FILE PERMISSIONS
RUN chmod +x /srv/invoice-api/run.sh

# RUN INVOICE API
CMD ["/srv/invoice-api/run.sh"]
