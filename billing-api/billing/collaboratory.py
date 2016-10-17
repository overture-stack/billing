import records


class Collaboratory:

    def __init__(self, database_url, logger):

        self.logger = logger
        logger.info('Acquiring database')
        self.database = records.Database(database_url)
        logger.info('Successfully connected to database')
        self.user_map = {}
        self.refresh_user_id_map()

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

    def get_image_storage_gigabyte_hours_by_project(self, start_date, end_date, projects):
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
                ) AS image,
                owner AS projectId

            FROM
                glance.images

            WHERE
                (
                    deleted_at >  :start_date  OR
                    deleted_at IS NULL
                )                              AND
                created_at <  :end_date        AND
                owner IN :projects
            GROUP BY owner;
            ''',
            end_date=end_date,
            start_date=start_date,
            projects=projects)
        return results

    def get_user_roles(self, user_id):
        results = self.database.query(
            '''
            SELECT
              assignment.project_id,
              role.name
            FROM
              (
                SELECT
                  target_id AS project_id,
                  role_id
                FROM
                  keystone.assignment
                WHERE
                  actor_id = :user_id
              ) AS assignment
              LEFT JOIN
                keystone.role AS role
              ON
                role.id = assignment.role_id;
            ''', user_id=user_id)

        result_list = results.all(as_dict=True)
        role_map = {}
        for result in result_list:
            if result['project_id'] in role_map:
                role_map[result['project_id']].append(result['name'].lower())
            else:
                role_map[result['project_id']] = [result['name'].lower()]
        return role_map

    def refresh_user_id_map(self):
        results = self.database.query(
            '''
            SELECT
              id,
              name

            FROM
              keystone.user
            '''
        )
        for result in results.all(as_dict=True):
            self.user_map[result['id']] = result['name']
        return self.user_map

    def get_username(self, user_id):
        if user_id in self.user_map:
            return self.user_map[user_id]
        else:
            return 'Username not found'
