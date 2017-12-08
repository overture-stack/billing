# Copyright (c) 2016 The Ontario Institute for Cancer Research. All rights reserved.
#
# This program and the accompanying materials are made available under the terms of the GNU Public License v3.0.
# You should have received a copy of the GNU General Public License along with
# this program. If not, see <http://www.gnu.org/licenses/>.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
# EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
# OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
# SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
# INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
# TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
# OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
# IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
# ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
import decimal
import json
from datetime import datetime
from functools import wraps

from dateutil.parser import parse
from dateutil.relativedelta import *
from flask import Flask, request, Response, abort

from auth import sessions
from config import default
from error import APIError, AuthenticationError, BadRequestError
from usage_queries import Collaboratory
from service import projects
from copy import deepcopy
from flask_cors import CORS

import requests

import calendar

import logging
from logging.handlers import RotatingFileHandler

app = Flask(__name__)
CORS(app)


app.config.from_object(default)

app.secret_key = app.config['SECRET_KEY']

app.valid_bucket_sizes = app.config['VALID_BUCKET_SIZES']
app.pricing_periods = app.config['PRICING_PERIODS']
app.discounts = app.config['DISCOUNTS']

handler = RotatingFileHandler(app.config['FLASK_LOG_FILE'], maxBytes=100000, backupCount=3)
if app.config['DEBUG']:
    handler.setLevel(logging.DEBUG)
else:
    handler.setLevel(logging.info)
app.logger.addHandler(handler)


# defaults
INVOICE_API_PREFIX = ''
EMAIL_NEW_INVOICE_PATH = INVOICE_API_PREFIX + '/emailNewInvoice'
GET_ALL_INVOICES = INVOICE_API_PREFIX + '/getAllInvoices'
EMAIL_INVOICE_PATH = INVOICE_API_PREFIX + '/emailInvoice'
LAST_INVOICE_PATH = INVOICE_API_PREFIX + '/getLastInvoiceNumber'

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
            database = Collaboratory(app.config['MYSQL_URI'], app.logger, app.config['BILLING_ROLE'])
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
    database = Collaboratory(app.config['MYSQL_URI'], app.logger,  app.config['BILLING_ROLE'])
    if 'username' not in request.json or 'password' not in request.json:
        app.logger.info('Username or password not found in the request')
        raise BadRequestError('Please provide username and password in the body of your request')
    token = sessions.get_new_token(
        auth_url=app.config['AUTH_URI'],
        username=request.json['username'],
        password=request.json['password'])
    app.logger.info('Username: %s', request.json['username'])
    database.refresh_user_id_map()
    response = Response(status=200, content_type='application/json')
    response.headers['Authorization'] = token['token']
    return response


@app.route('/projects', methods=['GET'])
@authenticate
def get_projects(client, user_id, database):
    role_map = projects.get_tenants(user_id, database, sessions.list_projects(client))
    update_role_map_for_nonpi(role_map,user_id,database)
    return role_map


def update_role_map_for_nonpi(role_map, user_id, database):
    if is_admin_user(user_id, database):
        for elem in role_map:
            elem['roles'].append(app.config['INVOICE_ROLE'])
        return


def is_admin_user(user_id, database):
    #is user admin
    user_email = projects.get_user_email(user_id, database)
    if len(user_email) is 0: user_email=""
    # add invoice role if user is admin
    if database.get_username(user_id).lower() in app.config['OICR_ADMINS'] or user_email.lower() in app.config['OICR_ADMINS']:
        return True
    else: return False


@app.route('/billingprojects', methods=['GET'])
@authenticate
def get_billing_projects(client, user_id, database):
    # only admin can use this feature
    if is_admin_user(user_id, database):
        return projects.get_billing_info(user_id, app.config['INVOICE_ROLE'],database, True)
    else:
        abort(403)


