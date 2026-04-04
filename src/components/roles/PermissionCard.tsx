import { MultiSelect } from "@mantine/core";
import { useTranslation } from "react-i18next";
import "../../pages/roles/roles.css";
import type { PermissionItem } from "../../types/common.types";

interface PermissionCardProps {
  moduleName: string;
  availableActions: PermissionItem[];
  selectedActions: PermissionItem[];
  onChange: (selected: PermissionItem[]) => void;
}

const PermissionCard = ({
  moduleName,
  availableActions,
  selectedActions,
  onChange,
}: PermissionCardProps) => {
  const { t } = useTranslation();

  const data = availableActions.map((a) => ({
    value: String(a.id),
    label: a.action,
  }));
  const value = selectedActions.map((a) => String(a.id));

  const handleChange = (newValues: string[]) => {
    const selected = availableActions.filter((a) =>
      newValues.includes(String(a.id))
    );
    onChange(selected);
  };

  return (
    <div className="permission-card">
      <h3 className="permission-card-title">
        {t(`modules.${moduleName}`, moduleName)}
      </h3>

      <MultiSelect
        data={data}
        value={value}
        onChange={handleChange}
        placeholder={t("roles.selectPermissions", "Select permissions")}
        clearable
        searchable
        hidePickedOptions
      />
    </div>
  );
};

export default PermissionCard;
