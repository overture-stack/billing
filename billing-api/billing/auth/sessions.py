import requests
import json
from keystoneclient.v2_0 import client


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
    token = response_json['access']['token']['id']
    c = client.Client(auth_url=auth_url, token=token)
    print c


def list_projects(auth_url=None, token=None):
    return client.Client(auth_url=auth_url, token=token).tenants.list()