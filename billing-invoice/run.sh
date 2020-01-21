#!/bin/bash
source ~/.nvm/nvm.sh

# Date format: YYYY-MM
if [ -z "$BILL_PERIOD" ]; then
  BILL_PERIOD=`date '+%Y-%m' --date '1 month ago'`
fi

if [ -z "$PROJECTS" ]; then
  PROJECTS="ALL"
fi

node /srv/billing-invoice/build/index.js /srv/billing-invoice/config.json $BILL_PERIOD $PROJECTS
