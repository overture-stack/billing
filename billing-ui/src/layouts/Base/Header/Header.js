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

import { Link } from 'react-router';
import user from '../../../user';

import cancerCollabLogoImg from '../../../assets/images/logo.svg';
import './Header.scss';

const Header = () => (
    <header>
        <div
            className="topbar"
            >
            <div
                className="link-container"
                >
                <a
                    className="links"
                    href="http://www.cancercollaboratory.org"
                    rel="noreferrer"
                    target="_blank"
                    >
                    Collaboratory Website
                </a>
                <span className="links"> | </span>
                <a
                    className="links"
                    href="https://console.cancercollaboratory.org/"
                    rel="noreferrer"
                    target="_blank"
                    >
                    Collaboratory Console
                </a>
            </div>
            <div
                className="user-container"
                >
                <span
                    className="glyphicon glyphicon-user user-icon"
                    />
                <span
                    className="user-logout"
                    onClick={() => user.logout()}
                    >
                    Logout
                </span>
            </div>
        </div>
        <div className="Header">
            <div>
                <img
                    alt="Cancer Genome COLLABORATORY"
                    className="logo"
                    src={cancerCollabLogoImg}
                    />
            </div>
            <div>
                <ul className="menu">
                    {user.roles.report && (
                        <li>
                            <Link
                                activeClassName="active"
                                to="/report"
                                >
                                Report
                            </Link>
                        </li>
                    )}
                    {user.roles.invoices && (
                        <li>
                            <Link
                                activeClassName="active"
                                to="/invoices"
                                >
                                Invoices
                            </Link>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    </header>
);

export default Header;
