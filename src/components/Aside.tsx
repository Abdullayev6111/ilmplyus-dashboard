interface Props {
  collapsed: boolean;
  onOpen: () => void;
  onClose: () => void;
}

import asideLogo from "../assets/images/talim tizimi white.svg";
import mainLogo from "../assets/images/logo-mini.svg";
import infoGrafikIcon from "../assets/images/aside-infografik.svg";
import usersIcon from "../assets/images/aside-users.svg";
import settingsIcon from "../assets/images/aside-settings.svg";
import branchesIcon from "../assets/images/aside-location.svg";
import classesIcon from "../assets/images/aside-school.svg";
import studentsIcon from "../assets/images/aside-students.svg";
import teachersIcon from "../assets/images/aside-teacher.svg";
import userRoleIcon from "../assets/images/aside-user-role.svg";
import paymentsIcon from "../assets/images/money-bill.svg";
import expenseIcon from "../assets/images/walletIcon.svg";
import coursesIcon from "../assets/images/user-graduate-solid-full.svg";
import roomsIcon from "../assets/images/school-solid-full.svg";
import departmentsIcon from "../assets/images/sitemap-solid-full.svg";
import areasIcon from "../assets/images/globe-solid-full.svg";
import levelsIcon from "../assets/images/signal-solid-full.svg";
import positionIcon from "../assets/images/briefcase-solid-full.svg";
import attendanceIcon from "../assets/images/user-clock-solid-full.svg";
import { Accordion } from "@mantine/core";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuthStore from "../store/useAuthStore";

const Aside = ({ collapsed, onOpen, onClose }: Props) => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const isAdmin = user?.roles?.some(
    (r) =>
      r.name.toLowerCase() === "admin" || r.name.toLowerCase() === "superadmin",
  );

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (isAdmin) return true;
    if (!user?.roles) return false;

    return user.roles.some((role) =>
      role.permissions?.some((p) => p.name === permission),
    );
  };

  const menu = [
    { label: t("aside.controlPanel"), icon: infoGrafikIcon, path: "/" },

    {
      label: t("aside.users"),
      icon: usersIcon,
      path: "/users",
      permission: "users.view",
    },

    {
      label: t("aside.branches"),
      icon: branchesIcon,
      path: "/branches",
      permission: "branches.view",
    },
    {
      label: t("aside.areas"),
      icon: areasIcon,
      path: "/areas",
      permission: "regions.view",
      children: [
        { label: t("aside.regions"), path: "/areas/regions" },
        { label: t("aside.districts"), path: "/areas/districts" },
      ],
    },
    {
      label: t("aside.departments"),
      icon: departmentsIcon,
      path: "/department",
      permission: "departments.view",
    },
    {
      label: t("aside.attendance"),
      icon: attendanceIcon,
      path: "/attendance",
      permission: "attendance.view",
    },
    {
      label: t("aside.groups"),
      icon: classesIcon,
      path: "/classes",
      permission: "groups.view",
    },
    {
      label: t("aside.courses"),
      icon: coursesIcon,
      path: "/courses",
      permission: "courses.view",
    },
    {
      label: t("aside.levels"),
      icon: levelsIcon,
      path: "/levels",
      permission: "levels.view",
    },
    {
      label: t("aside.positions"),
      icon: positionIcon,
      path: "/positions",
      permission: "positions.view",
    },
    {
      label: t("aside.students"),
      icon: studentsIcon,
      path: "/students",
      permission: "students.view",
    },
    {
      label: t("aside.teachers"),
      icon: teachersIcon,
      path: "/teachers",
      permission: "teachers.view",
    },
    {
      label: t("aside.rooms"),
      icon: roomsIcon,
      path: "/rooms",
      permission: "rooms.view",
    },
    {
      label: t("aside.payments"),
      icon: paymentsIcon,
      path: "/payments",
      permission: "payments.view",
    },
    {
      label: t("aside.expenses"),
      icon: expenseIcon,
      path: "/expenses",
      permission: "expenses.view",
      children: [
        { label: t("aside.expenseCategory"), path: "/expenses/category" },
        { label: t("aside.expenseSubCategory"), path: "/expenses/subcategory" },
        { label: t("aside.expenseCreate"), path: "/expenses/create" },
      ],
    },
    {
      label: t("aside.roles"),
      icon: userRoleIcon,
      path: "/roles",
      permission: "roles.view",
    },
    {
      label: t("aside.settings"),
      icon: settingsIcon,
      path: "/settings",
      permission: "settings.view",
    },
  ];

  const filteredMenu = menu.filter((item) => hasPermission(item.permission));

  // Expenses bo'limining active ekanligini tekshirish
  const isExpensesActive = location.pathname.startsWith("/expenses");

  return (
    <aside
      className={collapsed ? "aside collapsed" : "aside"}
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <div className="aside-top">
        <img
          src={collapsed ? mainLogo : asideLogo}
          alt="logo"
          className={collapsed ? "collapsed-logo" : "aside-logo"}
        />
      </div>

      <div className="aside-content">
        <Accordion radius={0} className="sidebar" multiple={false}>
          {filteredMenu?.map((item) => {
            if (item.children) {
              return (
                <Accordion.Item value={item.label} key={item.label}>
                  <Accordion.Control
                    className={`sidebar-accordion-control ${isExpensesActive ? "active" : ""}`}
                  >
                    <div className="sidebar-item-content">
                      <span className="sidebar-icon">
                        <img src={item.icon} alt={item.label} />
                      </span>
                      {!collapsed && (
                        <span className="sidebar-label">{item.label}</span>
                      )}
                    </div>
                  </Accordion.Control>

                  <Accordion.Panel>
                    <div className="sidebar-submenu">
                      {item?.children?.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            `sidebar-subitem ${isActive ? "active" : ""}`
                          }
                        >
                          <i className="fa-solid fa-circle dot-icon"></i>
                          <span className="subitem-label">{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? "active" : ""}`
                }
              >
                <span className="sidebar-icon">
                  <img src={item.icon} alt={item.label} />
                </span>
                <span className={`sidebar-label ${collapsed ? "hidden" : ""}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </Accordion>
      </div>
    </aside>
  );
};

export default Aside;
