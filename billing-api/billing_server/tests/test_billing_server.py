import unittest
import logging

import mock
from flask import Flask, request, Response

from billing_server.billing import authenticate, login, get_projects, app, usage_queries, auth
from billing_server.billing.auth import sessions

from .mock_openstack_database_setup import initialize_database, teardown_database
from billing_server.billing.config import default

class MyTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        @app.route('/test', methods=['GET'])
        @authenticate
        def test_endpoint(client, user_id, database):
            return None

    def setUp(self):
        app.config['TESTING'] = True
        app.config['MYSQL_URI'] = default.TEST_MYSQL_URI
        self.app = app.test_client()
        self.database = usage_queries.Collaboratory(
            default.TEST_MYSQL_URI,
            default.TEST_GRAPHITE_URI,
            logging.getLogger('test_usage_queries'),
            'billing',
            False
        )
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

    # todo: test get projects

    # todo: test get data usage -- boy this one's big
    def test_generate_report_usage(self):
        self.app.get('/reports', headers={'Authorization': 'Token 12345'})

    # def test_sum_instance_core_hours_volume_gigabyte_hours_one_user(self):
    #     user_id = '1'
    #     project_id = 'thisisaproject!'
    #     create_user(self.database, user_id, 'Cool Guy')
    #     assign_role(self.database, user_id, project_id)
    #
    #     create_instance(self.database, user_id, project_id, 4, '2016-09-20 06:23:15', None)
    #     create_volume(self.database, user_id, project_id, 128, '2016-09-10 13:42:10', '2016-10-05 23:14:59')
    #     data = self.database.get_usage_statistics('2016-09-15 10:00:00',
    #                                               '2016-10-10 15:00:00',
    #                                               [project_id],
    #                                               [''],
    #                                               user_id)
    #     self.assertEquals(1956, data[0]['cpu'])
    #     self.assertEquals(63232, data[0]['volume'])
    # todo: test data get when searching the day an instance was built, and it is destroyed tomorrow with T sep.

    # todo: test divide time range

    # todo: test all bucket functions


if __name__ == '__main__':
    unittest.main()
