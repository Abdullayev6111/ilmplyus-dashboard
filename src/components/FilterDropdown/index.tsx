import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/api/api';
import { EMPTY_FILTER, GENDERS } from './Filterdropdown.constants';
import type {
  FilterState,
  StudentGender,
} from './Filterdropdown.constants';
import type { LidSource } from '@/types/lid.types';
import type { Course } from '@/types/course.types';
import { getLocalized } from '@/utils/getLocalized';
import './FilterDropdown.css';

function toggleItem<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function countActiveFilters(f: FilterState): number {
  let count = f.sources.length + f.genders.length + f.courses.length + f.levels.length;
  if (f.date) count++;
  return count;
}

interface CheckboxItemProps {
  id: string;
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}

const CheckboxItem = ({ id, label, checked, indeterminate, onChange }: CheckboxItemProps) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);

  return (
    <label htmlFor={id} className="fd-checkbox">
      <input
        ref={ref}
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        aria-checked={indeterminate ? 'mixed' : checked}
      />
      <span className="fd-checkbox__box" aria-hidden="true" />
      <span className="fd-checkbox__label">{label}</span>
    </label>
  );
};

interface DirectionSectionProps {
  course: Course;
  selectedMain: number[];
  selectedSub: number[];
  onMainToggle: (courseId: number) => void;
  onSubToggle: (levelId: number) => void;
  lang: string;
}

