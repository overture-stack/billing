DEBUG = True  # Debug mode for flask
SECRET_KEY = 'random, secret, super duper secret key'
AUTH_URI = 'http://142.1.177.124:5000/v2.0'  # Keystone/Identity API endpoint
MYSQL_URI = 'mysql://root:test@142.1.177.124:3306'  # Mysql URI
VALID_BUCKET_SIZES = ['daily', 'weekly', 'monthly', 'yearly']  # Bucketing options for query.
PRICING_PERIODS = [
    {
        'period_start': '2016-01-01',
        'period_end': '2016-10-15',
        'cpu_price': 0.01,
        'volume_price': 0.001,
        'image_price': 0.001
    },
    {
        'period_start': '2016-10-15',
        'period_end': '2016-12-01',
        'cpu_price': 0.02,
        'volume_price': 0.002,
        'image_price': 0.002
    }
]
