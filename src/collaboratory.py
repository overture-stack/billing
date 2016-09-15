import records


class Collaboratory:

    def __init__(self, database_url):

        print "Acquiring database"
        self.database = records.Database(database_url)
        print "Successfully connected to database"

    @classmethod
    def default_init(cls):
        return cls('mysql://root:test@142.1.177.124:3306')

    @classmethod
    def from_file(cls, file_name):
        return cls(file_name)

    def get_instance_core_hours(self, start_date, end_date, user_id):
        core_hours = 0

        print("New Active Instances")
        core_hours_to_add = self.get_new_active_instance_core_hours(start_date, end_date, user_id)
        print("\t" + str(core_hours) + " + " + str(core_hours_to_add) + " = " + str(core_hours+core_hours_to_add))
        core_hours += core_hours_to_add

        print("New Terminated Instances")
        core_hours_to_add = self.get_new_terminated_instance_core_hours(start_date, end_date, user_id)
        print("\t" + str(core_hours) + " + " + str(core_hours_to_add) + " = " + str(core_hours+core_hours_to_add))
        core_hours += core_hours_to_add

        print("Old Active Instances")
        core_hours_to_add = self.get_old_active_instance_core_hours(start_date, end_date, user_id)
        print("\t" + str(core_hours) + " + " + str(core_hours_to_add) + " = " + str(core_hours+core_hours_to_add))
        core_hours += core_hours_to_add

        print("Old Terminated Instances")
        core_hours_to_add = self.get_old_terminated_instance_core_hours(start_date, end_date, user_id)
        print("\t" + str(core_hours) + " + " + str(core_hours_to_add) + " = " + str(core_hours+core_hours_to_add))
        core_hours += core_hours_to_add

        return core_hours

    def get_new_active_instance_core_hours(self, start_date, end_date, user_id):
        default = 0
        results = self.database.query(
            '''
            SELECT
                SUM(
                    CEIL(
                        TIMESTAMPDIFF(
                            SECOND,
                            created_at,
                            :end_date
                        ) / 3600
                    ) * vcpus
                ) AS core_hours

            FROM
                nova.instances

            WHERE
                vm_state   != 'error'      AND
                created_at >= :start_date  AND
                created_at <  :end_date    AND
                (
                    deleted_at > :end_date OR
                    deleted_at IS NULL
                )                          AND
                user_id    =  :user_id;
            ''',
            end_date=end_date,
            start_date=start_date,
            user_id=user_id)
        if results[0]['core_hours'] is None:
            return default
        else:
            return results[0]['core_hours']

    def get_new_terminated_instance_core_hours(self, start_date, end_date, user_id):
        default = 0
        results = self.database.query(
            '''
            SELECT
                SUM(
                    CEIL(
                        TIMESTAMPDIFF(
                            SECOND,
                            created_at,
                            deleted_at
                        ) / 3600
                    ) * vcpus
                ) AS core_hours

            FROM
                nova.instances

            WHERE
                vm_state   != 'error'      AND
                created_at >= :start_date  AND
                created_at <  :end_date    AND
                deleted_at <= :end_date    AND
                user_id    =  :user_id;
            ''',
            end_date=end_date,
            start_date=start_date,
            user_id=user_id)
        if results[0]['core_hours'] is None:
            return default
        else:
            return results[0]['core_hours']

    def get_old_active_instance_core_hours(self, start_date, end_date, user_id):
        default = 0
        results = self.database.query(
            '''
            SELECT
                SUM(
                    CEIL(
                        TIMESTAMPDIFF(
                            SECOND,
                            :start_date,
                            :end_date
                        ) / 3600
                    ) * vcpus
                ) AS core_hours

            FROM
                nova.instances

            WHERE
                vm_state   != 'error'       AND
                created_at <  :start_date   AND
                (
                    deleted_at >= :end_date OR
                    deleted_at IS NULL
                )                           AND
                user_id    =  :user_id;
            ''',
            end_date=end_date,
            start_date=start_date,
            user_id=user_id)
        if results[0]['core_hours'] is None:
            return default
        else:
            return results[0]['core_hours']

    def get_old_terminated_instance_core_hours(self, start_date, end_date, user_id):
        default = 0
        results = self.database.query(
            '''
            SELECT
                SUM(
                    CEIL(
                        TIMESTAMPDIFF(
                            SECOND,
                            :start_date,
                            deleted_at
                        ) / 3600
                    ) * vcpus
                ) AS core_hours

            FROM
                nova.instances

            WHERE
                vm_state   != 'error'      AND
                created_at <  :start_date  AND
                deleted_at >= :start_date  AND
                deleted_at <  :end_date    AND
                user_id    =  :user_id;
            ''',
            end_date=end_date,
            start_date=start_date,
            user_id=user_id)
        if results[0]['core_hours'] is None:
            return default
        else:
            return results[0]['core_hours']

    def get_instance_core_hours_one_query(self, start_date, end_date, user_id):
        default = 0
        results = self.database.query(
            '''
            SELECT
                SUM(
                    CEIL(
                        TIMESTAMPDIFF(
                            SECOND,
                            GREATEST(
                                :start_date,
                                created_at
                            ),
                            LEAST(
                                :end_date,
                                COALESCE(
                                    deleted_at,
                                    :end_date
                                )
                            )
                        ) / 3600
                    ) * vcpus
                ) AS core_hours

            FROM
                nova.instances

            WHERE
                vm_state   != 'error'          AND
                (
                    deleted_at >  :start_date  OR
                    deleted_at IS NULL
                )                              AND
                created_at <  :end_date        AND
                user_id    =  :user_id;
            ''',
            end_date=end_date,
            start_date=start_date,
            user_id=user_id)
        if results[0]['core_hours'] is None:
            return default
        else:
            return results[0]['core_hours']

    def get_volume_gigabyte_hours(self, start_date, end_date, user_id):
        default = 0
        results = self.database.query(
            '''
            SELECT
                SUM(
                    CEIL(
                        TIMESTAMPDIFF(
                            SECOND,
                            GREATEST(
                                :start_date,
                                created_at
                            ),
                            LEAST(
                                :end_date,
                                COALESCE(
                                    deleted_at,
                                    :end_date
                                )
                            )
                        ) / 3600
                    ) * size
                ) AS gigabyte_hours

            FROM
                cinder.volumes

            WHERE
                (
                    deleted_at >  :start_date  OR
                    deleted_at IS NULL
                )                              AND
                created_at <  :end_date        AND
                user_id    =  :user_id;
            ''',
            end_date=end_date,
            start_date=start_date,
            user_id=user_id)
        if results[0]['gigabyte_hours'] is None:
            return default
        else:
            return results[0]['gigabyte_hours']
