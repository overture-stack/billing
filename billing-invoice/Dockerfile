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

WORKDIR /srv/billing-invoice

COPY \
    run.sh\
    /srv/billing-invoice/

COPY --from=prebuilder\
    /app/build/\
    /srv/billing-invoice/build/

COPY --from=prebuilder\
    /app/node_modules/\
    /srv/billing-invoice/node_modules/

RUN mkdir -p /srv/billing-invoice/csv

# SET FILE PERMISSIONS
RUN chmod +x /srv/billing-invoice/run.sh

# RUN EMAIL
CMD ["/srv/billing-invoice/run.sh"]
