import records
import bcrypt


class User:

    def __init__(self, user_id, username, hashed_password, projects):
        self.username = username
        self.hashed_password = hashed_password
        self.user_id = user_id
        self.anonymous = False
        self.active = True
        self.authenticated = True
        self.projects = projects

    def authenticate(self, username, password):
        return (username == self.username) and bcrypt.checkpw(password.encode('utf-8'),
                                                              self.hashed_password.encode('utf-8'))

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
        return User(7, "admin", bcrypt.hashpw("test", bcrypt.gensalt()), [])

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

    def get_user_by_username(self, username):
        user_data = self.database.query(
            '''
            SELECT *

            FROM
              users

            WHERE
              username = :username;
            ''',
            username=username)
        user = user_data[0]
        return User(user["id"], user["username"], user["password"], user["projects"].split(","))

    def create_user(self, username, password, projects):
        self.database.query(
            '''
            INSERT INTO
              users

              (username, password, projects)

            VALUES
              (:username, :password, :projects);
            ''',
            username=username,
            password=bcrypt.hashpw(password, bcrypt.gensalt()),
            projects=','.join(projects))
