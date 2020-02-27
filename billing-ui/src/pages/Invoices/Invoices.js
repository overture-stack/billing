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

import React, { Component } from 'react';
import { browserHistory } from 'react-router';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import NotificationSystem from 'react-notification-system';
import ReactTooltip from 'react-tooltip';

import fetchInvoices from '../../services/invoices';
import sendEmail from '../../services/email';
import user from '../../user';
import { formatCurrency } from '../../utils/formats';
import {
    collectionFlattener,
    customNumberSort,
} from '../../utils/transforms';

import 'react-bootstrap-table/dist/react-bootstrap-table.min.css';
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

    setEmailLink = (cell, row) => (
        <span
            className="glyphicon glyphicon-envelope"
            onClick={() => sendEmail(row.invoice_number, this.notification)}
            style={{ cursor: 'pointer' }}
            />
    );

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

            <BootstrapTable
                condensed
                data={this.state.invoices}
                exportCSV
                hover
                ignoreSinglePage
                keyField="key"
                options={{
                    hideSizePerPage: true,
                    sizePerPage: 10,
                    sizePerPageList: [
                        10,
                        50,
                        100,
                    ],
                }}
                pagination={false}
                search
                striped
                >
                <TableHeaderColumn
                    dataField="current_organization"
                    dataSort
                    >
                    Organization
                </TableHeaderColumn>

                <TableHeaderColumn
                    dataField="date"
                    dataSort
                    >
                    Date
                </TableHeaderColumn>

                <TableHeaderColumn
                    dataField="invoice_number"
                    dataSort
                    >
                    Invoice Number
                </TableHeaderColumn>

                <TableHeaderColumn
                    dataField="invoice_status"
                    dataSort
                    >
                    Invoice Status
                </TableHeaderColumn>

                <TableHeaderColumn
                    dataAlign="right"
                    dataField="costs.cpu"
                    dataFormat={formatCurrency}
                    dataSort
                    sortFunc={customNumberSort}
                    >
                    CPU Cost
                </TableHeaderColumn>

                <TableHeaderColumn
                    dataAlign="right"
                    dataField="costs.image"
                    dataFormat={formatCurrency}
                    dataSort
                    sortFunc={customNumberSort}
                    >
                    Image Cost
                </TableHeaderColumn>

                <TableHeaderColumn
                    dataAlign="right"
                    dataField="costs.objects"
                    dataFormat={formatCurrency}
                    dataSort
                    sortFunc={customNumberSort}
                    >
                    Objects Cost
                </TableHeaderColumn>

                <TableHeaderColumn
                    dataAlign="right"
                    dataField="costs.volume"
                    dataFormat={formatCurrency}
                    dataSort
                    sortFunc={customNumberSort}
                    >
                    Volume Cost
                </TableHeaderColumn>

                <TableHeaderColumn
                    dataAlign="right"
                    dataField="discount"
                    dataSort
                    >
                    Discount%
                </TableHeaderColumn>

                <TableHeaderColumn
                    dataAlign="right"
                    dataField="costs.total"
                    dataFormat={formatCurrency}
                    dataSort
                    sortFunc={customNumberSort}
                    >
                    Total Cost
                </TableHeaderColumn>

                <TableHeaderColumn
                    dataAlign="center"
                    dataField="email"
                    dataFormat={this.setEmailLink}
                    >
                    <span
                        data-for="email"
                        data-tip
                        style={{ borderBottom: '1px dashed red' }}
                        >
                        Email
                    </span>
                </TableHeaderColumn>
            </BootstrapTable>

            <NotificationSystem allowHTML ref="notification" />

            <ReactTooltip effect="solid" id="email">
                <span>Email the Invoice</span>
            </ReactTooltip>
        </div>
    );
}

export default Invoices;
