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
import fetchHeaders from '../../utils/fetchHeaders';
import user from '../../user';

export function sendEmail(invoice, notification) {
  notification.addNotification({
    message: 'Sending Email',
    level: 'info'
  });
  fetch(`/api/email?invoice=${invoice}`, {
    method: 'GET',
    headers: fetchHeaders.get(),
  }).then((response) => {
    notification.clearNotifications();
    user.token = response.headers.get('authorization');
    if (response.status === 401) user.logout();
    else if (response.status === 200) {
      notification.addNotification({
        message: 'Email Sent!',
        level: 'success',
      });
    } else {
      notification.addNotification({
        message: 'There was a problem sending email.<br/> Please try again.',
        level: 'error',
      });
    }
  });
}
