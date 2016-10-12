import records


class Collaboratory:

    def __init__(self, database_url, logger):

        self.logger = logger
        logger.info('Acquiring database')
        self.database = records.Database(database_url)
        logger.info('Successfully connected to database')
        self.projects = self.get_projects()

    @classmethod
    def default_init(cls):
        return cls('mysql://root:test@localhost:3306')

    @classmethod
    def from_file(cls, file_name):
        return cls(file_name)

    def close(self):
        if hasattr(self, 'database'):
            self.database.close()

    def get_usage_statistics(self, start_date, end_date, projects):
        results = self.database.query(
            '''
            SELECT
              instances.user_id as user,
              instances.project_id as projectId,
              instances.core_hours as cpu,
              volumes.gigabyte_hours as volume
            FROM

                (
                  SELECT
                    user_id,
                    project_id,
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
                    project_id IN :projects
                  GROUP BY
                    user_id,
                    project_id
                ) AS instances
              LEFT OUTER JOIN
                (
                  SELECT
                    user_id,
                    project_id,
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
                    project_id IN :projects
                  GROUP BY
                    user_id,
                    project_id
                ) AS volumes

            ON
              instances.user_id    = volumes.user_id     AND
              instances.project_id = volumes.project_id;
            ''',
            start_date=start_date,
            end_date=end_date,
            projects=projects)

        return results

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
                    ) / POWER(2, 30)
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

    # Eventually wanna use keystone for this
    def get_users_by_project(self, project_id):
        return self.database.query(
            '''
            SELECT
              DISTINCT user_id

            FROM
              (
                SELECT
                  DISTINCT user_id

                  FROM
                    nova.instances

                  WHERE
                    project_id = :project_id

                UNION

                SELECT
                  DISTINCT user_id

                  FROM
                    cinder.volumes

                  WHERE
                    project_id = :project_id
              ) as user_ids
            ''',
            project_id=project_id)

    # Eventually wanna use keystone for this
    # Save this stuff! Don't wanna run this all the time
    def get_projects(self):
        if not hasattr(self, 'projects'):
            self.refresh_projects()
        return self.projects

    def refresh_projects(self):
        self.projects = map(lambda row: row.project_id,
                            self.database.query(
                                '''
                                SELECT
                                  DISTINCT project_id

                                FROM
                                  (
                                    SELECT
                                      DISTINCT project_id

                                      FROM
                                        nova.instances

                                    UNION

                                    SELECT
                                      DISTINCT project_id

                                      FROM
                                        cinder.volumes

                                    UNION

                                    SELECT
                                      DISTINCT owner AS project_id

                                    FROM
                                      glance.images
                                  ) as project_ids;
                                '''))
