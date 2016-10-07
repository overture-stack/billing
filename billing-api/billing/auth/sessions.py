import requests
import json
from keystoneclient.v2_0 import client
from keystoneclient.exceptions import Unauthorized
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

    response = requests.post(auth_url+'/tokens', json=request_json)
    response_json = json.loads(response.content)
    if response.status_code == 401:
        raise AuthenticationError('Invalid user/password')
    elif response.status_code == 200:
        token = response_json['access']['token']['id']
        return token
    else:
        raise APIError(response.status_code, response_json['error']['title'], response_json['error']['message'])


def renew_token(auth_url=None, token=None):
    request_json = {
        'auth': {
            'token': {
                'id': token
            }
        }
    }

    response = requests.post(auth_url + '/tokens', json=request_json)
    response_json = json.loads(response.content)
    if response.status_code == 401:
        raise AuthenticationError('Token expired. Please login again.')
    elif response.status_code == 200:
        token = response_json['access']['token']['id']
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


def list_projects(auth_url=None, token=None):
    c = client.Client(auth_url=auth_url, token=token)
    return c.tenants.list()

