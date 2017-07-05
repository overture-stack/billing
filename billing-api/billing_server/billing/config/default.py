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
DEBUG = True  # Debug mode for flask
SECRET_KEY = 'random, secret, super duper secret key'
AUTH_URI = 'http://142.1.177.150:5000/v2.0'  # Keystone/Identity API endpoint
MYSQL_URI = 'mysql://root:test@142.1.177.150:3306'  # Mysql URI
VALID_BUCKET_SIZES = ['daily', 'weekly', 'monthly', 'yearly']  # Bucketing options for query.
#FLASK_LOG_FILE = '/srv/billing-api/logs/billing.log'
FLASK_LOG_FILE = './logs/billing.log'
BILLING_ROLE = 'billing_test'
#INVOICE_ROLE = 'invoice'
INVOICE_ROLE = 'billing_test'
PRICING_PERIODS = [
    {
        'period_start': '2013-01-01',
        'period_end': '2016-11-03',
        'cpu_price': 0.04,
        'volume_price': 0.02,
        'image_price': 0.04
    },
    {
        'period_start': '2016-11-03',
        'period_end': '2016-12-22',
        'cpu_price': 0.06,
        'volume_price': 0.03,
        'image_price': 0.03
    }
]

# each project can have different discount during differnt billing periods
# discounts are always offered as a percentage of the total bill amount
# discounts are stored as a dictionary with project-id (matches with Collab project-id) as identifier for each project
# the amount in front of discount field in this config file indicates the percentage discount e.g. 0.9 means 90% discount
# each project can have a list of discounts applicable to different billing periods
# no start and end date means that discount will always be applied
# period_start means that discounts starts at the 1st of that month;
# period_end means that discount ends at last day of that month
# Assumptions:
# 0. Discount amount is always a number between 0 - 1
# 1. For each invoice period; there should be max one entry per project
# 2. We don't foresee any need of itemized discounts in the future
# 3. For the sake of simplicity; We are not keeping any global discounts section.
#    If; there is ever a need of a global discount;
#    individual project's discounts will be updated (potentially using a script)
# 4. Discounts are only applicable to Invoice; the billing application UI will never have to show it
# 5. Invoice periods and discount periods will always align
DISCOUNTS = {
    "oicr_demo_rahul" : [{
        'period_start': '2017-05',
        'period_end': '2017-05',
        'discount': 0.9
    },
    {
        'period_start': '2017-06',
        'period_end': '2017-06',
        'discount': 0.7
    }],
    "oicr_demo_dusan" : [{
        'discount': 0.8
    }]
}