@app.route('/price', methods=['GET'])
def get_price():

    if request.args.get('date') is None:
        date = datetime.today()
    else:
        date = parse(request.args.get('date'), ignoretz=True)
    if request.args.get('projects') is not None:
        projects = request.args.get('projects').split(",")
        return get_per_project_price(date, projects)
    else:
        return get_price_period(date)


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

    billing_projects = []  # The projects we want to grab all info for
    user_projects = []     # The projects we want to only grab info for one user for
    for project in project_list:
        if project in role_map:
            if app.config['BILLING_ROLE'] in role_map[project] or app.config['INVOICE_ROLE'] in role_map[project]:
                billing_projects.append(project)
            else:
                user_projects.append(project)

    if user is not None and user == user_id:
        user_projects += billing_projects
        billing_projects = ['']
    elif user is not None:
        user_projects = billing_projects
        billing_projects = ['']
    else:
        user = user_id

    date_ranges, bucket_size, same_bucket, next_bucket, start_of_bucket = divide_time_range(start_date,
                                                                                            end_date,
                                                                                            bucket_size)

    # Generate list of responses
    responses = []
    for bucket_range in date_ranges:

        records = database.get_instance_core_hours(bucket_range['start_date'],
                                                   bucket_range['end_date'],
                                                   billing_projects,
                                                   user_projects,
                                                   user)
        for record in records:
            record['fromDate'] = bucket_range['start_date']
            record['toDate'] = bucket_range['end_date']
            record['cpuPrice'] = bucket_range['cpu_price']
            record['username'] = database.get_username(record['user'])
            responses.append(record)

        records = database.get_volume_gigabyte_hours(bucket_range['start_date'],
                                                     bucket_range['end_date'],
                                                     billing_projects,
                                                     user_projects,
                                                     user)
        for record in records:
            record['fromDate'] = bucket_range['start_date']
            record['toDate'] = bucket_range['end_date']
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
        # Try to match a row to a previous row so that they can be put together
        for report_item in report:
            if (report_item['user'] == item['user'] and
                    report_item['projectId'] == item['projectId'] and
                    same_bucket(parse(report_item['fromDate']), parse(item['fromDate']))):
                if 'user' in report_item and report_item['user'] is not None:
                    if 'cpu' in item and item['cpu'] is not None:
                        if 'cpu' not in report_item:
                            report_item['cpu'] = 0
                            report_item['cpuCost'] = 0
                        report_item['cpu'] += item['cpu']
                        report_item['cpuCost'] += round(parse_decimal(item['cpu']) * item['cpuPrice'], 4)
                    if 'volume' in item and item['volume'] is not None:
                        if 'volume' not in report_item:
                            report_item['volume'] = 0
                            report_item['volumeCost'] = 0
                        report_item['volume'] += item['volume']
                        report_item['volumeCost'] += round(parse_decimal(item['volume']) * item['volumePrice'], 4)
                else:
                    report_item['image'] += item['image']
                    report_item['imageCost'] += round(parse_decimal(item['image']) * item['imagePrice'], 4)
                return report

        # If it couldn't find a match to merge the item on to, create a new one
        # Regardless of where the data is, we always want to show our information according to the bucket boundaries
        # If we're looking at weekly, it doesn't make sense for the last period to cover only 3 days
        new_item = {
            'fromDate': start_of_bucket(parse(item['fromDate'])).isoformat(),
            'toDate': next_bucket(parse(item['fromDate'])).isoformat(),
            'user': item['user'],
            'projectId': item['projectId']
        }
        if 'user' in new_item and new_item['user'] is not None:
            new_item['username'] = item['username']
            if 'cpu' in item and item['cpu'] is not None:
                new_item['cpu'] = parse_decimal(item['cpu'])
                new_item['cpuCost'] = round(parse_decimal(item['cpu']) * item['cpuPrice'], 4)
            if 'volume' in item and item['volume'] is not None:
                new_item['volume'] = parse_decimal(item['volume'])
                new_item['volumeCost'] = round(parse_decimal(item['volume']) * item['volumePrice'], 4)
        else:
            new_item['image'] = item['image']
            new_item['imageCost'] = round(parse_decimal(item['image']) * item['imagePrice'], 4)
        report.append(new_item)
        return report
    report = reduce(sort_results_into_buckets, responses, list())

    return {'fromDate': original_start_date.isoformat(' '),
            'toDate': original_end_date.isoformat(' '),
            'bucket': bucket_size,
            'entries': report}


