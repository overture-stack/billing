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
    groupBy,
} from 'lodash';
import {
    formatNumber,
} from 'utils/formats';

const FIELDS = [
    'cpu',
    'cpuCost',
    'image',
    'imageCost',
    'objects',
    'objectsCost',
    'volume',
    'volumeCost',
];

const addNumbers = (acc, value, key) => {
    const newNum = Number(value[key]);
    const prevSum = Number(acc[key]);
    const newSum = newNum + prevSum || prevSum;

    return newSum ? { [key]: newSum } : {};
};

const aggregateEntries = (entries, groupByIteratee) =>
    Object.entries(groupBy(entries, groupByIteratee))
        .map(([key, items]) => items.reduce((prevItems, entry) => ({
            ...entry,
            ...FIELDS.reduce((prevFields, fieldName) => ({
                ...prevFields,
                ...addNumbers(prevFields, entry, fieldName),
            }), {
                key,
                ...prevItems,
            }),
        }), {}))
        .map(item => ({
            ...item,
            ...Object.entries(item) // let's generate totals
                .filter(([key]) => FIELDS.includes(key))
                .reduce((prevTotals, [key, value]) => {
                    const total = `total${key.toLowerCase().includes('cost') ? 'Cost' : ''}`;

                    return {
                        ...prevTotals,
                        ...{ [total]: value + (prevTotals[total] || 0) },
                    };
                }, {}),
        }));

export default aggregateEntries;

const mockEntry = {
    cpu: 0,
    cpuCost: 0,
    image: 0,
    imageCost: 0,
    objects: 0,
    objectsCost: 0,
    volume: 0,
    volumeCost: 0,
};

export const noEntries = AGGREGATION_FIELDS => (
    window.localStorage.getItem('stayOffline')
        ? [
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
            mockEntry,
        ].map((each, key) => ({
            ...each,
            key: `noEntry${key}`,
            [AGGREGATION_FIELDS.PROJECT]: `noEntry${key}`,
            [AGGREGATION_FIELDS.USER]: `userName-${key}`,
        }))
        : []
);

export const noProjects = ({ entries }) => (
    window.localStorage.getItem('stayOffline')
        ? entries.map(each => ({
            id: each.key,
            name: `projectName-${each.key}`,
        }))
        : []
);
