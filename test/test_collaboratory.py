from unittest import TestCase
from src.collaboratory import Collaboratory


class TestCollaboratory(TestCase):

    def setUp(self):
        self.database = Collaboratory.default_init()
        self.start_date = "2016-08-01T00:00:00"
        self.end_date = "2016-09-01T00:00:00"
        self.user_id = "19f5e963e6e1429897ecabb52f958c2f"

    def tearDown(self):
        self.database.database.close()

    def test_get_new_active_instance_core_hours(self):
        self.assertEqual(self.database.get_new_active_instance_core_hours(self.start_date,
                                                                          self.end_date,
                                                                          self.user_id),
                         960)

    def test_get_new_terminated_instance_core_hours(self):
        self.assertEqual(self.database.get_new_terminated_instance_core_hours(self.start_date,
                                                                              self.end_date,
                                                                              self.user_id),
                         24004)

    def test_get_old_active_instance_core_hours(self):
        self.assertEqual(self.database.get_old_active_instance_core_hours(self.start_date,
                                                                          self.end_date,
                                                                          self.user_id),
                         8928)

    def test_get_old_terminated_instance_core_hours(self):
        self.assertEqual(self.database.get_old_terminated_instance_core_hours(self.start_date,
                                                                              self.end_date,
                                                                              self.user_id),
                         120)

    def test_get_instance_core_hours(self):
        self.assertEqual(self.database.get_instance_core_hours(self.start_date,
                                                               self.end_date,
                                                               self.user_id),
                         34012)

    def test_get_instance_core_hours_one_query(self):
        self.assertEqual(self.database.get_instance_core_hours_one_query(self.start_date,
                                                                         self.end_date,
                                                                         self.user_id),
                         34012)


''' Test Data located at mysql://root:test@142.1.177.124:3306
nova.instances:
    created_at = 2010-01-01
    deleted_at = 2016-08-05
    cores      = 1

    created_at = 2016-07-30
    deleted_at = 2016-08-01 12:00:00
    cores      = 2

    created_at = 1990-01-01
    deleted_at = NULL
    cores      = 4

    created_at = 2016-04-01
    deleted_at = 2016-09-02
    cores      = 8

    created_at = 2016-08-03
    deleted_at = 2016-08-20
    cores      = 8

    created_at = 2016-08-24
    deleted_at = 2020-01-04
    cores      = 1

    created_at = 2016-08-16
    deleted_at = NULL
    cores      = 2

    created_at = 2016-08-29 00:00:00
    deleted_at = 2016-08-29 00:00:01
    cores      = 4

    created_at = 2016-07-09
    deleted_at = 2016-07-20
    cores      = 600

    created_at = 2016-09-01
    deleted_at = NULL
    cores      = 30

    created_at = 2016-08-01
    created_at = 2016-08-07
    cores      = 16

    created_at = 2016-08-08
    deleted_at = 2016-09-01
    cores      = 32

cinder.volumes

'''