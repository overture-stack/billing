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

import { browserHistory } from 'react-router';
import {
    useEffect,
    useRef,
    useState,
} from 'react';
import { observer } from 'mobx-react';
import {
    find,
    range,
    sum,
    xor,
} from 'lodash';
import {
    flow,
    join,
    pick,
    values,
} from 'lodash/fp';
import moment from 'moment';
import {
    Button,
    DatePicker,
    Radio,
    Select as AntdSelect,
} from 'antd';
import Select from 'react-select';
// import 'react-select/dist/react-select.css';

import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import 'react-bootstrap-table/dist/react-bootstrap-table.min.css';

import fetchReport from 'services/reports/fetchReport';
import fetchProjects from 'services/projects/fetchProjects';
import {
    formatCurrency,
    formatNumber,
} from 'utils/formats';
import {
    customNumberSort,
} from 'utils/transforms';

import user from '../../user';

import aggregateEntries, {
    noEntries,
    noProjects,
} from './aggregateEntries';
import CHART_SETTINGS from './CHART_SETTINGS';
import getSeriesFromReportEntries from './getSeriesFromReportEntries';
import './Report.scss';

const { MonthPicker } = DatePicker;
const RadioButton = Radio.Button;
const RadioGroup = Radio.Group;
const { Option } = AntdSelect;

const ReactHighcharts = require('react-highcharts').withHighcharts(require('highcharts'));

const reactSelectStyles = {
    indicatorSeparator: () => ({

    }),
    menu: provided => ({
        ...provided,
        zIndex: 10,
    }),
};

const reactSelectTheme = defaultTheme => ({
    ...defaultTheme,
    spacing: {
        ...defaultTheme.spacing,
        baseUnit: 2,
        controlHeight: 0,
        MenuGutter: 0,
    },
});

const TIME_PERIODS = [
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'YEARLY',
];

const defaultBucketSize = TIME_PERIODS[0];

const AGGREGATION_FIELDS = {
    PERIOD: 'fromDate',
    PROJECT: 'projectId',
    USER: 'user',
};

const defaultAggregationFields = [
    AGGREGATION_FIELDS.PROJECT,
    AGGREGATION_FIELDS.USER,
    AGGREGATION_FIELDS.PERIOD,
];

const START_YEAR = 2013;
const getYearsSinceStart = () => range(START_YEAR, new Date().getUTCFullYear() + 1);

// ----
const projectsToSelectOptions = projects => projects.map(project => ({
    label: project.name,
    value: JSON.stringify(project), // else, the component generates React key errors
}));
// ----

