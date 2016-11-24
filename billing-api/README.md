# Billing API

## Requirements
* Python2.7 & pip
* MySQL development libraries
* Virtualenv

## Building / Running

```bash
virtualenv -p python2 env
source env/bin/activate
pip install -r requirements.txt
python run.py
```

## Testing
To run the automated tests, run `pytest` on any of the test___.py files in `billing_server/tests/`

For example run `pytest test_usage_queries.py`

## Developing on a Mac
Getting lib files for MySQL is a little tricky for the mysql-python dependency when using a mac. 

Download MySQL: http://dev.mysql.com/downloads/mysql/

Add the following to your `~/.profile`:
```bash
export PATH=/usr/local/mysql/bin:$PATH
export DYLD_LIBRARY_PATH=/usr/local/mysql/lib/
```