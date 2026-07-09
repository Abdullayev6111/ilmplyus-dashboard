import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import { useOptions } from "../hooks/useOptions";

type ControlItem = {
  id: number;
  title: string;
  number: string;
  path: string;
};

const ControlCard = () => {
  const { t } = useTranslation();

  const { data: users } = useOptions("users");
  const { data: branches } = useOptions("branches");

  const usersCount = users?.length ?? 0;
  const branchesCount = branches?.length ?? 0;

  const controlData: ControlItem[] = useMemo(
    () => [
      {
        id: 1,
        title: t("home.dailySale"),
        number: `13.200.000 ${t("home.sum")}`,
        path: "/",
      },
      {
        id: 2,
        title: t("home.users"),
        number: `${usersCount} ${t("home.piece")}`,
        path: "/users",
      },
      {
        id: 3,
        title: t("home.errors"),
        number: `11 ${t("home.piece")}`,
        path: "/",
      },
      {
        id: 4,
        title: t("home.branches"),
        number: `${branchesCount} ${t("home.piece")}`,
        path: "/branches",
      },
      {
        id: 5,
        title: t("home.products"),
        number: `10 ${t("home.piece")}`,
        path: "/",
      },
    ],
    [t, usersCount, branchesCount],
  );

  return (
    <>
      {controlData?.map((item) => (
        <NavLink key={item.id} to={item.path} className="control-card">
          <h4>{item.title}</h4>
          <p>{item.number}</p>
        </NavLink>
      ))}
    </>
  );
};

export default ControlCard;
