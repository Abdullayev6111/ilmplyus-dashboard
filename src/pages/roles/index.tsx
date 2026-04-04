import "./roles.css";
import { useTranslation } from "react-i18next";

interface PermissionProps {
  title: string;
  items: string[];
}

const Roles = () => {
  const { t } = useTranslation();

  return (
    <section className="role-page">
      <div className="role-create-card">
        <h2>{t("roles.pageTitle")}</h2>

        <div className="role-form">
          <label>
            {t("roles.roleName")}
            <input type="text" placeholder={t("roles.rolePlaceholder")} />
          </label>

          <button className="save-btn">{t("roles.save")}</button>
        </div>
      </div>

      <div className="permission-grid">
        <PermissionCard
          title={t("roles.adminPanel")}
          items={[t("roles.accessPanel")]}
        />

        <PermissionCard
          title={t("roles.users")}
          items={[
            t("roles.add"),
            t("roles.edit"),
            t("roles.view"),
            t("roles.delete"),
            t("roles.setTime"),
            t("roles.archive"),
          ]}
        />

        <PermissionCard
          title={t("roles.payments")}
          items={[
            t("roles.add"),
            t("roles.edit"),
            t("roles.view"),
            t("roles.delete"),
          ]}
        />

        <PermissionCard
          title={t("roles.expenses")}
          items={[
            t("roles.add"),
            t("roles.edit"),
            t("roles.view"),
            t("roles.delete"),
          ]}
        />

        <PermissionCard
          title={t("roles.branches")}
          items={[
            t("roles.add"),
            t("roles.edit"),
            t("roles.view"),
            t("roles.delete"),
          ]}
        />
      </div>
    </section>
  );
};

const PermissionCard = ({ title, items }: PermissionProps) => {
  return (
    <div className="permission-card">
      <h3>{title}</h3>

      {items?.map((item) => (
        <label key={item} className="permission-item">
          <span>{item}</span>
          <input type="checkbox" />
        </label>
      ))}
    </div>
  );
};

export default Roles;
