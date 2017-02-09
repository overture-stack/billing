#!/bin/bash
# Copyright 2016(c) The Ontario Institute for Cancer Research. All rights reserved.

service nginx restart
source env/bin/activate
gunicorn -w 4 -b 0.0.0.0:5000 billing_server.billing:app
