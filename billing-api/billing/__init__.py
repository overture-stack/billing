from flask import Flask, render_template, request, flash, redirect, Response
from dateutil.parser import parse
from collaboratory import Collaboratory
from auth import sessions
from config import default
import json
from error import APIError, AuthenticationError
from functools import wraps

app = Flask(__name__)
app.config.from_object(default)

app.secret_key = app.config['SECRET_KEY']

database = Collaboratory(app.config['MYSQL_URI'])


def authenticate(func):
    @wraps(func)
    def inner(*args, **kwargs):
        print 'Authorizing'
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            token = auth_header.split()[1]
            c = sessions.validate_token(app.config['AUTH_URI'], token)
            retval = func(c, *args, **kwargs)
            retjson = json.loads(retval.data)
            retjson['token'] = sessions.renew_token(app.config['AUTH_URI'], token)
            retval.data = json.dumps(retjson)
            return retval
        else:
            raise AuthenticationError('Authentication required: Token not provided')
    return inner


@app.errorhandler(APIError)
def api_error_handler(e):
    return Response(e.response_body, status=e.code, content_type='application/json')


@app.route('/')
@authenticate
def root(client):
    return Response('{"MY_DATA"":"SOMETHING"}', 200)


@app.route('/login', methods=['POST'])
def login():
    token = sessions.get_new_token(
        auth_url=app.config['AUTH_URI'],
        username=request.json['username'],
        password=request.json['password'])
    response_json = json.dumps({'token': token})
    return Response(response_json, status=200, content_type='application/json')


@app.route('/users', methods=['GET'])
@authenticate
def get_users(client):
    return None


@app.route('/by_user', methods=['GET'])
def calculate_cost_by_user():
    start_date = parse(request.args.get('start_date'), ignoretz=True)
    end_date = parse(request.args.get('end_date'), ignoretz=True)
    project_id = request.args.get('project_id')
    user_id = request.args.get('user_id')

    instance_core_hours = database.get_instance_core_hours_by_user(start_date, end_date, project_id, user_id)

    volume_gigabyte_hours = database.get_volume_gigabyte_hours_by_user(start_date, end_date, project_id, user_id)

    project_users = database.get_users_by_project(project_id)

    return None


# Might wanna do javascript in order to allow for a dynamic path variable
# Need to add auth so that a user can't manually enter project details and access projects they shouldn't
@app.route('/by_project', methods=['GET'])
def calculate_cost_by_project():
    start_date = parse(request.args.get('start_date'), ignoretz=True)
    end_date = parse(request.args.get('end_date'), ignoretz=True)
    project_id = request.args.get('project_id')

    instance_core_hours = database.get_instance_core_hours_by_project(start_date, end_date, project_id)

    volume_gigabyte_hours = database.get_volume_gigabyte_hours_by_project(start_date, end_date, project_id)

    image_gigabyte_hours = database.get_image_storage_gigabyte_hours_by_project(start_date, end_date, project_id)

    project_users = database.get_users_by_project(project_id)

    return None