const Report = () => {
    const chartRef = useRef();
    const [shouldShowCost, setShowCost] = useState(true);
    const [isLoading, setLoading] = useState(true);
    const [aggregationFields, setAggregationFields] = useState(defaultAggregationFields);
    const [report, setReport] = useState({ entries: noEntries(AGGREGATION_FIELDS) });
    const [entriesToDisplay, setEntriesToDisplay] = useState([]);
    const [reportSummary, setReportSummary] = useState([]);
    const [projects, setProjects] = useState(noProjects(report));
    const [filters, setFilters] = useState({
        bucketSize: defaultBucketSize,
        fromDate: moment().subtract(1, 'months').startOf('day'),
        projects: [],
        toDate: moment().startOf('day'),
    });

    const formatDateRange = (cell, entry) => {
        const bucket = report?.bucket?.toUpperCase() || filters.bucketSize;
        // console.log('formatDateRange', cell, entry);

        switch (bucket) {
            case 'DAILY':
                return moment(entry.fromDate).format('DD MMM YYYY');

            case 'WEEKLY':
                return `${
                    moment(entry.fromDate).format('MMM DD YYYY')} - ${
                    moment(entry.toDate).subtract(1, 'days').format('MMM DD YYYY')
                }`;

            case 'MONTHLY':
                return moment(entry.fromDate).format('MMMM YYYY');

            case 'YEARLY':
                return moment(entry.fromDate).format('YYYY');

            default:
                return moment(entry.fromDate).format('YYYY-MM-DD');
        }
    };

    const groupBy = field => () => {
        setAggregationFields(xor(aggregationFields, [field]));
    };

    const handleBucketSizeFilterChange = bucketSize => setFilters(prevFilters => ({
        ...prevFilters,
        bucketSize,
    }));

    const handleDateFromFilterChange = fromDate => setFilters(prevFilters => ({
        ...prevFilters,
        fromDate,
    }));

    const handleDateToFilterChange = toDate => setFilters(prevFilters => ({
        ...prevFilters,
        toDate,
    }));

    const handleProjectsFilterChange = selectedProjects => setFilters(prevFilters => ({
        ...prevFilters,
        projects: selectedProjects?.map(selection => JSON.parse(selection.value)) || [],
    }));

    const redrawChart = () => {
        const chart = chartRef.current;
        const newSeries = getSeriesFromReportEntries(
            report.entries,
            { shouldShowCost },
        ).slice();

        const subtitle = new Date(
            report.fromDate ||
            filters.fromDate.toISOString(),
        )
            .toDateString()
            .concat(
                ' - ',
                new Date(report.toDate || filters.toDate.toISOString()).toDateString(),
            );

        chart.setTitle(
            { text: `Collaboratory ${shouldShowCost ? 'Cost' : 'Usage'} Summary` },
            { text: `<div style="text-align:center;">${subtitle}<br/><br/>Toggle Chart Area</div>` },
        );

        chart.yAxis[0].update({
            title: {
                text: `${shouldShowCost ? 'Cost ($)' : 'Usage (hrs)'}`,
            },
        });

        chart.series.forEach(serie => serie.setData(
            newSeries
                .find(newSerie => newSerie.name === serie.name)
                .data,
            false,
            false,
        ));

        chart.update({
            colors: [
                '#2C3E50', // cpu
                '#E5D55B', // image
                '#E74C3C', // objects
                '#3498DB', // volume
            ],
        });

        chart.reflow();
        window.chart = chart;
    };

    const updateChart = async () => {
        setLoading(true);

        fetchReport({
            bucketSize: filters.bucketSize.toLowerCase(),
            fromDate: filters.fromDate.millisecond(0).toISOString(),
            projects: filters.projects.slice(),
            toDate: filters.toDate.millisecond(0).toISOString(),
        })
            .then(setReport)
            .catch(err => console.error('failed fetchReport', err));
    };

    const updatePeriod = period => () => {
        handleBucketSizeFilterChange(period);

        if (period === 'MONTHLY') {
            handleDateFromFilterChange(
                moment(filters.fromDate).startOf('month'),
            );
            handleDateToFilterChange(
                moment(filters.toDate).endOf('month'),
            );
        } else if (period === 'YEARLY') {
            handleDateFromFilterChange(
                moment(filters.fromDate).startOf('year'),
            );
            handleDateToFilterChange(
                moment(filters.toDate).endOf('year'),
            );
        } else {
            handleDateFromFilterChange(filters.fromDate);
            handleDateToFilterChange(filters.toDate);
        }
    };

    useEffect(() => {
        user.roles.report
            ? fetchProjects()
                .then(setProjects)
                .then(updateChart)
                .catch(res => console.error('failed fetchProjects', res))
        : user.roles.invoices
            ? browserHistory.push('/invoices')
        : user.logout();
    }, []);

    useEffect(() => {
        setReportSummary(aggregateEntries(report.entries, ''));
        setLoading(false);
    }, [report]);

    useEffect(() => {
        redrawChart();
    }, [report, shouldShowCost]);

    useEffect(() => {
        setEntriesToDisplay(aggregateEntries(
            report.entries,
            x => flow([
                pick(aggregationFields),
                values,
                join(','),
            ])(x),
        ));
    }, [aggregationFields, report]);

    return (
        <div className="Report">
            <h1 className="page-heading">
                {isLoading ? 'Loading Usage Report...' : 'Usage Report'}
            </h1>

            <div className="form-controls">
                <div className="form-item">
                    <label>Projects</label>

                    <div className="project-select">
                        <Select
                            closeMenuOnSelect={false}
                            components={{
                                indicatorSeparator: null,
                            }}
                            isMulti
                            onChange={handleProjectsFilterChange}
                            options={projectsToSelectOptions(projects.slice())}
                            placeholder="Showing all projects. Click to filter."
                            styles={reactSelectStyles}
                            theme={reactSelectTheme}
                            value={projectsToSelectOptions(filters.projects.slice())}
                            />
                    </div>
                </div>

                <div className="form-item">
                    <label>From</label>

                    <div className="range-select">
                        {['DAILY', 'WEEKLY'].includes(filters.bucketSize) && (
                            <DatePicker
                                defaultValue={filters.fromDate}
                                format="YYYY-MM-DD"
                                onChange={handleDateFromFilterChange}
                                />
                        )}

                        {filters.bucketSize === 'MONTHLY' && (
                            <MonthPicker
                                defaultValue={moment(filters.fromDate).startOf('month')}
                                format="MMMM, YYYY"
                                onChange={handleDateFromFilterChange}
                                />
                        )}

                        {filters.bucketSize === 'YEARLY' && (
                            <AntdSelect
                                defaultValue={moment(filters.fromDate).format('YYYY')}
                                onChange={handleDateFromFilterChange}
                                showSearch={false}
                                >
                                {getYearsSinceStart().map((year, index) => (
                                    <Option
                                        key={`${year}${index}`}
                                        value={moment(year, 'YYYY').format('YYYY')}
                                        >
                                        {year}
                                    </Option>
                                ))}
                            </AntdSelect>
                        )}
                    </div>
                </div>

                <div className="form-item">
                    <label>To</label>

                    <div className="range-select">
                        {['DAILY', 'WEEKLY'].includes(filters.bucketSize) && (
                            <DatePicker
                                defaultValue={filters.toDate}
                                format="YYYY-MM-DD"
                                onChange={handleDateToFilterChange}
                                />
                        )}

                        {filters.bucketSize === 'MONTHLY' && (
                            <MonthPicker
                                defaultValue={moment(filters.toDate).endOf('month')}
                                format="MMMM, YYYY"
                                onChange={handleDateToFilterChange}
                                />
                        )}

                        {filters.bucketSize === 'YEARLY' && (
                            <AntdSelect
                                defaultValue={moment(filters.toDate).endOf('year').format('YYYY')}
                                onChange={handleDateToFilterChange}
                                showSearch={false}
                                >
                                {getYearsSinceStart().map((year, index) => (
                                    <Option
                                        key={`${year}${index}`}
                                        value={moment(year, 'YYYY').endOf('year').format('YYYY')}
                                        >
                                        {year}
                                    </Option>
                                ))}
                            </AntdSelect>
                        )}
                    </div>
                </div>

                <div className="form-item">
                    <label>Period Grouping</label>

                    <div className="interval-select">
                        <RadioGroup
                            defaultValue={defaultBucketSize}
                            >
                            {TIME_PERIODS.map(period => (
                                <RadioButton
                                    checked={filters.bucketSize === period}
                                    key={period}
                                    onClick={updatePeriod(period)}
                                    value={period}
                                    >
                                    {period.slice(0, 1) + period.slice(1).toLowerCase()}
                                </RadioButton>
                            ))}
                        </RadioGroup>
                    </div>
                </div>

                <div className="form-item">
                    <div>
                        <Button
                            loading={isLoading}
                            onClick={updateChart}
                            type="primary"
                            >
                            Generate Report
                        </Button>
                    </div>
                </div>
            </div>

            <h2 className="section-heading">Summary</h2>

            <div className="summary">
                <RadioGroup
                    defaultValue // should show cost by default, i.e. 'true'
                    >
                    <RadioButton
                        checked={shouldShowCost}
                        key="RadioButton1"
                        onClick={() => { shouldShowCost || setShowCost(true); }}
                        value
                        >
                        Cost
                    </RadioButton>

                    <RadioButton
                        checked={!shouldShowCost}
                        key="RadioButton2"
                        onClick={() => { shouldShowCost && setShowCost(false); }}
                        value={false}
                        >
                        Usage
                    </RadioButton>
                </RadioGroup>

                <div className="summary-table">
                    <BootstrapTable
                        data={reportSummary}
                        keyField="key"
                        striped
                        width="200px"
                        >
                        {shouldShowCost
                        ? [
                            <TableHeaderColumn
                                dataAlign="right"
                                dataField="cpuCost"
                                dataFormat={formatCurrency}
                                key="cpuCost"
                                >
                                CPU Cost
                            </TableHeaderColumn>,
                            <TableHeaderColumn
                                dataAlign="right"
                                dataField="imageCost"
                                dataFormat={formatCurrency}
                                key="imageCost"
                                >
                                Image Cost
                            </TableHeaderColumn>,
                            <TableHeaderColumn
                                dataAlign="right"
                                dataField="objectsCost"
                                dataFormat={formatCurrency}
                                key="objectsCost"
                                >
                                Objects Cost
                            </TableHeaderColumn>,

                            <TableHeaderColumn
                                dataAlign="right"
                                dataField="volumeCost"
                                dataFormat={formatCurrency}
                                key="volumeCost"
                                >
                                Volume Cost
                            </TableHeaderColumn>,

                            <TableHeaderColumn
                                dataAlign="right"
                                dataFormat={(cell, row) => formatCurrency(sum([
                                    row.cpuCost,
                                    row.imageCost,
                                    row.objectsCost,
                                    row.volumeCost,
                                ]))}
                                key="totalCost"
                                >
                                Total Cost
                            </TableHeaderColumn>,
                        ]
                        : [
                            <TableHeaderColumn
                                dataAlign="right"
                                dataField="cpu"
                                dataFormat={formatNumber}
                                key="cpu"
                                >
                                CPU (hrs)
                            </TableHeaderColumn>,

                            <TableHeaderColumn
                                dataAlign="right"
                                dataField="image"
                                dataFormat={formatNumber}
                                key="image"
                                >
                                Image (hrs)
                            </TableHeaderColumn>,

                            <TableHeaderColumn
                                dataAlign="right"
                                dataField="objects"
                                dataFormat={formatNumber}
                                key="objects"
                                >
                                Objects (hrs)
                            </TableHeaderColumn>,

                            <TableHeaderColumn
                                dataAlign="right"
                                dataField="volume"
                                dataFormat={formatNumber}
                                key="volume"
                                >
                                Volume (hrs)
                            </TableHeaderColumn>,

                            <TableHeaderColumn
                                dataAlign="right"
                                dataFormat={(cell, row) => formatNumber(sum([
                                    row.cpu,
                                    row.image,
                                    row.objects,
                                    row.volume,
                                ]))}
                                key="totalUsage"
                                >
                                Total (hrs)
                            </TableHeaderColumn>,
                        ]}
                    </BootstrapTable>
                </div>
            </div>

            <div className={`chart-container ${isLoading ? 'is-loading' : 'not-loading'}`}>
                <ReactHighcharts
                    callback={chart => {
                        chartRef.current = chart;
                    }}
                    config={CHART_SETTINGS}
                    isPureConfig
                    />
            </div>

            <h2 className="section-heading">Details</h2>

            <div className={`usage-table ${isLoading ? 'is-loading' : 'not-loading'}`}>

                <div className="form-item">
                    <label>Group By</label>

                    <div style={{ marginBottom: '1rem' }}>
                        <RadioGroup>
                            {Object.entries(AGGREGATION_FIELDS).map(([fieldName, dbField]) => (
                                <RadioButton
                                    checked={aggregationFields.includes(dbField)}
                                    key={dbField}
                                    onClick={groupBy(dbField)}
                                    value={dbField}
                                    >
                                    {`${fieldName[0]}${fieldName.slice(1).toLowerCase()}`}
                                </RadioButton>
                            ))}
                        </RadioGroup>
                    </div>
                </div>

                <BootstrapTable
                    condensed
                    data={entriesToDisplay}
                    exportCSV
                    hover
                    ignoreSinglePage
                    keyField="key"
                    options={{
                        hideSizePerPage: true,
                        sizePerPage: 25,
                        sizePerPageList: [
                            10,
                            50,
                            100,
                        ],
                    }}
                    pagination
                    search
                    striped
                    >
                    <TableHeaderColumn
                        dataField="fromDate"
                        dataFormat={formatDateRange}
                        dataSort
                        export={!aggregationFields.includes(AGGREGATION_FIELDS.PERIOD)}
                        hidden={!aggregationFields.includes(AGGREGATION_FIELDS.PERIOD)}
                        >
                        Period
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataField="toDate"
                        export={!aggregationFields.includes(AGGREGATION_FIELDS.PERIOD)}
                        hidden
                        >
                        Period
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataField="projectId"
                        dataSort
                        export={!aggregationFields.includes(AGGREGATION_FIELDS.PROJECT)}
                        // isKey={true}
                        hidden
                        >
                        Project ID
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        csvFormat={(id) => find(projects, { id }).name}
                        csvHeader="projectName"
                        dataField="projectId"
                        dataFormat={id => find(projects, { id }).name}
                        dataSort
                        filterFormatted
                        hidden={!aggregationFields.includes(AGGREGATION_FIELDS.PROJECT)}
                        >
                        Project
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataField="username"
                        dataFormat={(cell, row) => cell ||
                            `(Project) ${find(projects, { id: row.projectId }).name}`}
                        dataSort
                        hidden={!aggregationFields.includes(AGGREGATION_FIELDS.USER)}
                        width="320px"
                        >
                        User
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="cpu"
                        dataFormat={formatNumber}
                        dataSort
                        hidden={shouldShowCost}
                        sortFunc={(a, b) => (
                            (a.cpu || 0) - (b.cpu || 0)
                        )}
                        >
                        CPU (hrs)
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="cpuCost"
                        dataFormat={formatCurrency}
                        dataSort
                        hidden={!shouldShowCost}
                        >
                        CPU Cost
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="image"
                        dataFormat={formatNumber}
                        dataSort
                        hidden={shouldShowCost}
                        >
                        Image (hrs)
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="imageCost"
                        dataFormat={formatCurrency}
                        dataSort
                        hidden={!shouldShowCost}
                        >
                        Image Cost
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="objects"
                        dataFormat={formatNumber}
                        dataSort
                        hidden={shouldShowCost}
                        >
                        Objects (hrs)
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="objectsCost"
                        dataFormat={formatCurrency}
                        dataSort
                        hidden={!shouldShowCost}
                        >
                        Objects Cost
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="volume"
                        dataFormat={formatNumber}
                        dataSort
                        hidden={shouldShowCost}
                        >
                        Volume (hrs)
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataField="volumeCost"
                        dataFormat={formatCurrency}
                        dataSort
                        hidden={!shouldShowCost}
                        >
                        Volume Cost
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataFormat={(cell, row) => formatNumber(sum([
                            row.cpu,
                            row.image,
                            row.objects,
                            row.volume,
                        ]))}
                        dataSort
                        hidden={shouldShowCost}
                        >
                        Total (hrs)
                    </TableHeaderColumn>

                    <TableHeaderColumn
                        dataAlign="right"
                        dataFormat={(cell, row) => formatCurrency(sum([
                            row.cpuCost,
                            row.imageCost,
                            row.objectsCost,
                            row.volumeCost,
                        ]))}
                        dataSort
                        hidden={!shouldShowCost}
                        >
                        Total Cost
                    </TableHeaderColumn>
                </BootstrapTable>
            </div>
        </div>
    );
};

export default observer(Report);
