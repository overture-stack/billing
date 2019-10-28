# Copyright 2016(c) The Ontario Institute for Cancer Research. All rights reserved.

FROM ubuntu:18.04
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Install
RUN \
  sed -i 's/# \(.*multiverse$\)/\1/g' /etc/apt/sources.list && \
  apt-get update && \
  apt-get -y upgrade && \
  apt-get install -y build-essential libssl-dev && \
  apt-get install -y curl git man vim wget && \
  apt-get install -y python3 python3-dev virtualenv nginx libmysqlclient-dev

# NODE & NPM
RUN \
  wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash && \
  source ~/.nvm/nvm.sh && \
  nvm install 6.10.3 && \
  npm install -g npm && \
  mkdir -p /srv

ADD billing-api /srv/billing-api
ADD billing-ui /srv/billing-ui

# UI
WORKDIR /srv/billing-ui
RUN  \
  source ~/.nvm/nvm.sh && \
  npm install && \
  npm rebuild node-sass && \
  npm run build

# API
WORKDIR /srv/billing-api
RUN \
  virtualenv -p python3 env && \
  source env/bin/activate && \
  pip install -r requirements.txt && \
  pip install gunicorn

# NGINX
RUN rm -f /etc/nginx/sites-enabled/default
ADD nginx/billing.conf /etc/nginx/sites-enabled/billing.conf

RUN mkdir -p /var/log/gunicorn && mkdir -p /srv/billing-api/logs

# RUN FLASK API
CMD ["/srv/billing-api/run.sh"]
