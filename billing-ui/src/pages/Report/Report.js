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

import {
    useEffect,
    useRef,
    useState,
} from 'react';
import { observer } from 'mobx-react';
import {
    find,
    range,
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

import BootstrapTableWrapper from 'components/BootstrapTableWrapper';
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
    USER: 'username',
};

const defaultAggregationFields = Object.values(AGGREGATION_FIELDS);

const START_YEAR = 2013;
const getYearsSinceStart = () => range(START_YEAR, new Date().getUTCFullYear() + 1);

const projectsToSelectOptions = projects => projects.map(project => ({
    label: project.name,
    value: JSON.stringify(project), // else, the component generates React key errors
}));

const Report = ({ history }) => {
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
            ? history.push('/invoices')
        : user.logout();
    }, []);

    useEffect(() => {
        setReportSummary(aggregateEntries(report.entries, ''));
        setLoading(false);
    }, [report]);

    useEffect(() => {
        report.entries.length && redrawChart();
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
                    <BootstrapTableWrapper
                        columns={[
                            {
                                align: 'right',
                                classes: 'cost',
                                dataField: 'cpu',
                                formatter: formatNumber,
                                headerClasses: 'cost',
                                hidden: shouldShowCost,
                                text: 'CPU (hrs)',
                            },
                            {
                                align: 'right',
                                classes: 'cost',
                                dataField: 'cpuCost',
                                formatter: formatCurrency,
                                headerClasses: 'cost',
                                hidden: !shouldShowCost,
                                text: 'CPU Cost',
                            },
                            {
                                align: 'right',
                                classes: 'cost',
                                dataField: 'image',
                                formatter: formatNumber,
                                headerClasses: 'cost',
                                hidden: shouldShowCost,
                                text: 'Image (hrs)',
                            },
                            {
                                align: 'right',
                                classes: 'cost',
                                dataField: 'imageCost',
                                formatter: formatCurrency,
                                headerClasses: 'cost',
                                hidden: !shouldShowCost,
                                text: 'Image Cost',
                            },
                            {
                                align: 'right',
                                classes: 'cost',
                                dataField: 'objects',
                                formatter: formatNumber,
                                headerClasses: 'cost',
                                hidden: shouldShowCost,
                                text: 'Objects (hrs)',
                            },
                            {
                                align: 'right',
                                classes: 'cost',
                                dataField: 'objectsCost',
                                formatter: formatCurrency,
                                headerClasses: 'cost',
                                hidden: !shouldShowCost,
                                text: 'Objects Cost',
                            },
                            {
                                align: 'right',
                                classes: 'cost',
                                dataField: 'volume',
                                formatter: formatNumber,
                                headerClasses: 'cost',
                                hidden: shouldShowCost,
                                text: 'Volume (hrs)',
                            },
                            {
                                align: 'right',
                                classes: 'cost',
                                dataField: 'volumeCost',
                                formatter: formatCurrency,
                                headerClasses: 'cost',
                                hidden: !shouldShowCost,
                                text: 'Volume Cost',
                            },
                            {
                                align: 'right',
                                classes: 'cost',
                                dataField: 'total',
                                formatter: formatNumber,
                                headerClasses: 'cost',
                                hidden: shouldShowCost,
                                text: 'Total (hrs)',
                            },
                            {
                                align: 'right',
                                classes: 'cost',
                                dataField: 'totalCost',
                                formatter: formatCurrency,
                                headerClasses: 'cost',
                                hidden: !shouldShowCost,
                                text: 'Total Cost',
                            },
                        ]}
                        data={reportSummary}
                        keyField="key"
                        />
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

                <BootstrapTableWrapper
                    columns={[
                        {
                            classes: 'date-md',
                            csvExport: aggregationFields.includes(AGGREGATION_FIELDS.PERIOD),
                            csvFormatter: formatDateRange,
                            csvText: 'Period Start',
                            dataField: AGGREGATION_FIELDS.PERIOD,
                            formatter: formatDateRange,
                            headerClasses: 'date-md',
                            hidden: !aggregationFields.includes(AGGREGATION_FIELDS.PERIOD),
                            searchable: aggregationFields.includes(AGGREGATION_FIELDS.PERIOD),
                            sort: true,
                            text: 'Period',
                        },
                        {
                            csvExport: aggregationFields.includes(AGGREGATION_FIELDS.PERIOD),
                            csvFormatter: formatDateRange,
                            csvText: 'Period End',
                            dataField: 'toDate',
                            hidden: true,
                            searchable: false,
                            text: 'Period',
                        },
                        {
                            csvExport: aggregationFields.includes(AGGREGATION_FIELDS.PROJECT),
                            dataField: AGGREGATION_FIELDS.PROJECT,
                            hidden: true,
                            searchable: false,
                            sort: true,
                            text: 'Project ID',
                        },
                        {
                            csvFormatter: id => find(projects, { id })?.name,
                            csvText: 'Project Name',
                            dataField: AGGREGATION_FIELDS.PROJECT,
                            formatter: id => find(projects, { id })?.name,
                            hidden: !aggregationFields.includes(AGGREGATION_FIELDS.PROJECT),
                            searchable: aggregationFields.includes(AGGREGATION_FIELDS.PROJECT),
                            sort: true,
                            text: 'Project',
                        },
                        {
                            csvFormatter: cell => cell || '(Project)',
                            dataField: AGGREGATION_FIELDS.USER,
                            formatter: (cell, { projectId: id }) => cell ||
                                `(Project) ${find(projects, { id })?.name || ''}`,
                            hidden: !aggregationFields.includes(AGGREGATION_FIELDS.USER),
                            searchable: aggregationFields.includes(AGGREGATION_FIELDS.USER),
                            sort: true,
                            style: {
                                width: '320px',
                            },
                            text: 'User',
                        },
                        {
                            align: 'right',
                            classes: 'cost',
                            dataField: 'cpu',
                            formatter: formatNumber,
                            headerClasses: 'cost',
                            hidden: shouldShowCost,
                            searchable: !shouldShowCost,
                            sort: true,
                            sortFunc: customNumberSort,
                            text: 'CPU (hrs)',
                        },
                        {
                            align: 'right',
                            classes: 'cost',
                            csvFormatter: formatCurrency,
                            dataField: 'cpuCost',
                            formatter: formatCurrency,
                            headerClasses: 'cost',
                            hidden: !shouldShowCost,
                            searchable: shouldShowCost,
                            sort: true,
                            sortFunc: customNumberSort,
                            text: 'CPU Cost',
                        },
                        {
                            align: 'right',
                            classes: 'cost',
                            dataField: 'image',
                            formatter: formatNumber,
                            headerClasses: 'cost',
                            hidden: shouldShowCost,
                            searchable: !shouldShowCost,
                            sort: true,
                            sortFunc: customNumberSort,
                            text: 'Image (hrs)',
                        },
                        {
                            align: 'right',
                            classes: 'cost',
                            csvFormatter: formatCurrency,
                            dataField: 'imageCost',
                            formatter: formatCurrency,
                            headerClasses: 'cost',
                            hidden: !shouldShowCost,
                            searchable: shouldShowCost,
                            sort: true,
                            sortFunc: customNumberSort,
                            text: 'Image Cost',
                        },
                        {
                            align: 'right',
                            classes: 'cost',
                            dataField: 'objects',
                            formatter: formatNumber,
                            headerClasses: 'cost',
                            hidden: shouldShowCost,
                            searchable: !shouldShowCost,
                            sort: true,
                            sortFunc: customNumberSort,
                            text: 'Objects (hrs)',
                        },
                        {
                            align: 'right',
                            classes: 'cost',
                            csvFormatter: formatCurrency,
                            dataField: 'objectsCost',
                            formatter: formatCurrency,
                            headerClasses: 'cost',
                            hidden: !shouldShowCost,
                            searchable: shouldShowCost,
                            sort: true,
                            sortFunc: customNumberSort,
                            text: 'Objects Cost',
                        },
                        {
                            align: 'right',
                            classes: 'cost',
                            dataField: 'volume',
                            formatter: formatNumber,
                            headerClasses: 'cost',
                            hidden: shouldShowCost,
                            searchable: !shouldShowCost,
                            sort: true,
                            sortFunc: customNumberSort,
                            text: 'Volume (hrs)',
                        },
                        {
                            align: 'right',
                            classes: 'cost',
                            csvFormatter: formatCurrency,
                            dataField: 'volumeCost',
                            formatter: formatCurrency,
                            headerClasses: 'cost',
                            hidden: !shouldShowCost,
                            searchable: shouldShowCost,
                            sort: true,
                            sortFunc: customNumberSort,
                            text: 'Volume Cost',
                        },
                        {
                            align: 'right',
                            classes: 'cost',
                            dataField: 'total',
                            formatter: formatNumber,
                            headerClasses: 'cost',
                            hidden: shouldShowCost,
                            searchable: !shouldShowCost,
                            sort: true,
                            sortFunc: customNumberSort,
                            text: 'Total (hrs)',
                        },
                        {
                            align: 'right',
                            classes: 'cost',
                            csvFormatter: formatCurrency,
                            dataField: 'totalCost',
                            formatter: formatCurrency,
                            headerClasses: 'cost',
                            hidden: !shouldShowCost,
                            searchable: shouldShowCost,
                            sort: true,
                            sortFunc: customNumberSort,
                            text: 'Total Cost',
                        },
                    ]}
                    data={entriesToDisplay}
                    exportCSV
                    fileName="report.csv"
                    keyField="key"
                    pagination
                    search
                    />
            </div>
        </div>
    );
};

export default observer(Report);
