import records


class User:

    def __init__(self, user_id, username, password, projects):
        self.username = username
        self.password = password
        self.user_id = user_id
        self.anonymous = False
        self.active = True
        self.authenticated = False
        self.projects = projects

    def is_authenticated(self):
        return self.authenticated

    def is_active(self):
        return self.active

    def is_anonymous(self):
        return self.anonymous

    def get_id(self):
        return self.user_id


class UserDatabase:

    def __init__(self):
        self.database = records.Database('sqlite:///billing.db')
        self.init_db()

    def init_db(self):
        self.database.query(
            '''
            CREATE TABLE IF NOT EXISTS users (
                id  INTEGER PRIMARY KEY AUTOINCREMENT,
                username       TEXT     NOT NULL,
                password       TEXT     NOT NULL,
                projects       BLOB);
            ''')

    def get_test_user(self, user_id):
        return User(7, "admin", "test", [])

    def get_user_by_id(self, user_id):
        user_data = self.database.query(
            '''
            SELECT *

            FROM
              users

            WHERE
              id = :user_id;
            ''',
            user_id=user_id)
        user = user_data[0]
        return User(user["id"], user["username"], user["password"], user["projects"].split(","))

    def update_user(self, user):
        self.database.query(
            '''
            UPDATE
              users

            SET
              username = :username,
              password = :password,
              projects = :projects

            WHERE
              id = :user_id;
            ''',
            user_id=user.user_id,
            username=user.username,
            password=user.password,
            projects=','.join(user.projects))

    def create_user(self, username, password, projects):
        user_id = self.database.query(
            '''
            INSERT INTO
              users

              (username, password, projects)

            VALUES
              (:username, :password, :projects);
            ''',
            username=username,
            password=password,
            projects=','.join(projects))
        return self.get_user_by_id(user_id)
