import { useTranslation } from 'react-i18next';
import './FilterButton.css';

interface FilterButtonProps {
  onClick: () => void;
  /** Filter paneli ochiq yoki filtr qo'yilgan — tugma to'q sariq bo'lib turadi. */
  active?: boolean;
  /** Faol filtrlar soni; 0 bo'lsa badge chiqmaydi. */
  count?: number;
  /** Standart matn — "Saralash". */
  label?: string;
  expanded?: boolean;
}

/** Sahifalar bo'ylab bir xil "Saralash" tugmasi: `fa-sliders` ikonka, to'q sariq hover. */
export default function FilterButton({
  onClick,
  active = false,
  count = 0,
  label,
  expanded,
}: FilterButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={`filter-trigger-btn${active ? ' filter-trigger-btn--active' : ''}`}
      onClick={onClick}
      aria-expanded={expanded ?? active}
    >
      <i className="fa-solid fa-sliders filter-trigger-btn__icon" aria-hidden="true" />
      {label ?? t('filterDropdown.sort')}
      {count > 0 && <span className="filter-trigger-btn__badge">{count}</span>}
    </button>
  );
}
