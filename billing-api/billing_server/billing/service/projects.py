# Copyright (c) 2017 The Ontario Institute for Cancer Research. All rights reserved.
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

import json
from flask import abort


def get_tenants(user_id, database, project_list):
    role_map = database.get_user_roles(user_id)
    tenants = map(lambda tenant: {'id': tenant.to_dict()['id'],
                                  'name': tenant.to_dict()['name'],
                                  'roles': role_map[tenant.to_dict()['id']]},
                  project_list)
    return tenants


def get_billing_info(user_id, invoice_role, database):
    role_map = database.get_user_roles(user_id)
    role_flatmap = [role for role_list in role_map.values() for role in role_list]
    if invoice_role in role_flatmap:
        return get_billing_map(database)
    else:
        abort(403)


def get_billing_map(database):
        project_map = get_project_name_map(database)
        billing_maps = get_project_billing_map(database)

        for entry in billing_maps:
            entry['project_name'] = project_map.get(entry.get('project_id'))
            entry['extra'] = json.loads(database.get_user_extras(entry.get('user_id')).get('extra'))

        return billing_maps


def get_project_name_map(database):
    results = database.get_project_id_map()
    project_map = {}
    for result in map(lambda r: {r.id: r.name}, results):
        project_map.update(result)
    return project_map


def get_project_billing_map(database):
    project_map = database.get_project_billing_map()
    return map(lambda r: {'project_id': r.project_id, 'user_id': r.user_id}, project_map)
