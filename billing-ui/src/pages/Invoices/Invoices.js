/*
 * Copyright 2016(c) The Ontario Institute for Cancer Research. All rights reserved.
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

import {fetchInvoices} from '~/services/invoices'; 
import {sendEmail} from '~/services/email'; 
import user from '~/user';

import 'react-bootstrap-table/dist/react-bootstrap-table.min.css';
import './Invoices.scss';


export default 
class extends Component {
  state = { invoices: [] }

  notification = null

  setEmailLink = (cell, row) => (
    <span
      className="glyphicon glyphicon-envelope"
      onClick={() => sendEmail(row.invoice_number, this.notification)}
      style={{ cursor:'pointer' }}
    >
    </span>
  );

  constructor(props) {
    super(props)
    if(!user.roles.invoices && user.roles.report) {
      browserHistory.push('/report');
    } else if(!user.roles.invoices && !user.roles.report) {
      user.logout();
    }
  }

  async componentDidMount() {
    const invoices = await fetchInvoices();
    this.setState({ invoices });
    this.notification = this.refs.notification;
  }

  formatCurrency = (n) => {
    return n ? `$${n.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '';
  }

  customNumberSort = (a, b, order, field) => {
    if(order === 'desc') {
      return a[field] - b[field];      
    } else {
      return b[field] - a[field];
    }  
  }

  render () {
    return (
      <div className={`Invoices`}>
        <div>
          <h1 className="page-heading">
            Invoices
          </h1>
        </div>
        <BootstrapTable
            data={this.state.invoices}
            striped={true}
            condensed={true}
            search={true}
            exportCSV={true}
            hover={true}
            pagination={false}
            ignoreSinglePage
            keyField="key"
            options={{
              hideSizePerPage: true,
              sizePerPage: 10,
              sizePerPageList: [10, 50, 100]
            }}
            >
            <TableHeaderColumn
              dataField="current_organization"
              dataSort={true}
            >Project</TableHeaderColumn>
            <TableHeaderColumn
                dataField="date"
                dataSort={true}
            >Date</TableHeaderColumn>
            <TableHeaderColumn
                dataField="invoice_number"
                dataSort={true}
            >Invoice Number</TableHeaderColumn>
            <TableHeaderColumn
                dataField="payment_status"
                dataSort={true}
            >Payment Status</TableHeaderColumn>
            <TableHeaderColumn
                dataField="invoice_status"
                dataSort={true}
            >Invoice Status</TableHeaderColumn>
            <TableHeaderColumn
              dataField="cpu_cost"
              dataAlign="right"
              dataFormat={this.formatCurrency}
              dataSort={true}
              sortFunc={this.customNumberSort}
            >CPU Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataField="image_cost"
              dataAlign="right"
              dataFormat={this.formatCurrency}
              dataSort={true}
              sortFunc={this.customNumberSort}
            >Image Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataField="volume_cost"
              dataAlign="right"
              dataFormat={this.formatCurrency}
              dataSort={true}
              sortFunc={this.customNumberSort}
            >Volume Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataField="discount"
              dataAlign="right"
              dataSort={true}
            >Discount%</TableHeaderColumn>
            <TableHeaderColumn
              dataField="total"
              dataAlign="right"
              dataFormat={this.formatCurrency}
              dataSort={true}
              sortFunc={this.customNumberSort}
            >Total Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataAlign="center"
              dataField="email"
              dataFormat={this.setEmailLink}
            >
              <span
                data-tip
                data-for='email'
                style={{ borderBottom: '1px dashed red'}}>
                Email
              </span>
            </TableHeaderColumn>
          </BootstrapTable>
          <NotificationSystem ref="notification" allowHTML={true}/>
          <ReactTooltip id='email' effect='solid'>
            <span>Email the Invoice</span>
          </ReactTooltip>
      </div>
    );
  }
}