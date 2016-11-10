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
import _ from 'lodash';
import moment from 'moment';

const dummyUsers = [
  'Jeff',
  'Ryan',
  'Brad',
  'Alex',
  'Matt',
];

const projectIds = [
  'project_1',
  'project_2',
  'project_3',
  'project_4',
  'project_5',
  'project_6',
];

const DATE_FORMAT = 'YYYY-MM-DD';

const bucketMaps = {
  DAILY: {
    interval: [1, 'd'],
    multiplier: 1,
  },
  WEEKLY: {
    interval: [1, 'w'],
    multiplier: 7,
  },
  MONTHLY: {
    interval: [1, 'm'],
    multiplier: 30,
  },
  YEARLY: {
    interval: [1, 'y'],
    multiplier: 365,
  },
}

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export default function makeDummyReport({number, bucketSize, fromDate, toDate}) {
  const startDate = moment(fromDate, DATE_FORMAT);
  const endDate = moment(toDate, DATE_FORMAT);

  const bucketVars = bucketMaps[bucketSize];

  return {
    fromDate: startDate.format(DATE_FORMAT),
    toDate: endDate.format(DATE_FORMAT),
    bucket: bucketSize,
    entries: _.sortBy(_.range(number).map((x, i) => {
      const bucketStartDate = moment(randomDate(startDate.toDate(), endDate.toDate()));
      const bucketEndDate = bucketStartDate.add(bucketMaps[bucketSize].interval[0], bucketMaps[bucketSize].interval[1]);

      return {
        fromDate: bucketStartDate.format(DATE_FORMAT),
        toDate: bucketEndDate.format(DATE_FORMAT),
        user: _.sample(dummyUsers),
        projectId: _.sample(projectIds),
        cpu: _.random(1, 50 * bucketVars.multiplier),
        volume: _.random(10 * bucketVars.multiplier, 60 * bucketVars.multiplier),
        image: _.random(1, 40 * bucketVars.multiplier),
      };
    }), 'fromDate')
  }
};