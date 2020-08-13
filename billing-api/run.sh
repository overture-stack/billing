#!/bin/bash
# Copyright 2020(c) The Ontario Institute for Cancer Research. All rights reserved.

echo "starting api"
service nginx restart
source env/bin/activate
gunicorn --log-level debug --access-logfile /srv/billing-api/logs/gunicorn/access.log --error-logfile /srv/billing-api/logs/gunicorn/error.log -w 6 -b 0.0.0.0:5000 billing_server.billing:app 
