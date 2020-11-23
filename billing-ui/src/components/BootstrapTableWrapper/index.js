import { Fragment } from 'react';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';
import ToolkitProvider, {
    CSVExport,
    Search,
} from 'react-bootstrap-table2-toolkit/dist/react-bootstrap-table2-toolkit.min';
// ^^ https://github.com/react-bootstrap-table/react-bootstrap-table2/pull/1506 ^^

import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import './styles.scss';

const BootstrapTableWrapper = ({
    columns,
    data,
    exportCSV,
    fileName,
    keyField,
    pagination,
    search,
    ...tableProps
}) => (
    (exportCSV || search)
    ? (
        <ToolkitProvider
            columns={exportCSV
                ? columns.map(column => ({
                    ...column,
                    csvFormatter: (...args) => (
                        args[0]
                            ? column.csvFormatter
                                ? column.csvFormatter(...args)
                            : args[0]
                        : '--'
                    ),
                }))
                : columns}
            data={data}
            exportCSV={exportCSV && {
                fileName,
                onlyExportFiltered: search,
            }}
            keyField={keyField}
            search={search}
            >
            {({
                baseProps,
                csvProps,
                searchProps,
            }) => (
                <Fragment>
                    <section className="react-bootstrap-toolbar">
                        <CSVExport.ExportCSVButton
                            className="btn-success btn-sm"
                            // className="exportCSV-button"
                            {...csvProps}
                            >
                            <i className="glyphicon glyphicon-export" />
                            Export to CSV
                        </CSVExport.ExportCSVButton>

                        <Search.SearchBar
                            {...searchProps}
                            />
                    </section>

                    <BootstrapTable
                        condensed
                        hover
                        ignoreSinglePage
                        noDataIndication={() => (
                            'There is no data to display'
                        )}
                        pagination={pagination && paginationFactory({
                            hideSizePerPage: true,
                            sizePerPage: 25,
                            sizePerPageList: [
                                10,
                                50,
                                100,
                            ],
                        })}
                        striped
                        {...baseProps}
                        {...tableProps}
                        />
                </Fragment>
            )}
        </ToolkitProvider>
    )
    : (
        <BootstrapTable
            columns={columns}
            condensed
            data={data}
            hover
            ignoreSinglePage
            keyField={keyField}
            noDataIndication={() => (
                'There is no data to display'
            )}
            pagination={pagination && paginationFactory({
                hideSizePerPage: true,
                sizePerPage: 10,
                sizePerPageList: [
                    10,
                    50,
                    100,
                ],
            })}
            striped
            {...tableProps}
            />
    )
);

export default BootstrapTableWrapper;
