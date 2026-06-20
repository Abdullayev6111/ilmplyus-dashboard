interface NavChild {
  label: string;
  path: string;
  permission?: string;
  isNested?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  faIcon?: string;
  imgIcon?: string;
  paths: string[];
  children: NavChild[];
}

interface Props {
  collapsed: boolean;
  onOpen: () => void;
  onClose: () => void;
}

import { useState } from 'react';
import asideLogo from '../assets/images/talim tizimi white.svg';
import mainLogo from '../assets/images/logo-mini.svg';
import infoGrafikIcon from '../assets/images/aside-infografik.svg';
import expenseIcon from '../assets/images/walletIcon.svg';
import studentsIcon from '../assets/images/aside-students.svg';
import paymentsIcon from '../assets/images/money-bill.svg';
import userIcon from '../assets/images/aside-users.svg';
import employeeIcon from '../assets/images/briefcase-solid-full.svg';
import organizationIcon from '../assets/images/school-solid-full.svg';
import coursesIcon from '../assets/images/aside-school.svg';
import salariesIcon from '../assets/images/money-check-dollar-solid-full.svg';
import salesDepartmentIcon from '../assets/images/chart-line-solid-full.svg';
import testIcon from '../assets/images/clipboard-check-solid-full.svg';
import trashIcon from '../assets/images/trash-solid-full.svg';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardSettings } from '../pages/dashboard/dashboard.service';
import { API } from '../api/api';

const pathMatches = (path: string, current: string) => {
  if (path === '/') return current === '/';
  return current === path || current.startsWith(path + '/');
};

