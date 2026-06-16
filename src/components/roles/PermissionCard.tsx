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

  const handleToggle = (action: PermissionItem, checked: boolean) => {
    if (checked) {
      onChange([...selectedActions, action]);
    } else {
      onChange(selectedActions.filter((a) => a.id !== action.id));
    }
  };

  return (
    <div className="permission-card">
      <h3 className="permission-card-title">
        {t(`modules.${moduleName}`, moduleName)}
      </h3>
      <div className="permission-checkboxes">
        {availableActions.map((action) => {
          const isChecked = selectedActions.some((a) => a.id === action.id);
          return (
            <label key={action.id} className="permission-checkbox-label">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => handleToggle(action, e.target.checked)}
              />
              {t(`roles.permissionActions.${action.action}`, action.action)}
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionCard;
