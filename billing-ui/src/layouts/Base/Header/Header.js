import React from 'react';
import user from '~/user';

import './Header.scss';

export default function Header() {
  return (
    <header className="Header">
      <img
        className="logo"
        src={require('~/assets/images/logo-full.png')}
        alt="Cancer Genome COLLABORATORY"
      />

      <span
        className="logout"
        onClick={() => user.logout()}
      >Logout</span>
    </header>
  );
}