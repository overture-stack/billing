from flask import Flask, request, Response
from dateutil.parser import parse
from dateutil.relativedelta import *
from datetime import datetime
from collaboratory import Collaboratory
from auth import sessions
from config import default
import json
import decimal
from error import APIError, AuthenticationError, BadRequestError
from functools import wraps

app = Flask(__name__)
app.config.from_object(default)

app.secret_key = app.config['SECRET_KEY']

database = Collaboratory(app.config['MYSQL_URI'], app.logger)


def parse_decimal(obj):
    if isinstance(obj, decimal.Decimal):
        return int(obj)
    else:
        return obj


def authenticate(func):
    @wraps(func)
    def inner(*args, **kwargs):
        app.logger.info('Authorizing')
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            token = auth_header.split()[1]
            c = sessions.validate_token(app.config['AUTH_URI'], token)
            retval = func(c, *args, **kwargs)
            response = Response(json.dumps(retval, default=parse_decimal), status=200, content_type='application/json')
            response.headers['Authorization'] = sessions.renew_token(app.config['AUTH_URI'], token)
            return response
        else:
            raise AuthenticationError('Authentication required: Token not provided')
    return inner


@app.errorhandler(APIError)
def api_error_handler(e):
    return Response(e.response_body, status=e.code, content_type='application/json')


@app.route('/login', methods=['POST'])
def login():
    if 'username' not in request.json or 'password' not in request.json:
        raise BadRequestError('Please provide username and password in the body of your request')
    token = sessions.get_new_token(
        auth_url=app.config['AUTH_URI'],
        username=request.json['username'],
        password=request.json['password'])
    response = Response(status=200, content_type='application/json')
    response.headers['Authorization'] = token
    return response


@app.route('/projects', methods=['GET'])
@authenticate
def get_projects(client):
    tenants = map(lambda tenant: {'id': tenant.to_dict()['id'], 'name': tenant.to_dict()['name']}, client.tenants.list())
    return tenants


@app.route('/reports', methods=['GET'])
@authenticate
def calculate_cost_by_user(client):
    projects = request.args.get('projects')
    bucket_size = request.args.get('bucket')

    try:
        if 'fromDate' in request.args:
            original_start_date = parse(request.args.get('fromDate'), ignoretz=True)
        else:
            original_start_date = datetime(year=datetime.today().year, month=1, day=1)
        if 'toDate' in request.args:
            original_end_date = parse(request.args.get('toDate'), ignoretz=True)
        else:
            original_end_date = datetime.today()
    except ValueError:
        raise BadRequestError('Please define fromDate and toDate in the format YYYY-MM-DD')

    start_date = original_start_date
    end_date = original_end_date

    if projects is not None:
        project_list = projects.split(',')
    else:
        project_list = map(lambda tenant: tenant.to_dict()['id'], client.tenants.list())

    if bucket_size == 'daily':
        def same_bucket(start, end):
            return start.year == end.year and start.month == end.month and start.day == end.day

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(days=+1)
            return datetime(year=date_to_change.year, month=date_to_change.month, day=date_to_change.day)
    elif bucket_size == 'weekly':
        def same_bucket(start, end):
            start_iso = start.isocalendar()
            end_iso = end.isocalendar()
            return start_iso[0] == end_iso[0] and start_iso[1] == end_iso[1]

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(days=+1, weekday=SU(+1))
            return datetime(year=date_to_change.year, month=date_to_change.month, day=date_to_change.day)
    elif bucket_size == 'yearly':
        def same_bucket(start, end):
            return start.year == end.year

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(years=+1)
            return datetime(year=date_to_change.year, month=1, day=1)
    else:
        bucket_size = 'monthly'

        def same_bucket(start, end):
            return start.year == end.year and start.month == end.month

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(months=+1)
            return datetime(year=date_to_change.year, month=date_to_change.month, day=1)

    date_ranges = []
    while not same_bucket(start_date, end_date):
        current_start_date = start_date
        start_date = next_bucket(start_date)
        if start_date < end_date:
            date_ranges.append({'start_date': current_start_date.isoformat(), 'end_date': start_date.isoformat()})
        else:
            date_ranges.append({'start_date': current_start_date.isoformat(), 'end_date': end_date.isoformat()})

    if start_date < end_date:
        date_ranges.append({'start_date': start_date.isoformat(), 'end_date': end_date.isoformat()})

    report = []
    for bucket_range in date_ranges:
        records = database.get_usage_statistics(bucket_range['start_date'],
                                                bucket_range['end_date'],
                                                project_list)
        for record in records.all():
            record_dict = record.as_dict()
            record_dict['fromDate'] = bucket_range['start_date']
            record_dict['toDate'] = bucket_range['end_date']
            report.append(record_dict)

    return {'toDate': original_end_date.isoformat(),
            'fromDate': original_start_date.isoformat(),
            'bucket': bucket_size,
            'entries': report}



