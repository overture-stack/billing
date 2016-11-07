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

app.valid_bucket_sizes = app.config['VALID_BUCKET_SIZES']
app.pricing_periods = app.config['PRICING_PERIODS']

# Init pricing periods from strings to datetime
for period in app.pricing_periods:
    period['period_start'] = parse(period['period_start'])
    period['period_end'] = parse(period['period_end'])


def parse_decimal(obj):
    if isinstance(obj, decimal.Decimal):
        return int(obj)
    elif obj is None:
        return 0
    else:
        return obj


def authenticate(func):
    @wraps(func)
    def inner(*args, **kwargs):
        app.logger.info('Authorizing')
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split()[1]
            except IndexError:
                raise AuthenticationError('Cannot parse authorization token')
            c = sessions.validate_token(app.config['AUTH_URI'], token)
            new_token = sessions.renew_token(app.config['AUTH_URI'], token)
            database = Collaboratory(app.config['MYSQL_URI'], app.logger)
            retval = func(c, new_token['user_id'], database, *args, **kwargs)
            response = Response(json.dumps(retval, default=parse_decimal), status=200, content_type='application/json')
            response.headers['Authorization'] = new_token['token']
            return response
        else:
            raise AuthenticationError('Authentication required: Token not provided')
    return inner


@app.errorhandler(APIError)
def api_error_handler(e):
    return Response(e.response_body, status=e.code, content_type='application/json')


@app.route('/login', methods=['POST'])
def login():
    database = Collaboratory(app.config['MYSQL_URI'], app.logger)
    if 'username' not in request.json or 'password' not in request.json:
        raise BadRequestError('Please provide username and password in the body of your request')
    token = sessions.get_new_token(
        auth_url=app.config['AUTH_URI'],
        username=request.json['username'],
        password=request.json['password'])
    database.refresh_user_id_map()
    response = Response(status=200, content_type='application/json')
    response.headers['Authorization'] = token['token']
    return response


@app.route('/projects', methods=['GET'])
@authenticate
def get_projects(client, user_id, database):
    role_map = database.get_user_roles(user_id)
    tenants = map(lambda tenant: {'id': tenant.to_dict()['id'],
                                  'name': tenant.to_dict()['name'],
                                  'roles': role_map[tenant.to_dict()['id']]},
                  sessions.list_projects(client))

    return tenants


@app.route('/reports', methods=['GET'])
@authenticate
def generate_report_data(client, user_id, database):
    projects = request.args.get('projects')
    user = request.args.get('user')
    bucket_size = request.args.get('bucket')

    try:
        if 'fromDate' in request.args:
            original_start_date = parse(request.args.get('fromDate'), ignoretz=True)
        else:
            original_start_date = datetime(year=datetime.today().year, month=datetime.today().month, day=1)
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
        project_list = map(lambda tenant: tenant.to_dict()['id'], sessions.list_projects(client))

    role_map = database.get_user_roles(user_id)

    # Init lists to empty strings so that sql doesn't kill me
    billing_projects = ['']  # The projects we want to grab all info for
    user_projects = ['']     # The projects we want to only grab info for one user for
    for project in project_list:
        if project in role_map:
            if 'billing' in role_map[project]:
                billing_projects.append(project)
            else:
                user_projects.append(project)

    if user is not None and user == user_id:
        user_projects = user_projects + billing_projects
        billing_projects = ['']
    elif user is not None:
        user_projects = billing_projects
        billing_projects = ['']
    else:
        user = user_id

    date_ranges, bucket_size, same_bucket, next_bucket = divide_time_range(start_date, end_date, bucket_size)

    # Generate list of responses
    responses = []
    for bucket_range in date_ranges:
        records = database.get_usage_statistics(bucket_range['start_date'],
                                                bucket_range['end_date'],
                                                billing_projects,
                                                user_projects,
                                                user)
        for record in records:
            record['fromDate'] = bucket_range['start_date']
            record['toDate'] = bucket_range['end_date']
            record['cpuPrice'] = bucket_range['cpu_price']
            record['volumePrice'] = bucket_range['volume_price']
            record['username'] = database.get_username(record['user'])
            responses.append(record)

        images = database.get_image_storage_gigabyte_hours_by_project(bucket_range['start_date'],
                                                                      bucket_range['end_date'],
                                                                      billing_projects)
        for image in images:
            image['fromDate'] = bucket_range['start_date']
            image['toDate'] = bucket_range['end_date']
            image['imagePrice'] = bucket_range['image_price']
            image['user'] = None
            responses.append(image)

    def sort_results_into_buckets(report, item):
        for report_item in report:
            if (report_item['user'] == item['user'] and
                    report_item['projectId'] == item['projectId'] and
                    same_bucket(parse(report_item['fromDate']), parse(item['fromDate']))):
                report_item['fromDate'] = min(report_item['fromDate'], item['fromDate'])
                report_item['toDate'] = max(report_item['toDate'], item['toDate'])
                if report_item['user'] is not None:
                    if item['cpu'] is not None:
                        report_item['cpu'] += item['cpu']
                        report_item['cpuCost'] += round(parse_decimal(item['cpu']) * item['cpuPrice'], 4)
                    if item['volume'] is not None:
                        report_item['volume'] += item['volume']
                        report_item['volumeCost'] += round(parse_decimal(item['volume']) * item['volumePrice'], 4)
                else:
                    report_item['image'] += item['image']
                    report_item['imageCost'] += round(parse_decimal(item['image']) * item['imagePrice'], 4)
                return report

        new_item = {
            'fromDate': item['fromDate'],
            'toDate': item['toDate'],
            'user': item['user'],
            'projectId': item['projectId']
        }
        if new_item['user'] is not None:
            new_item['username'] = item['username']
            if item['cpu'] is not None:
                new_item['cpu'] = parse_decimal(item['cpu'])
                new_item['cpuCost'] = round(parse_decimal(item['cpu']) * item['cpuPrice'], 4)
            if item['volume'] is not None:
                new_item['volume'] = parse_decimal(item['volume'])
                new_item['volumeCost'] = round(parse_decimal(item['volume']) * item['volumePrice'], 4)
        else:
            new_item['image'] = item['image']
            new_item['imageCost'] = round(parse_decimal(item['image']) * item['imagePrice'], 4)
        report.append(new_item)
        return report
    report = reduce(sort_results_into_buckets, responses, list())

    return {'fromDate': original_start_date.isoformat(),
            'toDate': original_end_date.isoformat(),
            'bucket': bucket_size,
            'entries': report}


