import dummyData from '~/services/reports/dummyReport';

import {getSeriesFromReportEntries} from './getSeriesFromReportEntries';

window.testGetSeriesFromReportEntries = () => console.log(getSeriesFromReportEntries(dummyData.entries));
