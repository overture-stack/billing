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

    def test_get_usage_statistics_groups_by_user_and_project(self):
        user_id_1 = '1'
        user_id_2 = '2'
        project_id_1 = 'project 1'
        project_id_2 = 'project 5'

        create_user(self.database, user_id_1, 'Cool Guy')
        assign_role(self.database, user_id_1, project_id_1, True)
        assign_role(self.database, user_id_1, project_id_2, True)

        create_user(self.database, user_id_2, 'Way Cooler Guy')
        assign_role(self.database, user_id_2, project_id_1, False)
        assign_role(self.database, user_id_2, project_id_2, False)

        create_instance(self.database, user_id_1, project_id_1, 4, '2016-09-04 16:42:13', '2016-11-30 23:14:00')
        create_instance(self.database, user_id_1, project_id_2, 2, '2016-10-02 22:15:59', '2016-10-31 00:00:00')

        create_instance(self.database, user_id_2, project_id_1, 8, '2016-09-15 12:04:32', '2016-10-07 19:53:23')
        create_instance(self.database, user_id_2, project_id_2, 1, '2016-09-28 00:00:00', '2016-09-28 00:00:01')

        create_volume(self.database, user_id_2, project_id_2, 64, '2016-10-01 12:52:32', '2016-10-25 09:42:13')

        data = self.database.get_usage_statistics('2016-09-23 00:00:00',
                                                  '2016-10-20 00:00:00',
                                                  [project_id_1, project_id_2],
                                                  [''],
                                                  user_id_1)
        self.assertEquals(4, data.__len__())
        case11 = False
        case12 = False
        case21 = False
        case22 = False
        for row in data:
            if row['user'] == user_id_1 and row['projectId'] == project_id_1:
                case11 = True
                self.assertEquals(2592, row['cpu'])
            if row['user'] == user_id_1 and row['projectId'] == project_id_2:
                case12 = True
                self.assertEquals(820, row['cpu'])
            if row['user'] == user_id_2 and row['projectId'] == project_id_1:
                case21 = True
                self.assertEquals(2848, row['cpu'])
            if row['user'] == user_id_2 and row['projectId'] == project_id_2:
                case22 = True
                self.assertEquals(1, row['cpu'])
                self.assertEquals(28416, row['volume'])
        self.assertTrue(case11 and case12 and case21 and case22)

    # todo: test that it groups by project for images

    # NOTE: The query does not actually check for billing roles!
    #       Instead it uses a distinction between billing projects
    #       and user projects
    def test_user_can_only_see_own_usage_if_no_billing_projects(self):
        user_id_1 = '1'
        user_id_2 = '2'
        project_id = 'project 1'
        create_user(self.database, user_id_1, 'Cool Guy')
        assign_role(self.database, user_id_1, project_id, False)

        create_user(self.database, user_id_2, 'Way Cooler Guy')
        assign_role(self.database, user_id_2, project_id, False)
        create_instance(self.database, user_id_1, project_id, 4, '2016-09-04 16:42:13', '2016-11-30 23:14:00')
        create_instance(self.database, user_id_2, project_id, 8, '2016-09-15 12:04:32', '2016-10-07 19:53:23')
        data = self.database.get_usage_statistics('2016-09-23 00:00:00',
                                                  '2016-10-20 00:00:00',
                                                  [''],
                                                  [project_id],
                                                  user_id_1)
        self.assertEquals(1, data.__len__())
        self.assertEquals(user_id_1, data[0]['user'])

    # todo: test user cannot see project usage if billing role

    def test_user_with_multiple_roles(self):
        user_id_1 = '1'
        user_id_2 = '2'
        project_id_1 = 'project 1'
        project_id_2 = 'project 5'

        create_user(self.database, user_id_1, 'Cool Guy')
        assign_role(self.database, user_id_1, project_id_1, True)
        assign_role(self.database, user_id_1, project_id_2, False)

        create_user(self.database, user_id_2, 'Way Cooler Guy')
        assign_role(self.database, user_id_2, project_id_1, False)
        assign_role(self.database, user_id_2, project_id_2, False)

        create_instance(self.database, user_id_1, project_id_1, 4, '2016-09-04 16:42:13', '2016-11-30 23:14:00')
        create_instance(self.database, user_id_1, project_id_2, 2, '2016-10-02 22:15:59', '2016-10-31 00:00:00')

        create_instance(self.database, user_id_2, project_id_1, 8, '2016-09-15 12:04:32', '2016-10-07 19:53:23')
        create_instance(self.database, user_id_2, project_id_2, 1, '2016-09-28 00:00:00', '2016-09-28 00:00:01')

        create_volume(self.database, user_id_2, project_id_2, 64, '2016-10-01 12:52:32', '2016-10-25 09:42:13')

        data = self.database.get_usage_statistics('2016-09-23 00:00:00',
                                                  '2016-10-20 00:00:00',
                                                  [project_id_1],
                                                  [project_id_2],
                                                  user_id_1)
        self.assertEquals(3, data.__len__())
        case11 = False
        case12 = False
        case21 = False
        for row in data:
            if row['user'] == user_id_1 and row['projectId'] == project_id_1:
                case11 = True
                self.assertEquals(2592, row['cpu'])
            if row['user'] == user_id_1 and row['projectId'] == project_id_2:
                case12 = True
                self.assertEquals(820, row['cpu'])
            if row['user'] == user_id_2 and row['projectId'] == project_id_1:
                case21 = True
                self.assertEquals(2848, row['cpu'])
            if row['user'] == user_id_2 and row['projectId'] == project_id_2:
                self.fail("User 1 should not be able to see the usage of User 2 in Project 2")
        self.assertTrue(case11 and case12 and case21)

    # When passing an empty list to SQL, it breaks so we have to make sure the system does not crash when we don't
    # specify what projects we want to search
    def test_query_usage_empty_billing_projects_list(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_instance(self.database, user_id, project_id, 4, '2016-09-12 04:39:13', '2016-09-28 16:48:19')
        data = self.database.get_usage_statistics('2016-09-10 00:00:00',
                                                  '2016-09-30 15:00:00',
                                                  [],
                                                  [project_id],
                                                  user_id)
        self.assertEquals(1588, data[0]['cpu'])

    def test_query_usage_empty_user_projects_list(self):
        user_id = '1'
        project_id = 'thisisaproject!'
        create_user(self.database, user_id, 'Cool Guy')
        assign_role(self.database, user_id, project_id)
        create_instance(self.database, user_id, project_id, 4, '2016-09-12 04:39:13', '2016-09-28 16:48:19')
        data = self.database.get_usage_statistics('2016-09-10 00:00:00',
                                                  '2016-09-30 15:00:00',
                                                  [project_id],
                                                  [],
                                                  user_id)
        self.assertEquals(1588, data[0]['cpu'])

    # Expected failure until query actually reports on deleted users
    @unittest.expectedFailure
    def test_query_usage_returns_data_for_deleted_user(self):
        user_id_1 = 'I am going to run the query'
        user_id_2 = 'I AM GOING TO BE DELETED'
        project_id = 'wow, a project!'
        create_user(self.database, user_id_1, 'Cool dood')
        assign_role(self.database, user_id_1, project_id, True)

        create_user(self.database, user_id_2, 'Rood dood')
        assign_role(self.database, user_id_2, project_id, False)

        create_instance(self.database, user_id_2, project_id, 5, '2016-11-01 00:00:00', '2016-11-01 01:00:00')
        delete_user(self.database, user_id_2)
        data = self.database.get_usage_statistics('2016-10-01 00:00:00',
                                                  '2016-12-01 00:00:00',
                                                  [project_id],
                                                  [],
                                                  user_id_1)
        self.assertEqual(data.__len__(), 1)
        for row in data:
            self.assertEqual(row['user'], user_id_2)
