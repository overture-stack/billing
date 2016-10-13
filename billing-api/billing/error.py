import json


class APIError(Exception):
    def __init__(self, code, error, message):
        self.code = code
        self.error = error
        self.message = message
        self.response_body = json.dumps({'code': self.code,
                                         'error': self.error,
                                         'message:': self.message})


class AuthenticationError(APIError):
    def __init__(self, message):
        super(AuthenticationError, self).__init__(401, 'Authentication Error', message)


class BadRequestError(APIError):
    def __init__(self, message):
        super(BadRequestError, self).__init__(400, "Bad Request", message)


