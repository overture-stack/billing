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

const aggregateEntries = (entries, groupByIteratee) =>
    Object.entries(groupBy(entries, groupByIteratee))
        .map(([key, items]) => items.reduce((acc, entry) => ({
            ...acc,
            ...entry,
            cpu: (acc.cpu || 0) + (entry.cpu || 0),
            cpuCost: (acc.cpuCost || 0) + (entry.cpuCost || 0),
            image: (acc.image || 0) + (entry.image || 0),
            imageCost: (acc.imageCost || 0) + (entry.imageCost || 0),
            key,
            objects: (acc.objects || 0) + (entry.objects || 0),
            objectsCost: (acc.objectsCost || 0) + (entry.objectsCost || 0),
            volume: (acc.volume || 0) + (entry.volume || 0),
            volumeCost: (acc.volumeCost || 0) + (entry.volumeCost || 0),
        }), {}));

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
