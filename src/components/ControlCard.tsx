import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { API } from "../api/api";
import { useMemo } from "react";

type ControlItem = {
  id: number;
  title: string;
  number: string;
  path: string;
};

type UsersResponse = {
  total: number;
};

const ControlCard = () => {
  const { t } = useTranslation();

  const { data: usersCount = 0 } = useQuery({
    queryKey: ["users-count"],
    queryFn: async () => {
      const res = await API.get<UsersResponse>("/users");
      return res.data;
    },
    select: (data) => data.total,
    staleTime: 1000 * 60 * 2,
  });

  const { data: branchesCount = 0 } = useQuery({
    queryKey: ["branches-count"],
    queryFn: async () => {
      const res = await API.get("/branches");
      return res.data;
    },
    select: (data) => data?.length ?? 0,
    staleTime: 1000 * 60 * 2,
  });

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
