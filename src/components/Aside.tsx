interface Props {
  collapsed: boolean;
  onOpen: () => void;
  onClose: () => void;
}

import asideLogo from '../assets/images/talim tizimi white.svg';
import mainLogo from '../assets/images/logo.svg';
import infoGrafikIcon from '../assets/images/aside-infografik.svg';
import usersIcon from '../assets/images/aside-users.svg';
import settingsIcon from '../assets/images/aside-settings.svg';
import branchesIcon from '../assets/images/aside-location.svg';
import classesIcon from '../assets/images/aside-school.svg';
import studentsIcon from '../assets/images/aside-students.svg';
import teachersIcon from '../assets/images/aside-teacher.svg';
import { Accordion } from '@mantine/core';
import { NavLink } from 'react-router-dom';

const menu = [
  { label: 'Boshqaruv paneli', icon: infoGrafikIcon, path: '/' },
  { label: 'Foydalanuvchilar', icon: usersIcon, path: '/users' },
  { label: 'Sozlamalar', icon: settingsIcon, path: '/settings' },
  { label: 'Filiallar', icon: branchesIcon, path: '/branches' },
  { label: 'Sinflar', icon: classesIcon, path: '/classes' },
  { label: 'O‘quvchilar', icon: studentsIcon, path: '/students' },
  { label: 'O‘qtuvchilar', icon: teachersIcon, path: '/teachers' },
];

const Aside = ({ collapsed, onOpen, onClose }: Props) => {
  return (
    <aside
      className={collapsed ? 'aside collapsed' : 'aside'}
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <div className="aside-top">
        <img
          src={collapsed ? mainLogo : asideLogo}
          alt="logo"
          className={collapsed ? 'collapsed-logo' : 'aside-logo'}
        />
      </div>

      <div className="aside-content">
        <Accordion radius={0} className="sidebar" multiple={false}>
          {menu.map((item) => (
            <Accordion.Item value={item.label} key={item.label}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Accordion.Control component="div">
                  <span className="sidebar-icon">
                    <img src={item.icon} alt={item.label} />
                  </span>

                  <span className={`sidebar-label ${collapsed ? 'hidden' : ''}`}>{item.label}</span>
                </Accordion.Control>
              </NavLink>

              <Accordion.Panel />
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </aside>
  );
};

export default Aside;
