# Copyright (c) 2020 The Ontario Institute for Cancer Research. All rights reserved.
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
import config
DEBUG = config.DEBUG  # Debug mode for flask
SECRET_KEY = config.SECRET_KEY
AUTH_URI = config.AUTH_URI  # Keystone/Identity API endpoint
INVOICE_API = config.INVOICE_API
MYSQL_URI = config.MYSQL_URI  # Mysql URI
TEST_MYSQL_URL = config.TEST_MYSQL_URL # Mysql URI for test
VALID_BUCKET_SIZES = config.VALID_BUCKET_SIZES  # Bucketing options for query.
#FLASK_LOG_FILE = '/srv/billing-api/logs/billing.log'
FLASK_LOG_FILE = config.FLASK_LOG_FILE
BILLING_ROLE = config.BILLING_ROLE
INVOICE_ROLE = config.INVOICE_ROLE
OICR_ADMIN = config.OICR_ADMIN
#OICR Admin user ids or email addresses
OICR_ADMINS = config.OICR_ADMINS
PRICING_PERIODS = config.PRICING_PERIODS

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
DISCOUNTS = config.DISCOUNTS
