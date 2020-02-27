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
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import animate from '@jam3/gsap-promise';
import user from '../../user';

import './Login.scss';

const animationStates = {
    afterLeave: {
        opacity: 0,
        y: -10,
    },
    beforeEnter: {
        opacity: 0,
        y: -10,
    },
    idle: {
        opacity: 1,
        y: 0,
    },
};

@observer
class Login extends Component {
    @observable username = '';

    @observable password = '';

    @observable errorMessage = '';

    handleSubmit = async (event) => {
        event.preventDefault();
        this.errorMessage = '';
        try {
            await user.login(this.username, this.password);
        } catch (error) {
            this.errorMessage = error.message;
        }
    }

    async componentWillAppear(callback) {
        this.animateIn({ delay: 1 })
            .then(callback);
    }

    componentWillEnter(callback) {
        this.animateIn().then(callback);
    }

    componentWillLeave(callback) {
        this.animateOut().then(callback);
    }

    animateIn({ delay } = { delay: 0 }) {
        const elements = [
            this.refs.logo,
            this.refs.usernameInput,
            this.refs.passwordInput,
            this.refs.loginButton,
        ];
        return animate.staggerFromTo(
            elements,
            0.25,
            animationStates.beforeEnter,
            {
                ...animationStates.idle,
                delay,
                clearProps: 'all',
            },
            0.1,
        );
    }

    animateOut() {
        const elements = [
            this.refs.logo,
            this.refs.usernameInput,
            this.refs.passwordInput,
            this.refs.loginButton,
        ];
        return animate.staggerTo(
            elements,
            0.25,
            Object.assign(animationStates.afterLeave),
            0.1,
        );
    }

    render() {
        return (
            <div className="Login" ref="container">
                <div className="login-inner">
                    <img
                        alt="Cancer Genome COLLABORATORY"
                        className="logo"
                        ref="logo"
                        src={require('../../assets/images/logo-full.png')}
                        />

                    {this.errorMessage && (
                        <div
                            className="alert alert-danger"
                            dangerouslySetInnerHTML={{ __html: this.errorMessage }}
                            />
                    )}

                    <form
                        className="form-horizontal col-sm-3"
                        id="login-form"
                        onSubmit={this.handleSubmit}
                        >
                        <div className="form-group">
                            <input
                                autoFocus
                                className="form-control"
                                id="username"
                                name="username"
                                onChange={e => { this.username = e.target.value; }}
                                placeholder="Username"
                                ref="usernameInput"
                                />
                        </div>
                        <div className="form-group">
                            <input
                                className="form-control"
                                id="password"
                                name="password"
                                onChange={e => { this.password = e.target.value; }}
                                placeholder="Password"
                                ref="passwordInput"
                                type="password"
                                />
                        </div>
                        <div className="form-group">
                            <button className="dcc form-control btn btn-primary" ref="loginButton" type="submit">
                                Login
                            </button>
                        </div>
                        <div className="form-group"><span>Please send an email to help@cancercollaboratory.org if you require a password reset.</span></div>
                    </form>
                </div>
            </div>
        );
    }
}

export default Login;
