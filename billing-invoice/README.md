# Billing Invoice
This module is responsible for creating billing invoice reports and emailing them to the billing users of projects.

## Building
The source code is written in Typescript and can be compiled with the Typescript compiler.

```bash
npm install -g typescript
npm install
tsc -p .
```

## Running

### From source:

```bash
node build/index.js <path_to_config> <path_to_email.html> [<month_num: 0-11> <project0,project1>]
```

### As a docker container:

```bash
docker pull collaboratory/billing-invoice:latest
docker run -v <path_to_config>:/srv/billing-invoice/config.js -v <path_to_email>:/srv/billing-invoice/collab-billing.html collaboratory/billing-invoice
```
