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
import moment from 'moment';
import _ from 'lodash';
import {aggregateEntries} from './aggregateEntries';

// Note: Chang's idea  - chang
const metricNameMap = {
    'cpuCost': 'cpu',
    'imageCost': 'image',
    'volumeCost': 'volume',
};

export function getSeriesFromReportEntries(entries, {shouldShowCost}={shouldShowCost: false}) {
  const aggregatedEntries = aggregateEntries(entries, 'fromDate');
  const metrics = shouldShowCost? ['cpuCost', 'imageCost', 'volumeCost']: ['cpu', 'image', 'volume'];
  return metrics
    .map(metric => ({
      name: metricNameMap[metric] || metric,
      data: aggregatedEntries.map(entry => ({
        x: moment(entry.fromDate, moment.ISO_8601).valueOf(),
        y: entry[metric] || 0,
      }))
    }))
}
