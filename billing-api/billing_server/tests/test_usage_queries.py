import logging
import unittest

from billing_server.billing import usage_queries
from mock_openstack_database_setup import *


class Test(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.database = usage_queries.Collaboratory('mysql://root@localhost',
                                                   logging.getLogger('test_usage_queries'),
                                                   False)
        initialize_database(cls.database)

    @classmethod
    def tearDownClass(cls):
        teardown_database(cls.database)
        cls.database.close()

    def test_get_username(self):
        user_id_1 = '1'
        user_id_2 = '22'
        create_user(self.database, user_id_1, 'Articuno')
        create_user(self.database, user_id_2, 'Zapdos')
        self.database.refresh_user_id_map()

        self.assertEquals('Articuno', self.database.get_username(user_id_1))
        self.assertEquals('Zapdos', self.database.get_username(user_id_2))

    def test_invalid_username(self):
        user_id_3 = '333'
        self.assertEquals('Unknown User <333>', self.database.get_username(user_id_3))

    # todo: test instance calculation on an instance created and deleted within the time frame
    # todo: test instance calculation on an instance created and deleted outside the time frame
    # todo: test instance calculation on an instance created in and deleted out of the time frame
    # todo: test instance calculation on an instance created out deleted in the time frame
    # todo: test that all the above test cases sum correctly

    # todo: test volume calculation on an instance created and deleted within the time frame
    # todo: test volume calculation on an instance created and deleted outside the time frame
    # todo: test volume calculation on an instance created in and deleted out of the time frame
    # todo: test volume calculation on an instance created out deleted in the time frame
    # todo: test that all the above test cases sum correctly

    # todo: test that instances and volumes are grouped separately (they're in the same query)

    # todo: test image calculation on an instance created and deleted within the time frame
    # todo: test image calculation on an instance created and deleted outside the time frame
    # todo: test image calculation on an instance created in and deleted out of the time frame
    # todo: test image calculation on an instance created out deleted in the time frame
    # todo: test that all the above test cases sum correctly

    # todo: test that it groups by user and project for instances/volumes

    # todo: test that it groups by project for images
