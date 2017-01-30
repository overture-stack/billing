# Copyright (c) 2016 The Ontario Institute for Cancer Research. All rights reserved.
#
# This program and the accompanying materials are made available under the terms of the GNU Public License v3.0.
# You should have received a copy of the GNU General Public License along with
# this program. If not, see <http://www.gnu.org/licenses/>.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
# EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
# OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
# SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
# INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
# TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
# OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
# IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
# ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
import records


# TODO: Make this not use Records, as Records caches responses
class Collaboratory:

    def __init__(self, database_url, logger, initialized=True):

        self.logger = logger
        logger.info('Acquiring database')
        self.database = records.Database(database_url)
        logger.info('Successfully connected to database')
        self.user_map = {}
        if initialized:
            self.refresh_user_id_map()

    def close(self):
        if hasattr(self, 'database'):
            self.database.close()

    def get_instance_core_hours(self, start_date, end_date, billing_projects, user_projects, user_id):

        # SQL doesn't like empty lists, so we ensure the invalid project_id of '' populates the list if it's empty
        if not billing_projects:
            billing_projects.append('')

        if not user_projects:
            user_projects.append('')

        results = self.database.query(
            '''
            SELECT
              user_id as user,
              project_id as projectId,
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
              ) AS cpu

            FROM
              nova.instances

            WHERE
              vm_state   != 'error'           AND
              (
                deleted_at >  :start_date  OR
                deleted_at IS NULL
              )                               AND
              created_at <  :end_date         AND
              (
                project_id IN :billing_projects OR
                (
                  user_id    =  :user_id      AND
                  project_id IN :user_projects
                )
              )
            GROUP BY
              user_id,
              project_id
            ''',
            start_date=start_date,
            end_date=end_date,
            billing_projects=billing_projects,
            user_projects=user_projects,
            user_id=user_id)

        return results.all(as_dict=True)

    def get_volume_gigabyte_hours(self, start_date, end_date, billing_projects, user_projects, user_id):

        # SQL doesn't like empty lists, so we ensure the invalid project_id of '' populates the list if it's empty
        if not billing_projects:
            billing_projects.append('')

        if not user_projects:
            user_projects.append('')

        results = self.database.query(
            '''
            SELECT
              user_id as user,
              project_id as projectId,
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
              ) AS volume

            FROM
              cinder.volumes

            WHERE
              (
                deleted_at >  :start_date  OR
                deleted_at IS NULL
              )                              AND
              created_at <  :end_date        AND
              (
                project_id IN :billing_projects OR
                (
                  user_id    =  :user_id      AND
                  project_id IN :user_projects
                )
              )
            GROUP BY
              user_id,
              project_id
            ''',
            start_date=start_date,
            end_date=end_date,
            billing_projects=billing_projects,
            user_projects=user_projects,
            user_id=user_id)

        return results.all(as_dict=True)

    def get_image_storage_gigabyte_hours_by_project(self, start_date, end_date, projects):
        if not projects:
            projects.append('')

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
        return results.all(as_dict=True)

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
              (
                SELECT
                  id,
                  name
                FROM
                  keystone.role
              ) AS role
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
              user_id,
              name

            FROM
              keystone.local_user
            '''
        )
        for result in results.all(as_dict=True):
            self.user_map[result['user_id']] = result['name']
        return self.user_map

    def get_username(self, user_id):
        if user_id in self.user_map:
            return self.user_map[user_id]
        else:
            return 'Unknown User <' + user_id + '>'
