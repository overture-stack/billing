import unittest
import logging

import mock
from flask import Flask, request, Response

from billing_server.billing import authenticate, login, get_projects, app, usage_queries
from billing_server.billing.auth import sessions

from mock_openstack_database_setup import initialize_database, teardown_database


class MyTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        @app.route('/test', methods=['GET'])
        @authenticate
        def test_endpoint(client, user_id, database):
            return None

    def setUp(self):
        app.config['TESTING'] = True
        app.config['MYSQL_URI'] = 'mysql://root@localhost'
        self.app = app.test_client()
        self.database = usage_queries.Collaboratory('mysql://root@localhost',
                                                    logging.getLogger('test_usage_queries'),
                                                    False)
        initialize_database(self.database)

    def tearDown(self):
        teardown_database(self.database)
        self.database.close()

    def test_authenticate_wraps_sensitive_functions(self):
        rv = self.app.get('/projects')
        self.assertTrue('401' in rv.status)
        rv = self.app.get('/reports')
        self.assertTrue('401' in rv.status)

    @mock.patch('billing_server.billing.sessions.renew_token', return_value=dict(user_id='user', token='new_token'))
    @mock.patch('billing_server.billing.sessions.validate_token', return_value=None)
    def test_authentication_success(self, validate_mock, renew_mock):
        self.app.get('/test', headers={'Authorization': 'Token 12345'})
        validate_mock.assert_called()
        renew_mock.assert_called()

    # todo: test authenticate failure

    # todo: test login success
    # todo: test login failure

    # todo: test get projects

    # todo: test get data usage -- boy this one's big
    # todo: test data get when searching the day an instance was built, and it is destroyed tomorrow with T sep.

    # todo: test divide time range

    # todo: test all bucket functions


if __name__ == '__main__':
    unittest.main()
