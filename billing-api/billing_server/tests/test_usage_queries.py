import logging
import unittest

from billing_server.billing import usage_queries
from mock_openstack_database_setup import *


class Test(unittest.TestCase):

    def setUp(self):
        self.database = usage_queries.Collaboratory('mysql://root@localhost',
                                                    logging.getLogger('test_usage_queries'),
                                                    False)
        initialize_database(self.database)

    def tearDown(self):
        teardown_database(self.database)
        self.database.close()

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

    def test_instance_core_hours_created_and_deleted_in_date_range_one_user(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_instance(self.database, user_id, project_id, 4, '2016-09-12 04:39:13', '2016-09-28 16:48:19')
        data = self.database.get_usage_statistics('2016-09-10 00:00:00',
                                                  '2016-09-30 15:00:00',
                                                  [project_id],
                                                  [''],
                                                  user_id)
        self.assertEquals(1588, data[0]['cpu'])

    def test_instance_core_hours_created_and_deleted_out_of_date_range_one_user(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_instance(self.database, user_id, project_id, 4, '2016-09-12 04:39:13', None)
        data = self.database.get_usage_statistics('2016-09-15 00:00:00',
                                                  '2016-09-26 15:00:00',
                                                  [project_id],
                                                  [''],
                                                  user_id)
        self.assertEquals(1116, data[0]['cpu'])

    def test_instance_core_hours_created_in_and_deleted_out_of_date_range_one_user(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_instance(self.database, user_id, project_id, 4, '2016-09-12 04:39:13', '2016-09-28 16:48:19')
        data = self.database.get_usage_statistics('2016-09-10 00:00:00',
                                                  '2016-09-26 15:00:00',
                                                  [project_id],
                                                  [''],
                                                  user_id)
        self.assertEquals(1388, data[0]['cpu'])

    def test_instance_core_hours_created_out_and_deleted_in_date_range_one_user(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_instance(self.database, user_id, project_id, 4, '2016-09-12 04:39:13', '2016-09-28 16:48:19')
        data = self.database.get_usage_statistics('2016-09-15 00:00:00',
                                                  '2016-09-30 15:00:00',
                                                  [project_id],
                                                  [''],
                                                  user_id)
        self.assertEquals(1316, data[0]['cpu'])

    def test_instance_core_hours_sum_all_cases_one_user(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_instance(self.database, user_id, project_id, 4, '2016-09-12 04:39:13', '2016-09-20 16:48:19')
        create_instance(self.database, user_id, project_id, 8, '2016-09-01 04:39:13', '2016-09-30 16:48:19')
        create_instance(self.database, user_id, project_id, 2, '2016-09-01 04:39:13', '2016-09-18 12:35:11')
        create_instance(self.database, user_id, project_id, 1, '2016-09-17 00:39:13', '2016-09-30 16:48:19')
        data = self.database.get_usage_statistics('2016-09-10 10:00:00',
                                                  '2016-09-25 15:00:00',
                                                  [project_id],
                                                  [''],
                                                  user_id)
        self.assertEquals(820+2920+390+207, data[0]['cpu'])

    def test_volume_gigabyte_hours_created_and_deleted_in_date_range_one_user(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_volume(self.database, user_id, project_id, 64, '2016-09-24 19:40:23', '2016-10-05 20:10:29')
        data = self.database.get_usage_statistics('2016-09-10 10:00:00',
                                                  '2016-10-25 15:00:00',
                                                  [project_id],
                                                  [''],
                                                  user_id)
        self.assertEquals(16960, data[0]['volume'])

    def test_volume_gigabyte_hours_created_and_deleted_outside_date_range_one_user(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_volume(self.database, user_id, project_id, 128, '2016-09-24 19:40:23', '2016-10-05 20:10:29')
        data = self.database.get_usage_statistics('2016-09-30 10:00:00',
                                                  '2016-10-03 15:00:00',
                                                  [project_id],
                                                  [''],
                                                  user_id)
        self.assertEquals(9856, data[0]['volume'])

    def test_volume_gigabyte_hours_created_in_and_deleted_out_of_date_range_one_user(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_volume(self.database, user_id, project_id, 32, '2016-09-24 19:40:23', None)
        data = self.database.get_usage_statistics('2016-09-10 10:00:00',
                                                  '2016-10-25 15:00:00',
                                                  [project_id],
                                                  [''],
                                                  user_id)
        self.assertEquals(23680, data[0]['volume'])

    def test_volume_gigabyte_hours_created_out_of_and_deleted_in_date_range_one_user(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_volume(self.database, user_id, project_id, 64, '2016-09-24 19:40:23', '2016-10-05 20:10:29')
        data = self.database.get_usage_statistics('2016-09-26 18:20:00',
                                                  '2016-10-25 15:00:00',
                                                  [project_id],
                                                  [''],
                                                  user_id)
        self.assertEquals(13952, data[0]['volume'])

    def test_volume_gigabyte_hours_sum_all_cases_one_user(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_volume(self.database, user_id, project_id, 4, '2016-09-12 04:39:13', '2016-09-20 16:48:19')
        create_volume(self.database, user_id, project_id, 8, '2016-09-01 04:39:13', '2016-09-30 16:48:19')
        create_volume(self.database, user_id, project_id, 2, '2016-09-01 04:39:13', '2016-09-18 12:35:11')
        create_volume(self.database, user_id, project_id, 1, '2016-09-17 00:39:13', '2016-09-30 16:48:19')
        data = self.database.get_usage_statistics('2016-09-10 10:00:00',
                                                  '2016-09-25 15:00:00',
                                                  [project_id],
                                                  [''],
                                                  user_id)
        self.assertEquals(820 + 2920 + 390 + 207, data[0]['volume'])

    def test_sum_instance_core_hours_volume_gigabyte_hours_one_user(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)

        create_instance(self.database, user_id, project_id, 4, '2016-09-20 06:23:15', None)
        create_volume(self.database, user_id, project_id, 128, '2016-09-10 13:42:10', '2016-10-05 23:14:59')
        data = self.database.get_usage_statistics('2016-09-15 10:00:00',
                                                  '2016-10-10 15:00:00',
                                                  [project_id],
                                                  [''],
                                                  user_id)
        self.assertEquals(1956, data[0]['cpu'])
        self.assertEquals(63232, data[0]['volume'])

    # todo: test image calculation on an instance created and deleted within the time frame
    # todo: test image calculation on an instance created and deleted outside the time frame
    # todo: test image calculation on an instance created in and deleted out of the time frame
    # todo: test image calculation on an instance created out deleted in the time frame
    # todo: test that all the above test cases sum correctly

    # todo: test that it groups by user and project for instances/volumes

    # todo: test that it groups by project for images

    # todo: test grouping by billing projects vs user projects

    # todo: test empty billing projects list
    # todo: test empty user projects list

    # todo: test deleted users
