BILLING_ROLE_ID = '9999999999999'
NORMAL_ROLE_ID = '0000000000000'


def initialize_database(database):
    database.database.query('CREATE DATABASE IF NOT EXISTS nova;')
    database.database.query(nova_instances_schema)

    database.database.query('CREATE DATABASE IF NOT EXISTS cinder;')
    database.database.query(cinder_volumes_schema)

    database.database.query('CREATE DATABASE IF NOT EXISTS glance;')
    database.database.query(glance_images_schema)

    # Note that we don't have to create any projects, since we do not read from the table
    database.database.query('CREATE DATABASE IF NOT EXISTS keystone;')
    database.database.query(keystone_assignment_schema)
    database.database.query(keystone_role_schema)
    database.database.query(keystone_user_schema)
    database.database.query(keystone_create_role,
                            role_id=BILLING_ROLE_ID,
                            role_name='billing')
    database.database.query(keystone_create_role,
                            role_id=NORMAL_ROLE_ID,
                            role_name='user')


def teardown_database(database):
    database.database.query('DROP DATABASE nova;')
    database.database.query('DROP DATABASE cinder;')
    database.database.query('DROP DATABASE glance;')
    database.database.query('DROP DATABASE keystone;')


def create_user(database, user_id, username):
    database.database.query(
        '''
        INSERT INTO
          keystone.user
          (
            id,
            name
          )

        VALUES
          (
            :user_id,
            :username
          );
        ''',
        user_id=user_id,
        username=username)


def delete_user(database, user_id):
    database.database.query(
        '''
        DELETE
        FROM
          keystone.user

        WHERE
          id = :user_id;
        '''
        , user_id=user_id)
    database.database.query(
        '''
        DELETE
        FROM
          keystone.assignment

        WHERE
          actor_id = :user_id;
        '''
        , user_id=user_id)


def assign_role(database, user_id, project_id, billing=False):
    if billing:
        role_id = BILLING_ROLE_ID
    else:
        role_id = NORMAL_ROLE_ID

    database.database.query(
        '''
        INSERT INTO
          keystone.assignment
          (
            actor_id,
            target_id,
            role_id
          )

        VALUES
          (
            :user_id,
            :project_id,
            :role_id
          );
        ''',
        user_id=user_id,
        project_id=project_id,
        role_id=role_id)


def create_instance(database, user_id, project_id, vcpus, created_at, deleted_at):
    database.database.query(
        '''
        INSERT INTO
          nova.instances
          (
            user_id,
            project_id,
            vcpus,
            created_at,
            deleted_at,
            vm_state
          )

        VALUES
          (
            :user_id,
            :project_id,
            :vcpus,
            :created_at,
            :deleted_at,
            'active'
          );
        ''',
        user_id=user_id,
        project_id=project_id,
        vcpus=vcpus,
        created_at=created_at,
        deleted_at=deleted_at)


def create_volume(database, user_id, project_id, size, created_at, deleted_at):
    database.database.query(
        '''
        INSERT INTO
          cinder.volumes
          (
            user_id,
            project_id,
            size,
            created_at,
            deleted_at
          )

        VALUES
          (
            :user_id,
            :project_id,
            :size,
            :created_at,
            :deleted_at
          );
        ''',
        user_id=user_id,
        project_id=project_id,
        size=size,
        created_at=created_at,
        deleted_at=deleted_at)


def create_image(database, project_id, size, created_at, deleted_at):
    database.database.query(
        '''
        INSERT INTO
          glance.images
          (
            owner,
            size,
            created_at,
            deleted_at
          )

        VALUES
          (
            :owner,
            :size,
            :created_at,
            :deleted_at
          );
        ''',
        owner=project_id,
        size=size,
        created_at=created_at,
        deleted_at=deleted_at)


nova_instances_schema = '''
  CREATE TABLE IF NOT EXISTS nova.instances
  (
    created_at  DATETIME,
    deleted_at  DATETIME,
    user_id     VARCHAR (255),
    project_id  VARCHAR (255),
    vm_state    VARCHAR (255),
    vcpus       INT (11)
  );
  '''

cinder_volumes_schema = '''
  CREATE TABLE IF NOT EXISTS cinder.volumes
  (
    created_at  DATETIME,
    deleted_at  DATETIME,
    user_id     VARCHAR (255),
    project_id  VARCHAR (255),
    size        INT (11)
  );
  '''

glance_images_schema = '''
  CREATE TABLE IF NOT EXISTS glance.images
  (
    size        BIGINT (20),
    created_at  DATETIME,
    deleted_at  DATETIME,
    owner       VARCHAR (255)
  );
  '''

keystone_role_schema = '''
  CREATE TABLE IF NOT EXISTS keystone.role
  (
    id          VARCHAR (64),
    name        VARCHAR (255)
  );
  '''

keystone_assignment_schema = '''
  CREATE TABLE IF NOT EXISTS keystone.assignment
  (
    actor_id    VARCHAR (64),
    target_id   VARCHAR (64),
    role_id     VARCHAR (64)
  );
  '''

keystone_user_schema = '''
  CREATE TABLE IF NOT EXISTS keystone.user
  (
    id          VARCHAR (64),
    name        VARCHAR (255)
  );
  '''

keystone_create_role = '''
  INSERT INTO
    keystone.role
    (
      id,
      name
    )

  VALUES
    (
      :role_id,
      :role_name
    );
  '''