const Aside = ({ collapsed, onOpen, onClose }: Props) => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const isAdmin = user?.roles?.some(
    (r) => r.name.toLowerCase() === 'admin' || r.name.toLowerCase() === 'superadmin',
  );

  const { data: dashboardSettings } = useQuery({
    queryKey: ['dashboard-settings'],
    queryFn: fetchDashboardSettings,
    staleTime: 5 * 60 * 1000,
    enabled: !!user && !isAdmin,
  });

  const { data: trashUnviewedCount = 0 } = useQuery<number>({
    queryKey: ['trash-unviewed-count'],
    queryFn: async () => {
      const { data } = await API.get('/trash/unviewed-count');
      return typeof data === 'number' ? data : (data?.count ?? 0);
    },
    refetchInterval: 60 * 1000,
    enabled: !!user,
  });

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (isAdmin) return true;
    if (!user?.roles) return false;

    const hasBackendPerm = user.roles.some((role) =>
      role.permissions?.some((p) => p.name === permission),
    );
    if (hasBackendPerm) return true;

    const roleName = user.roles[0]?.name;
    if (!roleName || !dashboardSettings) return false;
    const virtualPerms = dashboardSettings.pagePermissions?.[roleName] ?? [];
    return virtualPerms.includes(permission);
  };

  const groups: NavGroup[] = [
    {
      id: 'users-group',
      label: t('aside.users'),
      imgIcon: userIcon,
      paths: ['/users', '/roles', '/operators'],
      children: [
        { label: t('aside.users'), path: '/users', permission: 'users.view' },
        { label: t('aside.roles'), path: '/roles', permission: 'roles.view' },
        { label: t('aside.operators'), path: '/operators', permission: 'operators.view' },
      ],
    },
    {
      id: 'org-group',
      label: t('aside.organization'),
      imgIcon: organizationIcon,
      paths: ['/branches', '/areas', '/department', '/rooms', '/face-id'],
      children: [
        { label: t('aside.branches'), path: '/branches', permission: 'branches.view' },
        { label: t('aside.areas'), path: '/areas', permission: 'regions.view', isNested: true },
        { label: t('aside.departments'), path: '/department', permission: 'departments.view' },
        { label: t('aside.rooms'), path: '/rooms', permission: 'rooms.view' },
        { label: t('aside.faceId'), path: '/face-id', permission: 'hikvision_devices.view' },
      ],
    },
    {
      id: 'staff-group',
      label: t('aside.staffDepartment'),
      imgIcon: employeeIcon,
      paths: ['/attendance', '/positions', '/contracts', '/teachers'],
      children: [
        { label: t('aside.staffAttendance'), path: '/attendance', permission: 'attendance.view' },
        { label: t('aside.positions'), path: '/positions', permission: 'positions.view' },
        { label: t('aside.contract'), path: '/contracts', permission: 'employee_contracts.view' },
        { label: t('aside.teachers'), path: '/teachers', permission: 'teachers.view' },
      ],
    },
    {
      id: 'courses-group',
      label: t('aside.courses'),
      imgIcon: coursesIcon,
      paths: [
        '/courses',
        '/levels',
        '/course-prices',
        '/lesson-schedule',
        '/demo-lesson',
        '/groups',
      ],
      children: [
        { label: t('aside.courses'), path: '/courses', permission: 'courses.view' },
        { label: t('aside.levels'), path: '/levels', permission: 'levels.view' },
        {
          label: t('aside.coursePrices'),
          path: '/course-prices',
          permission: 'course_prices.view',
        },
        {
          label: t('aside.lessonSchedule'),
          path: '/lesson-schedule',
          permission: 'lesson_schedule.view',
        },
        { label: t('aside.demoLesson'), path: '/demo-lesson', permission: 'demo_lessons.view' },
        { label: t('aside.groups'), path: '/groups', permission: 'lesson_schedules.view' },
      ],
    },
    {
      id: 'sales-group',
      label: t('aside.salesDepartment'),
      imgIcon: salesDepartmentIcon,
      paths: ['/lid', '/ip-telephone', '/refusal-reasons', '/sources', '/tasks'],
      children: [
        { label: t('aside.lidList'), path: '/lid', permission: 'lids.view' },
        { label: t('aside.ipTelephone'), path: '/ip-telephone', permission: 'ip-telephone.view' },
        {
          label: t('aside.refusalReasons'),
          path: '/refusal-reasons',
          permission: 'rejection_reasons.view',
        },
        { label: t('aside.sources'), path: '/sources', permission: 'sources.view' },
        { label: t('aside.tasks'), path: '/tasks', permission: 'tasks.view' },
      ],
    },
    {
      id: 'test-group',
      label: t('aside.test'),
      imgIcon: testIcon,
      paths: ['/questions'],
      children: [{ label: t('aside.questions'), path: '/questions', permission: 'questions.view' }],
    },
    {
      id: 'expenses-group',
      label: t('aside.expenses'),
      imgIcon: expenseIcon,
      paths: ['/expenses'],
      children: [
        {
          label: t('aside.expenseCategory'),
          path: '/expenses/category',
          permission: 'expense_categories.view',
        },
        {
          label: t('aside.expenseSubCategory'),
          path: '/expenses/subcategory',
          permission: 'expense_subcategories.view',
        },
        { label: t('aside.expenseCreate'), path: '/expenses/create', permission: 'expenses.view' },
      ],
    },
    {
      id: 'students-group',
      label: t('aside.students'),
      imgIcon: studentsIcon,
      paths: ['/students-attendance', '/student-tasks', '/students-contract', '/students'],
      children: [
        {
          label: t('aside.studentsAttendance'),
          path: '/students-attendance',
          permission: 'student_attendance.view',
        },
        {
          label: t('aside.studentTasks'),
          path: '/student-tasks',
          permission: 'homework_submissions.view',
        },
        {
          label: t('aside.studentsContract'),
          path: '/students-contract',
          permission: 'student_contracts.view',
        },
        { label: t('aside.students'), path: '/students', permission: 'students.view' },
      ],
    },
    {
      id: 'payments-group',
      label: t('aside.payments'),
      imgIcon: paymentsIcon,
      paths: ['/payments'],
      children: [
        { label: t('aside.paymentsList'), path: '/payments', permission: 'payments.view' },
        {
          label: t('aside.paymentsArchive'),
          path: '/payments/archive',
          permission: 'payments.view',
        },
      ],
    },
    {
      id: 'salaries-group',
      label: t('aside.salaries'),
      imgIcon: salariesIcon,
      paths: ['/salaries'],
      children: [{ label: t('aside.salary'), path: '/salaries', permission: 'salaries.view' }],
    },
    {
      id: 'trash-group',
      label: t('aside.trash'),
      imgIcon: trashIcon,
      paths: ['/trash'],
      children: [{ label: t('aside.trash'), path: '/trash', permission: 'trash.view' }],
    },
  ];

  const getInitialOpen = () => {
    const cur = location.pathname;
    const open: Record<string, boolean> = {};
    groups.forEach((g) => {
      if (g.paths.some((p) => pathMatches(p, cur))) open[g.id] = true;
    });
    return open;
  };

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(getInitialOpen);
  const [openAreas, setOpenAreas] = useState(location.pathname.startsWith('/areas'));

  const toggle = (id: string) => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isGroupActive = (paths: string[]) => paths.some((p) => pathMatches(p, location.pathname));

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
        <div className="sidebar">
          {/* Boshqaruv paneli */}
          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">
              <img src={infoGrafikIcon} alt="dashboard" />
            </span>
            <span className={`sidebar-label ${collapsed ? 'hidden' : ''}`}>
              {t('aside.controlPanel')}
            </span>
          </NavLink>

          {/* Accordion groups */}
          {groups.map((group) => {
            const filteredChildren = group.children.filter((c) => hasPermission(c.permission));
            if (!filteredChildren.length) return null;

            const active = isGroupActive(group.paths);
            const open = !!openMap[group.id];

            return (
              <div key={group.id} className="nav-group">
                {/* Group header */}
                <div
                  className={`nav-group-header ${active ? 'nav-group-active' : ''}`}
                  onClick={() => !collapsed && toggle(group.id)}
                >
                  <span className="sidebar-icon">
                    {group.imgIcon ? (
                      <img src={group.imgIcon} alt={group.label} />
                    ) : (
                      <i className={group.faIcon} />
                    )}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="nav-group-label">{group.label}</span>
                      {group.id === 'trash-group' && trashUnviewedCount > 0 && (
                        <span className="trash-unviewed-badge">{trashUnviewedCount}</span>
                      )}
                      <i
                        className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'} nav-group-chevron`}
                      />
                    </>
                  )}
                </div>

                {/* Sub-items */}
                {open && !collapsed && (
                  <div className="sidebar-submenu">
                    {filteredChildren.map((child) => {
                      if (child.isNested) {
                        const areasActive = location.pathname.startsWith('/areas');
                        return (
                          <div key={child.path}>
                            <div
                              className={`sidebar-subitem sidebar-area-parent ${areasActive ? 'active' : ''}`}
                              onClick={() => setOpenAreas((v) => !v)}
                            >
                              <i className="fa-solid fa-circle dot-icon" />
                              <span className="subitem-label">{t('aside.areas')}</span>
                              <i
                                className={`fa-solid ${openAreas ? 'fa-chevron-up' : 'fa-chevron-down'} area-chevron`}
                              />
                            </div>
                            {openAreas && (
                              <>
                                <NavLink
                                  to="/areas/regions"
                                  className={({ isActive }) =>
                                    `sidebar-subitem sidebar-subitem-nested ${isActive ? 'active' : ''}`
                                  }
                                >
                                  <i className="fa-solid fa-circle dot-icon" />
                                  <span className="subitem-label">{t('aside.regions')}</span>
                                </NavLink>
                                <NavLink
                                  to="/areas/districts"
                                  className={({ isActive }) =>
                                    `sidebar-subitem sidebar-subitem-nested ${isActive ? 'active' : ''}`
                                  }
                                >
                                  <i className="fa-solid fa-circle dot-icon" />
                                  <span className="subitem-label">{t('aside.districts')}</span>
                                </NavLink>
                              </>
                            )}
                          </div>
                        );
                      }

                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            `sidebar-subitem ${isActive ? 'active' : ''}`
                          }
                        >
                          <i className="fa-solid fa-circle dot-icon" />
                          <span className="subitem-label">{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default Aside;