def divide_time_range(start_date, end_date, bucket_size):
    if bucket_size not in app.valid_bucket_sizes:
        bucket_size = 'daily'
    same_bucket, next_bucket = get_bucket_functions(bucket_size)

    pricing_periods = iter(app.pricing_periods)
    next_period = next(pricing_periods, None)
    period = next_period
    while start_date >= period['period_end'] and next_period is not None:
        next_period = next(pricing_periods, None)
        if next_period is not None:
            period = next_period

    date_ranges = []
    while not start_date == end_date:
        next_bucket_date = next_bucket(start_date)

        if start_date >= period['period_end'] and next_period is not None:
            next_period = next(pricing_periods, None)
            if next_period is not None:
                period = next_period

        if start_date < period['period_end']:
            period_end_date = min(next_bucket_date, period['period_end'], end_date)
        else:
            period_end_date = min(next_bucket_date, end_date)

        bucket = dict()
        bucket['start_date'] = start_date.isoformat()
        bucket['end_date'] = period_end_date.isoformat()
        bucket['cpu_price'] = period['cpu_price']
        bucket['volume_price'] = period['volume_price']
        bucket['image_price'] = period['image_price']

        date_ranges.append(bucket)

        start_date = period_end_date

    return date_ranges, bucket_size, same_bucket, next_bucket


def get_bucket_functions(bucket_size):
    if bucket_size == 'weekly':
        def same_bucket(start, end):
            start_iso = start.isocalendar()
            end_iso = end.isocalendar()
            return start_iso[0] == end_iso[0] and start_iso[1] == end_iso[1]

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(days=+1, weekday=MO(+1))
            return datetime(year=date_to_change.year, month=date_to_change.month, day=date_to_change.day)
    elif bucket_size == 'yearly':
        def same_bucket(start, end):
            return start.year == end.year

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(years=+1)
            return datetime(year=date_to_change.year, month=1, day=1)
    elif bucket_size == 'monthly':
        def same_bucket(start, end):
            return start.year == end.year and start.month == end.month

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(months=+1)
            return datetime(year=date_to_change.year, month=date_to_change.month, day=1)
    else:
        # Daily bucket size
        # Default bucket size, if not defined

        def same_bucket(start, end):
            return start.year == end.year and start.month == end.month and start.day == end.day

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(days=+1)
            return datetime(year=date_to_change.year, month=date_to_change.month, day=date_to_change.day)

    return same_bucket, next_bucket
