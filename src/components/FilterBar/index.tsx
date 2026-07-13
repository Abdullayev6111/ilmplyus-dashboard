import { useTranslation } from 'react-i18next';
import DateInput, { type DateInputChangeEvent } from '@/components/DateInput';
import { countFilterBarValues, type FilterBarValues } from './filterBar.utils';
import './FilterBar.css';

export interface FilterBarOption {
  value: string | number;
  label: string;
}

export interface FilterBarField<K extends string = string> {
  /** Filter obyektidagi kalit. */
  key: K;
  label: string;
  type?: 'select' | 'date';
  /** Select uchun bo'sh qiymat matni ("Filial tanlang"). */
  placeholder?: string;
  options?: FilterBarOption[];
  disabled?: boolean;
  /** Kaskad maydonlar: masalan kurs tanlanmaguncha daraja ko'rinmasin. */
  hidden?: boolean;
}

interface FilterBarProps<K extends string> {
  fields: FilterBarField<K>[];
  values: FilterBarValues<K>;
  onChange: (values: FilterBarValues<K>) => void;
  onReset: () => void;
  onClose?: () => void;
  ariaLabel?: string;
}

/**
 * Sahifalar bo'ylab bir xil ko'rinadigan saralash qatori — jadval kartasining
 * sarlavha qismiga qo'yiladi. Maydonlar ro'yxatini va filtrlash mantiqini
 * sahifaning o'zi beradi, bu komponent faqat ko'rinish uchun javob beradi.
 */
export default function FilterBar<K extends string>({
  fields,
  values,
  onChange,
  onReset,
  onClose,
  ariaLabel,
}: FilterBarProps<K>) {
  const { t } = useTranslation();
  const activeCount = countFilterBarValues(values);

  const setValue = (key: K, value: string) => onChange({ ...values, [key]: value });

  return (
    <div className="fb-bar" role="group" aria-label={ariaLabel ?? t('filterDropdown.sort')}>
      {fields
        .filter((f) => !f.hidden)
        .map((field) => {
          const id = `fb-${field.key}`;
          return (
            <div className="fb-field" key={field.key}>
              <label className="fb-label" htmlFor={id}>
                {field.label}
              </label>

              {field.type === 'date' ? (
                <DateInput
                  id={id}
                  name={field.key}
                  value={values[field.key] ?? ''}
                  onChange={(e: DateInputChangeEvent) => setValue(field.key, e.target.value)}
                  aria-label={field.label}
                />
              ) : (
                <select
                  id={id}
                  className="fb-select"
                  value={values[field.key] ?? ''}
                  disabled={field.disabled}
                  onChange={(e) => setValue(field.key, e.target.value)}
                >
                  <option value="">{field.placeholder ?? field.label}</option>
                  {(field.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}

      <button
        type="button"
        className="fb-reset-btn"
        onClick={onReset}
        disabled={activeCount === 0}
      >
        {t('filterDropdown.clear')}
      </button>

      {onClose && (
        <button
          type="button"
          className="fb-close-btn"
          onClick={onClose}
          aria-label={t('payments.filter.close')}
        >
          ×
        </button>
      )}
    </div>
  );
}