@app.route('/emailNewInvoice', methods=['POST'])
@authenticate
def email_new_invoice(client, user_id, database):
    url = app.config['INVOICE_API']  + EMAIL_NEW_INVOICE_PATH
    user_name = database.get_username(user_id)
    user_email = projects.get_user_email(user_id, database)
    # only admin can use this feature
    if is_admin_user(user_id, database):
        request_payload = request.json
        request_payload["user"] = {'username': user_name, "email": user_email}
        retval = requests.post(url, json=request_payload)
        if retval.content.find("error") >= 0:
            raise StandardError(retval.content)
        return retval.content
    else:
        abort(403)


@app.route('/getAllInvoices', methods=['GET'])
@authenticate
def get_all_invoices(client, user_id, database):
    url = app.config['INVOICE_API']  + GET_ALL_INVOICES
    user_info = dict()
    # check projects where user has invoice role
    user_info["email"] = projects.get_user_email(user_id, database)
    user_info["username"] = database.get_username(user_id)
    # get user's role map
    role_map = database.get_user_roles(user_id)
    role_flatmap = [role for role_list in role_map.values() for role in role_list]
    # abort if user is neither admin nor user has invoice role on any project
    if (not is_admin_user(user_id, database)) and (app.config['INVOICE_ROLE'] not in role_flatmap):
            abort(403)
            return

    retval = requests.post(url, json={"user":user_info}, params=request.args)
    if retval.content.find("error") >= 0:
        raise StandardError(retval.content)
    return json.loads(retval.content)


@app.route('/email', methods=['GET'])
@authenticate
def email_me_invoice(client, user_id, database):
    url = app.config['INVOICE_API']  + EMAIL_INVOICE_PATH
    user_email = projects.get_user_email(user_id, database)
    retval = requests.get(url,
                          params={'email':user_email,
                                  'invoice':request.args.get('invoice')})
    if retval.content.find("error") >= 0:
        raise StandardError(retval.content)
    return retval.content


@app.route('/getLastInvoiceNumber', methods=['GET'])
@authenticate
def get_last_invoice_number(client, user_id, database):
    url = app.config['INVOICE_API']  + LAST_INVOICE_PATH
    user_name = database.get_username(user_id)
    user_email = projects.get_user_email(user_id, database)
    # only admin can use this feature
    if is_admin_user(user_id, database):
        request_payload = dict()
        if(request.json is not None): request_payload = request.json
        retval = requests.get(url, params={'username':user_name, 'email':user_email})
        if retval.content.find("error") >= 0:
            raise StandardError(retval.content)
        return retval.content
    else:
        abort(403)


def divide_time_range(start_date, end_date, bucket_size):
    if bucket_size not in app.valid_bucket_sizes:
        bucket_size = 'daily'
    same_bucket, next_bucket, start_of_bucket = get_bucket_functions(bucket_size)

    pricing_periods = iter(app.pricing_periods)
    next_period = next(pricing_periods, None)
    period = next_period
    while start_date >= period['period_end'] and next_period is not None:
        next_period = next(pricing_periods, None)
        if next_period is not None:
            period = next_period

    # We only want to report on 62 time periods at max. For each time period, 3 queries are made, so we're
    # limiting the number of time periods to 62 in order to prevent the database from taking too much load and
    # in order to maintain a reasonable run time. We want to be able to display around 2 months of data if going daily
    # and 62 is the maximum number of days that 2 months can take.
    query_periods = 62  # refactor to make this configurable
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
        bucket['start_date'] = start_date.isoformat(' ')
        bucket['end_date'] = period_end_date.isoformat(' ')
        bucket['cpu_price'] = period['cpu_price']
        bucket['volume_price'] = period['volume_price']
        bucket['image_price'] = period['image_price']

        date_ranges.append(bucket)

        if query_periods > 0:
            query_periods -= 1
        else:
            date_ranges.pop(0)

        start_date = period_end_date

    return date_ranges, bucket_size, same_bucket, next_bucket, start_of_bucket


