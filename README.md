<h1 align="center">Cancer Collaboratory Billing App</h1>

<p align="center"><img alt="General Availability" title="General Availability" src="http://www.overture.bio/img/progress-horizontal-GA.svg" width="320" /></p>

[![](https://images.microbadger.com/badges/image/collaboratory/billing.svg)](https://microbadger.com/images/collaboratory/billing "Get your own image badge on microbadger.com")
[![](https://images.microbadger.com/badges/version/collaboratory/billing:1.0.0.svg)](https://microbadger.com/images/collaboratory/billing:1.0.0 "Get your own version badge on microbadger.com")  

<p align="center">
    <img alt="arch" title="Reporting by cost" src="/docs/billing_cost.png">
</p>
<p align="center">
  Reporting by cost
</p>  
<br>
<p align="center">
    <img alt="arch" title="Reporting by usage" src="/docs/billing_usage.png">
</p>
<p align="center">
  Reporting by usage
</p>    
<br>

## Modules
* [billing-api](billing-api/README.md)
* [billing-ui](billing-ui/README.md)



## Running as a Docker Container
Pull the latest image:
```bash
$ docker pull collaboratory/billing
```
A configuration file `globalConfig.json` should be created and edited in root folder first. It takes the form of 
```javascript
  {
      "billing_api": {
          "DEBUG": false, // Debug mode for flask
          "SECRET_KEY": "random, secret, super duper secret key",
          "AUTH_URI": "http://<identity>/v2.0", // Keystone/Identity API endpoint
          "INVOICE_API": "http://localhost:4000/invoice",
          "MYSQL_URI": "mysql://<user>:<pass>@<mysql_host>:3306", // mysql URI
          "TEST_MYSQL_URI": "mysql://<user>:<pass>@<mysql_host>:3306",
          "VALID_BUCKET_SIZES": [
              "daily",
              "weekly",
              "monthly",
              "yearly"
          ], // Bucketing options for query.
          "FLASK_LOG_FILE": "./logs/billing.log",
          "BILLING_ROLE": "billing_test",
          "INVOICE_ROLE": "invoice_test",
          "OICR_ADMIN": "oicr_admin",
          "OICR_ADMINS": [
              "Rahul.Verma@oicr.on.ca",
              "Sid.Joshi@oicr.on.ca"
          ],
          "PRICING_PERIODS": [
              {
                  "period_start": "2013-01-01",
                  "period_end": "2016-11-03",
                  "cpu_price": 0.04,
                  "volume_price": 0.02,
                  "image_price": 0.04
              },
              {
                  "period_start": "2016-11-03",
                  "period_end": "2016-12-22",
                  "cpu_price": 0.06,
                  "volume_price": 0.03,
                  "image_price": 0.03
              }
          ],
          "DISCOUNTS": {
              "oicr_demo_rahul": [
                  {
                      "period_start": "2017-05",
                      "period_end": "2017-05",
                      "discount": 0.9
                  },
                  {
                      "period_start": "2017-06",
                      "period_end": "2017-06",
                      "discount": 0.7
                  }
              ],
              "oicr_demo_dusan": [
                  {
                      "discount": 0.8
                  }
              ]
          }
      },
      "billing_ui": {
          "API_ENDPOINT": "http://localhost:5000"
      }
  }
```
Once ready, you can run the image. The container has nginx listening on port 8080 so you will need to expose this port. Also you should pass in your configuration file. 

```bash
$ docker run -p <host_port>:8080 -v <path_to_config>/default.py:/srv/billing-api/billing/config/default.py collaboratory/billing 
```


## License
* [GPLv3 License](LICENSE.md)
