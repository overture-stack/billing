/*
* Copyright 2020(c) The Ontario Institute for Cancer Research. All rights reserved.
*
* This program and the accompanying materials are made available under the terms of the GNU Public
* License v3.0. You should have received a copy of the GNU General Public License along with this
* program. If not, see <http://www.gnu.org/licenses/>.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
* IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
* FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
* CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
* DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
* DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
* WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
* WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

import { Component } from 'react';
import { browserHistory } from 'react-router';
import NotificationSystem from 'react-notification-system';
import ReactTooltip from 'react-tooltip';

import BootstrapTableWrapper from 'components/BootstrapTableWrapper';
import fetchInvoices from 'services/invoices';
import sendEmail from 'services/email';
import {
    formatCurrency,
    formatPercentage,
} from 'utils/formats';
import {
    collectionFlattener,
    customNumberSort,
} from 'utils/transforms';

import user from '../../user';

import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import './Invoices.scss';

class Invoices extends Component {
    state = { invoices: [] }

    notification = null

    constructor(props) {
        super(props);

        if (!user.roles.invoices && user.roles.report) {
            browserHistory.push('/report');
        } else if (!user.roles.invoices && !user.roles.report) {
            user.logout();
        }
    }

    componentDidMount = async () => {
        const invoices = await fetchInvoices();

        this.setState({ invoices: invoices.map(items => collectionFlattener(items)) });
        this.notification = this.refs.notification;
    }

    render = () => (
        <div className="Invoices">
            <div>
                <h1 className="page-heading">Invoices</h1>
            </div>

            <BootstrapTableWrapper
                columns={[
                    {
                        classes: 'organization',
                        dataField: 'current_organization',
                        headerClasses: 'organization',
                        sort: true,
                        text: 'Organization',
                    },
                    {
                        classes: 'date-sm',
                        dataField: 'date',
                        headerClasses: 'date-sm',
                        sort: true,
                        text: 'Date',
                    },
                    {
                        classes: 'invoice-number',
                        dataField: 'invoice_number',
                        headerClasses: 'invoice-number',
                        sort: true,
                        text: 'Invoice',
                    },
                    {
                        classes: 'invoice-status',
                        dataField: 'invoice_status',
                        headerClasses: 'invoice-status',
                        sort: true,
                        text: 'Status',
                    },
                    {
                        align: 'right',
                        classes: 'cost',
                        dataField: 'costs.cpu',
                        formatter: formatCurrency,
                        headerClasses: 'cost',
                        sort: true,
                        sortFunc: customNumberSort,
                        text: 'CPU Cost',
                    },
                    {
                        align: 'right',
                        classes: 'cost',
                        dataField: 'costs.image',
                        formatter: formatCurrency,
                        headerClasses: 'cost',
                        sort: true,
                        sortFunc: customNumberSort,
                        text: 'Image Cost',
                    },
                    {
                        align: 'right',
                        classes: 'cost',
                        dataField: 'costs.objects',
                        formatter: formatCurrency,
                        headerClasses: 'cost',
                        sort: true,
                        sortFunc: customNumberSort,
                        text: 'Objects Cost',
                    },
                    {
                        align: 'right',
                        classes: 'cost',
                        dataField: 'costs.volume',
                        formatter: formatCurrency,
                        headerClasses: 'cost',
                        sort: true,
                        sortFunc: customNumberSort,
                        text: 'Volume Cost',
                    },
                    {
                        align: 'right',
                        classes: 'discount',
                        dataField: 'discount',
                        formatter: formatPercentage,
                        headerClasses: 'discount',
                        sort: true,
                        sortFunc: customNumberSort,
                        text: 'Discount',
                    },
                    {
                        align: 'right',
                        classes: 'cost',
                        dataField: 'costs.total',
                        formatter: formatCurrency,
                        headerClasses: 'cost',
                        sort: true,
                        sortFunc: customNumberSort,
                        text: 'Total Cost',
                    },
                    {
                        align: 'center',
                        classes: 'email',
                        dataField: 'email',
                        formatter: (cell, row) => (
                            <button
                                aria-label="Email this invoice"
                                className="glyphicon glyphicon-envelope"
                                onClick={() => sendEmail(row.invoice_number, this.notification)}
                                style={{
                                    background: 'none',
                                    border: 0,
                                    padding: 0,
                                }}
                                type="button"
                                />
                        ),
                        headerAttrs: {
                            'data-for': 'email',
                            'data-tip': true,
                        },
                        headerClasses: 'email',
                        headerStyle: {
                            textDecoration: 'underline dashed red',
                        },
                        isDummyField: true,
                        searchable: false,
                        text: 'Email',
                    },
                ]}
                data={this.state.invoices}
                exportCSV
                fileName="invoices.csv"
                keyField="invoice_number"
                search
                />

            <NotificationSystem allowHTML ref="notification" />

            <ReactTooltip effect="solid" id="email">
                <span>Email the Invoice</span>
            </ReactTooltip>
        </div>
    );
}

export default Invoices;
