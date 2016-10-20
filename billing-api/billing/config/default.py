DEBUG = True  # Debug mode for flask
SECRET_KEY = 'random, secret, super duper secret key'
AUTH_URI = 'http://142.1.177.124:5000/v2.0'  # Keystone/Identity API endpoint
MYSQL_URI = 'mysql://root:test@142.1.177.124:3306'  # Mysql URI
VALID_BUCKET_SIZES = ['daily', 'weekly', 'monthly', 'yearly']  # Bucketing options for query.
