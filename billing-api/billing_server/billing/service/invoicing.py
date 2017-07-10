from flask import request, Response, abort,Blueprint
from flask import current_app as app
import requests
import json


invoice_router = Blueprint('invoicing', __name__)

# defaults
EMAIL_INVOICE_PATH = '/emailNewInvoice'
GET_ALL_INVOICES = '/getAllInvoices'


@invoice_router.route(EMAIL_INVOICE_PATH, methods=['POST'])
def emailNewVoice():
    url = app.config['INVOICE_API']  + EMAIL_INVOICE_PATH
    retval = requests.post(url, json=request.json)
    response = Response(retval, status=200, content_type='application/json')
    return response

@invoice_router.route(GET_ALL_INVOICES, methods=['GET'])
def getAllInvoices():
    url = app.config['INVOICE_API']  + GET_ALL_INVOICES
    retval = requests.get(url, json=request.json, params=request.args)
    response = Response(retval, status=200, content_type='application/json')
    return response