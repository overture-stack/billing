# Billing for Cancer Collaboratory

[![](https://images.microbadger.com/badges/image/collaboratory/billing.svg)](https://microbadger.com/images/collaboratory/billing "Get your own image badge on microbadger.com")
[![](https://images.microbadger.com/badges/version/collaboratory/billing:1.0.0.svg)](https://microbadger.com/images/collaboratory/billing:1.0.0 "Get your own version badge on microbadger.com")

## Modules
* [billing-api](billing-api/README.md)
* [billing-ui](billing-ui/README.md)

## Running as a Docker Container
Pull the latest image:
```bash
$ docker pull collaboratory/billing
```

Once ready, you can run the image. The container has nginx listening on port 8080 so you will need to expose this port. Also you should pass in your configuration file. 

```bash
$ docker run -p <host_port>:8080 -v <path_to_config>/default.py:/srv/billing-api/billing/config/default.py collaboratory/billing 
```

The configuration file `default.py` takes the form of:
```python
DEBUG = False  # Debug mode for flask
SECRET_KEY = 'random, secret, super duper secret key'
AUTH_URI = 'http://<identity>/v2.0'  # Keystone/Identity API endpoint
MYSQL_URI = 'mysql://<user>:<pass>@<mysql_host>:3306'  # mysql URI
FLASK_LOG_FILE = '/srv/billing-api/logs/billing.log'
BILLING_ROLE = 'billing'
VALID_BUCKET_SIZES = ['daily', 'weekly', 'monthly', 'yearly']  # Bucketing options for query.
```

## License
* [GPLv3 License](LICENSE.md)