const DirectionSection = ({
  course,
  selectedMain,
  selectedSub,
  onMainToggle,
  onSubToggle,
  lang,
}: DirectionSectionProps) => {
  const { t } = useTranslation();
  const isMainChecked = selectedMain.includes(course.id);
  const activeSubs = (course.levels || []).filter((l) => selectedSub.includes(l.id));
  const isIndeterminate = !isMainChecked && activeSubs.length > 0;
  const [expanded, setExpanded] = useState(isMainChecked || activeSubs.length > 0);

  const handleToggleExpand = useCallback(() => setExpanded((v) => !v), []);
  const handleMainToggle = useCallback(() => onMainToggle(course.id), [onMainToggle, course.id]);

  const courseName = getLocalized(course, 'name', lang) || course.name;

  return (
    <div className="fd-direction-section">
      <div className="fd-direction-section__header">
        <CheckboxItem
          id={`dir-main-${course.id}`}
          label={courseName}
          checked={isMainChecked}
          indeterminate={isIndeterminate}
          onChange={handleMainToggle}
        />
        {(course.levels && course.levels.length > 0) && (
          <button
            type="button"
            className={`fd-expand-btn${expanded ? ' fd-expand-btn--open' : ''}`}
            onClick={handleToggleExpand}
            aria-expanded={expanded}
            aria-label={expanded ? t('filterDropdown.closeSubDirections', { name: courseName }) : t('filterDropdown.openSubDirections', { name: courseName })}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      {expanded && course.levels && course.levels.length > 0 && (
        <div
          className="fd-direction-section__subs"
          role="group"
          aria-label={t('filterDropdown.subDirections', { name: courseName })}
        >
          {course.levels.map((level) => {
            const levelName = getLocalized(level, 'name', lang) || level.name;
            return (
              <CheckboxItem
                key={level.id}
                id={`dir-sub-${course.id}-${level.id}`}
                label={levelName}
                checked={selectedSub.includes(level.id)}
                onChange={() => onSubToggle(level.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

interface FilterDropdownProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  trigger?: React.ReactNode;
  align?: 'left' | 'right';
}

const FilterDropdown = ({ filters, onChange, trigger, align = 'right' }: FilterDropdownProps) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCount = countActiveFilters(filters);

  // Fetch Sources
  const { data: sources = [] } = useQuery<LidSource[]>({
    queryKey: ['sources'],
    queryFn: () => API.get('/sources').then((res) => Array.isArray(res.data) ? res.data : res.data?.data || []),
  });

  // Fetch Courses
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => API.get('/courses').then((res) => Array.isArray(res.data) ? res.data : res.data?.data || []),
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleToggle = useCallback(() => setOpen((v) => !v), []);

  const handleSourceToggle = useCallback(
    (srcId: number) => {
      onChange({ ...filters, sources: toggleItem(filters.sources, srcId) });
    },
    [filters, onChange],
  );

  const handleGenderToggle = useCallback(
    (g: StudentGender) => {
      onChange({ ...filters, genders: toggleItem(filters.genders, g) });
    },
    [filters, onChange],
  );

  const handleMainToggle = useCallback(
    (courseId: number) => {
      const newMain = toggleItem(filters.courses, courseId);
      const courseNode = courses.find((d) => d.id === courseId);
      let newSub = filters.levels;
      if (courseNode && courseNode.levels) {
        if (newMain.includes(courseId)) {
          // If checking main, optionally check all subs? No, just keep subs as they are, main check acts as parent
        } else {
          // Unchecking main, uncheck all subs
          const courseLevelIds = courseNode.levels.map((l) => l.id);
          newSub = filters.levels.filter((s) => !courseLevelIds.includes(s));
        }
      }
      onChange({ ...filters, courses: newMain, levels: newSub });
    },
    [filters, courses, onChange],
  );

  const handleSubToggle = useCallback(
    (levelId: number) => {
      onChange({
        ...filters,
        levels: toggleItem(filters.levels, levelId),
      });
    },
    [filters, onChange],
  );

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...filters, [name]: value });
  }, [filters, onChange]);

  const handleReset = useCallback(() => onChange(EMPTY_FILTER), [onChange]);

  return (
    <div className="fd-container" ref={containerRef}>
      {trigger ? (
        <div onClick={handleToggle} aria-haspopup="true" aria-expanded={open} style={{ display: 'inline-flex', cursor: 'pointer' }}>
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          className={`fd-trigger${open ? ' fd-trigger--active' : ''}`}
          onClick={handleToggle}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls="filter-dropdown-panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2 4h12M4 8h8M6 12h4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {t('filterDropdown.sort')}
          {activeCount > 0 && (
            <span className="fd-badge" aria-label={t('filterDropdown.activeFiltersBadge', { count: activeCount })}>
              {activeCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          id="filter-dropdown-panel"
          className={`fd-panel ${align === 'left' ? 'fd-panel--left' : 'fd-panel--right'}`}
          role="menu"
          aria-label={t('filterDropdown.filterPanel')}
        >
          {/* Manba */}
          <section className="fd-section" aria-labelledby="fd-source-heading">
            <h3 className="fd-section__title" id="fd-source-heading">
              {t('filterDropdown.source')}
            </h3>
            <div className="fd-section__body" role="group" aria-labelledby="fd-source-heading">
              {sources.map((src) => {
                const srcName = getLocalized(src, 'name', lang) || src.name;
                return (
                  <CheckboxItem
                    key={src.id}
                    id={`src-${src.id}`}
                    label={srcName}
                    checked={filters.sources.includes(src.id)}
                    onChange={() => handleSourceToggle(src.id)}
                  />
                );
              })}
            </div>
          </section>

          <div className="fd-divider" role="separator" />

          {/* Jinsi */}
          <section className="fd-section" aria-labelledby="fd-gender-heading">
            <h3 className="fd-section__title" id="fd-gender-heading">
              {t('filterDropdown.gender')}
            </h3>
            <div className="fd-section__body" role="group" aria-labelledby="fd-gender-heading">
              {GENDERS.map((g) => (
                <CheckboxItem
                  key={g}
                  id={`gender-${g}`}
                  label={g === 'Erkak' ? t('registrationModal.gender.male') : t('registrationModal.gender.female')}
                  checked={filters.genders.includes(g)}
                  onChange={() => handleGenderToggle(g)}
                />
              ))}
            </div>
          </section>

          <div className="fd-divider" role="separator" />

          {/* Yo'nalish */}
          <section className="fd-section" aria-labelledby="fd-direction-heading">
            <h3 className="fd-section__title" id="fd-direction-heading">
              {t('filterDropdown.direction')}
            </h3>
            <div className="fd-section__body">
              {courses.map((course) => (
                <DirectionSection
                  key={course.id}
                  course={course}
                  selectedMain={filters.courses}
                  selectedSub={filters.levels}
                  onMainToggle={handleMainToggle}
                  onSubToggle={handleSubToggle}
                  lang={lang}
                />
              ))}
            </div>
          </section>

          <div className="fd-divider" role="separator" />

          {/* Sana */}
          <section className="fd-section" aria-labelledby="fd-date-heading">
            <h3 className="fd-section__title" id="fd-date-heading">
              {t('dashboard.date')}
            </h3>
            <div className="fd-section__body">
              <input
                type="date"
                className="fd-date-input"
                name="date"
                value={filters.date}
                onChange={handleDateChange}
                aria-label={t('dashboard.date')}
              />
            </div>
          </section>

          {activeCount > 0 && (
            <>
              <div className="fd-divider" role="separator" />
              <div className="fd-footer">
                <button type="button" className="fd-reset-btn" onClick={handleReset}>
                  {t('filterDropdown.clear')}
                </button>
                <span className="fd-footer__count">{t('filterDropdown.activeFilters', { count: activeCount })}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
