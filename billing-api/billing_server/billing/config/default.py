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
AUTH_URI = 'http://142.1.177.54:5000/v2.0'  # Keystone/Identity API endpoint
MYSQL_URI = 'mysql://root:test@142.1.177.150:3306'  # Mysql URI
VALID_BUCKET_SIZES = ['daily', 'weekly', 'monthly', 'yearly']  # Bucketing options for query.
FLASK_LOG_FILE = '/tmp/billing.log'
BILLING_ROLE = 'billing_test'
INVOICE_ROLE = 'invoice'
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
