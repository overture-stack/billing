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

    def get_instance_core_hours_by_user(self, start_date, end_date, user_id):
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
                user_id    =  :user_id
            ''',
            end_date=end_date,
            start_date=start_date,
            user_id=user_id)
        if results[0]['core_hours'] is None:
            return default
        else:
            return results[0]['core_hours']

    def get_instance_core_hours_by_project(self, start_date, end_date, project_id):
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
                project_id =  :project_id
            ''',
            end_date=end_date,
            start_date=start_date,
            project_id=project_id)
        if results[0]['core_hours'] is None:
            return default
        else:
            return results[0]['core_hours']

    def get_volume_gigabyte_hours_by_user(self, start_date, end_date, user_id):
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

    def get_volume_gigabyte_hours_by_project(self, start_date, end_date, project_id):
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
                project_id =  :project_id;
            ''',
            end_date=end_date,
            start_date=start_date,
            project_id=project_id)
        if results[0]['gigabyte_hours'] is None:
            return default
        else:
            return results[0]['gigabyte_hours']

    def get_image_storage_gigabyte_hours_by_project(self, start_date, end_date, project_id):
        default = 0
        results = self.database.query(
            '''
            SELECT
                CEIL(
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
                    ) / 2^30
                ) AS gigabyte_hours

            FROM
                glance.images

            WHERE
                (
                    deleted_at >  :start_date  OR
                    deleted_at IS NULL
                )                              AND
                created_at <  :end_date        AND
                owner =  :project_id;
            ''',
            end_date=end_date,
            start_date=start_date,
            project_id=project_id)
        if results[0]['gigabyte_hours'] is None:
            return default
        else:
            return results[0]['gigabyte_hours']
