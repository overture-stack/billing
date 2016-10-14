import requests
import json
from keystoneclient.v2_0 import client
from keystoneclient.exceptions import Unauthorized
from keystoneauth1 import session
from keystoneauth1.identity import V2Token
from ..error import AuthenticationError, APIError


def get_new_token(auth_url=None, username=None, password=None):
    request_json = {
        'auth': {
            'passwordCredentials': {
                'username': username,
                'password': password
            }
        }
    }
    return token_request(auth_url, request_json)


def renew_token(auth_url=None, token=None):
    request_json = {
        'auth': {
            'token': {
                'id': token
            }
        }
    }
    return token_request(auth_url, request_json)


def token_request(auth_url=None, request_json=None):
    response = requests.post(auth_url + '/tokens', json=request_json)
    response_json = json.loads(response.content)
    if response.status_code == 401:
        raise AuthenticationError('Token expired. Please login again.')
    elif response.status_code == 200:
        token = {'token': response_json['access']['token']['id'],
                 'user_id': response_json['access']['user']['id']}
        return token
    else:
        raise APIError(response.status_code, response_json['error']['title'], response_json['error']['message'])


# Returns a client
def validate_token(auth_url=None, token=None):
    try:
        c = client.Client(auth_url=auth_url, token=token)
        return c
    except Unauthorized:
        # Take their error and resend it as mine
        raise AuthenticationError('Authentication required: Invalid token')


def list_projects(client):
    return client.tenants.list()