def get_bucket_functions(bucket_size):
    if bucket_size == 'weekly':
        def same_bucket(start, end):
            start_iso = start.isocalendar()
            end_iso = end.isocalendar()
            return start_iso[0] == end_iso[0] and start_iso[1] == end_iso[1]

        def start_of_bucket(current_date):
            new_date = current_date + relativedelta(weekday=MO(-1))
            return datetime(year=new_date.year, month=new_date.month, day=new_date.day)

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(days=+1, weekday=MO(+1))
            return datetime(year=date_to_change.year, month=date_to_change.month, day=date_to_change.day)
    elif bucket_size == 'yearly':
        def same_bucket(start, end):
            return start.year == end.year

        def start_of_bucket(current_date):
            return datetime(year=current_date.year, month=1, day=1)

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(years=+1)
            return datetime(year=date_to_change.year, month=1, day=1)
    elif bucket_size == 'monthly':
        def same_bucket(start, end):
            return start.year == end.year and start.month == end.month

        def start_of_bucket(current_date):
            return datetime(year=current_date.year, month=current_date.month, day=1)

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(months=+1)
            return datetime(year=date_to_change.year, month=date_to_change.month, day=1)
    else:
        # Daily bucket size
        # Default bucket size, if not defined

        def same_bucket(start, end):
            return start.year == end.year and start.month == end.month and start.day == end.day

        def start_of_bucket(current_date):
            return datetime(year=current_date.year, month=current_date.month, day=current_date.day)

        def next_bucket(date_to_change):
            date_to_change = date_to_change + relativedelta(days=+1)
            return datetime(year=date_to_change.year, month=date_to_change.month, day=date_to_change.day)

    return same_bucket, next_bucket, start_of_bucket


def get_per_project_price(date, projects):
    # get price for all projects as price is independent of projects
    all_projects_pricing = get_price_period(date)
    all_projects_pricing = json.loads(all_projects_pricing)
    # get discounts specific to the projects
    output = dict()
    for project_name in projects:
            output[project_name] = add_project_discount(project_name, deepcopy(all_projects_pricing), date)
    # return output
    return json.dumps(output)


def get_price_period(date):
    pricing_periods = iter(app.pricing_periods)
    next_period = next(pricing_periods, None)
    retval = next_period
    while date >= retval['period_end'] and next_period is not None:
        next_period = next(pricing_periods, None)
        if next_period is not None:
            retval = next_period

    return json.dumps({'cpuPrice': retval['cpu_price'],
                       'volumePrice': retval['volume_price'],
                       'imagePrice': retval['image_price']})


def add_project_discount(project_name, price, date):
    price['discount'] = 0 # default discount amount
    if project_name not in app.discounts.keys(): return price
    # get discount value from config
    project_discounts = app.discounts[project_name]
    if len(project_discounts) == 1 and 'period_start' not in project_discounts[0].keys():
        # this means that there is a discount value that is always applicable regardless of the dates
        price['discount'] = project_discounts[0]['discount']
        return price
    # compute discount value based on the dates
    discount_periods = iter(project_discounts)
    next_period = next(discount_periods, None)
    retval = next_period
    while next_period is not None:
        if 'period_end' not in next_period.keys():
            # if we find a discount without any period; set that as target discount
            # this will get overriden in the loop below if there is a discount specific to a period
            price['discount'] = next_period['discount']
            next_period = next(discount_periods, None)
            if next_period is not None: retval = next_period
        elif date <= parse_period_end(retval['period_end']):
            # this is time period specific discount; no need to iterate further
            price['discount'] = next_period['discount']
            break
        else:
            next_period = next(discount_periods, None)
            if next_period is not None: retval = next_period

    return price

def parse_period_end(period_end_str):
    period_end = period_end_str.split("-")
    month_range = calendar.monthrange(int(period_end[0]), int(period_end[1]))
    return parse(period_end_str+"-"+str(month_range[1]))


