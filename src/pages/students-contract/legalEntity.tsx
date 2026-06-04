import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  type OrganizationFormData,
  emptyOrganization,
  type OrganizationStudentFormData,
  emptyOrganizationStudent,
} from '../../types/studentContract.types';
import type { Lid } from '@/types/lid.types';
import type { Course } from '@/types/course.types';
import type { Level } from '@/types/level.types';
import type { Group } from '../../types/groups.types';
import type { Branch } from '@/types/users.types';
import './studentsContracts.css';
import { API } from '@/api/api';

const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ToggleButton = ({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}) => (
  <div
    style={{
      display: 'flex',
      background: '#fff',
      border: '1px solid #cbd5e1',
      borderRadius: '10px',
      padding: '2px',
      width: 'fit-content',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}
  >
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        style={{
          padding: '8px 24px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          background: value === opt.value ? '#003366' : 'transparent',
          color: value === opt.value ? '#fff' : '#64748b',
        }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const OrganizationStudentCard = ({
  student,
  index,
  onChange,
  onRemove,
  showRemove,
  allLids,
  allGroups,
  allCourses,
}: {
  student: OrganizationStudentFormData;
  index: number;
  onChange: (
    index: number,
    field: keyof OrganizationStudentFormData,
    value: string | boolean,
  ) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
  allLids: Lid[];
  allGroups: Group[];
  allCourses: Course[];
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLids = allLids.filter((lid) => {
    const term = searchTerm.toLowerCase();
    return (
      String(lid.id).includes(term) ||
      (lid.first_name || '').toLowerCase().includes(term) ||
      (lid.last_name || '').toLowerCase().includes(term) ||
      (lid.phone || '').includes(term)
    );
  });

  const handleLidSelect = (lid: Lid) => {
    onChange(index, 'lid_id', String(lid.id));
    onChange(index, 'first_name', lid.first_name || student.first_name);
    onChange(index, 'last_name', lid.last_name || student.last_name);
    onChange(index, 'father_name', lid.father_name || student.father_name);
    onChange(index, 'birth_date', lid.birth_date || student.birth_date);
    onChange(index, 'phone', lid.phone ? lid.phone.replace('+', '') : student.phone);
    onChange(index, 'course_id', lid.course_id ? String(lid.course_id) : student.course_id);
    onChange(index, 'group_id', lid.group_id ? String(lid.group_id) : student.group_id);
    const addressStr = [
      lid.region?.name_uz || lid.region?.name_uz,
      lid.district?.name_uz || lid.district?.name_uz,
    ]
      .filter(Boolean)
      .join(', ');

    onChange(index, 'level_id', lid.level_id ? String(lid.level_id) : student.level_id);
    onChange(index, 'residential_address', addressStr || student.residential_address);
    onChange(index, 'registered_address', addressStr || student.registered_address);
    onChange(
      index,
      'monthly_price',
      lid.course_price?.new_price
        ? String(lid.course_price.new_price)
        : student.monthly_price || '',
    );

    setShowDropdown(false);
    setSearchTerm('');
  };

  return (
    <div
      className="sc-form-card"
      style={{
        background: '#fff',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        marginBottom: '20px',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '18px', color: '#003366' }}>O'quvchi #{index + 1}</h3>
        {showRemove && (
          <button
            onClick={() => onRemove(index)}
            style={{
              background: '#fff5f5',
              color: '#e53e3e',
              border: '1px solid #feb2b2',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <i className="fa-solid fa-trash-can" style={{ marginRight: '6px' }}></i> O'chirish
          </button>
        )}
      </div>

      <div className="sc-form-row">
        <div className="sc-form-col" style={{ flex: 1, marginBottom: '10px' }}>
          <label className="sc-form-label">
            Ushbu shaxs <span>*</span>
          </label>
          <ToggleButton
            options={[
              { label: 'Voyaga yetgan shaxs', value: 'false' },
              { label: 'Voyaga yetmagan shaxs', value: 'true' },
            ]}
            value={String(student.is_minor)}
            onChange={(val) => onChange(index, 'is_minor', val === 'true')}
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: 'flex', gap: '18px' }}>
        <div className="sc-form-col" style={{ position: 'relative', flex: 1 }} ref={dropdownRef}>
          <label className="sc-form-label">
            Lid ID / Qidirish <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            placeholder="Lid ID yoki ism..."
            value={student.lid_id || searchTerm}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
              if (!e.target.value) onChange(index, 'lid_id', '');
            }}
          />
          {showDropdown && (
            <div
              className="sc-lid-dropdown"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                maxHeight: '250px',
                overflowY: 'auto',
                marginTop: '4px',
              }}
            >
              {filteredLids.length > 0 ? (
                filteredLids.map((lid) => (
                  <div
                    key={lid.id}
                    className="sc-lid-option"
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                    onClick={() => handleLidSelect(lid)}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      ID: {lid.id} - {lid.first_name} {lid.last_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {lid.phone} | {lid.course?.name_uz || "Kurs yo'q"}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#64748b',
                  }}
                >
                  Natija topilmadi
                </div>
              )}
            </div>
          )}
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            JSHSHIR <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            placeholder="00000000000000"
            maxLength={14}
            value={student.jshshir}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val.length <= 14) onChange(index, 'jshshir', val);
            }}
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: 'flex', gap: '18px' }}>
        {student.is_minor ? (
          <>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Tug'ilganlik haqida guvohnoma seriyasi va raqami <span>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="sc-passport-series"
                  style={{
                    width: '80px',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    textTransform: 'uppercase',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    background: '#f8faff',
                  }}
                  placeholder="AA"
                  maxLength={4}
                  value={student.birth_cert_series}
                  onChange={(e) =>
                    onChange(index, 'birth_cert_series', e.target.value.toUpperCase())
                  }
                />
                <input
                  type="text"
                  className="sc-passport-number"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    background: '#f8faff',
                  }}
                  placeholder="Raqam"
                  maxLength={7}
                  value={student.birth_cert_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 7) onChange(index, 'birth_cert_number', val);
                  }}
                />
              </div>
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Berilgan sanasi <span>*</span>
              </label>
              <input
                type="date"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                value={student.birth_cert_given_date}
                onChange={(e) => onChange(index, 'birth_cert_given_date', e.target.value)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Tug'ilgan joyi <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                placeholder="Kiriting"
                value={student.birth_place}
                onChange={(e) => onChange(index, 'birth_place', e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Passport seriyasi va raqami <span>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="sc-passport-series"
                  style={{
                    width: '80px',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    textTransform: 'uppercase',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    background: '#f8faff',
                  }}
                  placeholder="AA"
                  maxLength={2}
                  value={student.passport_series}
                  onChange={(e) => onChange(index, 'passport_series', e.target.value.toUpperCase())}
                />
                <input
                  type="text"
                  className="sc-passport-number"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    background: '#f8faff',
                  }}
                  placeholder="Raqam"
                  maxLength={7}
                  value={student.passport_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 7) onChange(index, 'passport_number', val);
                  }}
                />
              </div>
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Berilgan sanasi <span>*</span>
              </label>
              <input
                type="date"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                value={student.passport_given_date}
                onChange={(e) => onChange(index, 'passport_given_date', e.target.value)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Amal qilish muddati <span>*</span>
              </label>
              <input
                type="date"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                value={student.passport_expiry_date}
                onChange={(e) => onChange(index, 'passport_expiry_date', e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className="sc-form-row" style={{ display: 'flex', gap: '18px' }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            Familiya <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            placeholder="Kiriting"
            value={student.last_name}
            onChange={(e) => onChange(index, 'last_name', e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            Ism <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            placeholder="Kiriting"
            value={student.first_name}
            onChange={(e) => onChange(index, 'first_name', e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            Otasining ismi <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            placeholder="Kiriting"
            value={student.father_name}
            onChange={(e) => onChange(index, 'father_name', e.target.value)}
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: 'flex', gap: '18px' }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            Tug'ilgan sanasi <span>*</span>
          </label>
          <input
            type="date"
            className="sc-form-input"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            value={student.birth_date}
            onChange={(e) => onChange(index, 'birth_date', e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            Kurs <span>*</span>
          </label>
          <select
            className="sc-form-select"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            value={student.course_id}
            onChange={(e) => {
              onChange(index, 'course_id', e.target.value);
              onChange(index, 'level_id', '');
            }}
          >
            <option value="">Tanlang</option>
            {(allCourses || []).map((c: Course) => (
              <option key={c.id} value={c.id}>
                {c.name_uz}
              </option>
            ))}
          </select>
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            Bosqichi <span>*</span>
          </label>
          <select
            className="sc-form-select"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            value={student.level_id}
            onChange={(e) => onChange(index, 'level_id', e.target.value)}
          >
            <option value="">Tanlang</option>
            {(
              (allCourses || []).find((c: Course) => String(c.id) === student.course_id)?.levels ||
              []
            ).map((l: Level) => (
              <option key={l.id} value={l.id}>
                {l.name_uz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="sc-form-row" style={{ display: 'flex', gap: '18px' }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">Oylik to'lov</label>
          <input
            type="number"
            className="sc-form-input"
            placeholder="500000"
            value={student.monthly_price}
            onChange={(e) => onChange(index, 'monthly_price', e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">Umumiy narx</label>
          <input
            type="number"
            className="sc-form-input"
            placeholder="3000000"
            value={student.total_price}
            onChange={(e) => onChange(index, 'total_price', e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            Guruh <span>*</span>
          </label>
          <select
            className="sc-form-select"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            value={student.group_id}
            onChange={(e) => onChange(index, 'group_id', e.target.value)}
          >
            <option value="">Tanlang</option>
            {(allGroups || []).map((g: Group) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="sc-form-row" style={{ display: 'flex', gap: '18px' }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            Telefon nomer <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            value={student.phone}
            onChange={(e) => onChange(index, 'phone', e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">Kurs boshlanish sanasi</label>
          <input
            type="date"
            className="sc-form-input"
            value={student.course_start_date}
            onChange={(e) => onChange(index, 'course_start_date', e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">Kurs tugash sanasi</label>
          <input
            type="date"
            className="sc-form-input"
            value={student.course_end_date}
            onChange={(e) => onChange(index, 'course_end_date', e.target.value)}
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: 'flex', gap: '18px' }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            Yashash joyi <span>*</span>
          </label>
          <textarea
            className="sc-form-textarea"
            style={{
              minHeight: '80px',
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              background: '#f8faff',
            }}
            placeholder="Kiriting"
            value={student.residential_address}
            onChange={(e) => onChange(index, 'residential_address', e.target.value)}
          />
        </div>
        {!student.is_minor && (
          <div className="sc-form-col" style={{ flex: 1 }}>
            <label className="sc-form-label">
              Yashash joyi (Ro'yhatga olingan manzili) <span>*</span>
            </label>
            <textarea
              className="sc-form-textarea"
              style={{
                minHeight: '80px',
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                background: '#f8faff',
              }}
              placeholder="Kiriting"
              value={student.registered_address}
              onChange={(e) => onChange(index, 'registered_address', e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const LegalEntity = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const [step, setStep] = useState(1);
  const [organization, setOrganization] = useState<OrganizationFormData>({
    ...emptyOrganization,
  });
  const [students, setStudents] = useState<OrganizationStudentFormData[]>([
    { ...emptyOrganizationStudent },
  ]);

  const { data: contractToEdit, isLoading: isFetchingContract } = useQuery({
    queryKey: ['student-contract', id],
    queryFn: () => API.get(`/student-contracts/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (contractToEdit && id) {
      const contract = contractToEdit.contract || contractToEdit.data || contractToEdit;
      if (contract.organization) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrganization({
          inn: contract.organization.stir || '',
          language: contract.language || 'uz',
          branch_id: String(contract.branch_id || ''),
          city: contract.branch?.city || '',
          contract_date: formatDateForInput(contract.contract_date),
          has_trustee: contract.organization.has_trustee || 'Ishonchnomasiz',
          trustee_date: formatDateForInput(contract.organization.trustee_date),
          trustee_number: contract.organization.trustee_number || '',
          organization_name: contract.organization.organization_name || '',
          organization_branch: contract.organization.organization_branch || "yo'q",
          branch_name: contract.organization.branch_name || '',
          branch_address: contract.organization.branch_address || '',
          director_last_name: contract.organization.director_last_name || '',
          director_first_name: contract.organization.director_first_name || '',
          director_father_name: contract.organization.director_father_name || '',
          contract_start_date: formatDateForInput(contract.organization.contract_start_date),
          contract_end_date: formatDateForInput(contract.organization.contract_end_date),
          phones: [contract.organization.phone || '+998'],
          ifut: contract.organization.ifut || '',
          account_number: contract.organization.bank_account || '',
          bank_name: contract.organization.bank_name || '',
          mfo: contract.organization.mfo || '',
        });
      }

      if (contract.contract_students && contract.contract_students.length > 0) {
        setStudents(
          contract.contract_students.map((s: any) => ({
            lid_id: String(s.lid_id),
            first_name: s.first_name || '',
            last_name: s.last_name || '',
            father_name: s.father_name || '',
            birth_date: formatDateForInput(s.birth_date),
            birth_cert_series: s.birth_cert_series || '',
            birth_cert_number: s.birth_cert_number || '',
            birth_cert_given_date: formatDateForInput(s.birth_cert_given_date),
            birth_cert_expiry_date: formatDateForInput(s.birth_cert_expiry_date),
            birth_place: s.birth_place || '',
            phone: s.phone ? s.phone.replace('+', '') : '998',
            course_id: String(s.course_id || ''),
            level_id: String(s.level_id || ''),
            group_id: String(s.group_id || ''),
            residential_address: s.residential_address || '',
            jshshir: s.jshshir || '',
            language: contract.language || 'uz',
            citizenship: s.citizenship || 'citizen',
            is_minor: !!s.is_minor,
            passport_series: s.passport_series || '',
            passport_number: s.passport_number || '',
            passport_given_date: formatDateForInput(s.passport_given_date),
            passport_expiry_date: formatDateForInput(s.passport_expiry_date),
            registered_address: s.registered_address || '',
          })) as OrganizationStudentFormData[],
        );
      }
    }
  }, [contractToEdit, id]);

  const { data: allLids } = useQuery({
    queryKey: ['lids-all'],
    queryFn: () =>
      API.get('/lids', { params: { per_page: 1000 } }).then((res) =>
        Array.isArray(res.data) ? res.data : res.data?.data || [],
      ),
  });

  const { data: allGroups } = useQuery({
    queryKey: ['groups-all'],
    queryFn: () =>
      API.get('/groups', { params: { per_page: 1000 } }).then((res) =>
        Array.isArray(res.data) ? res.data : res.data?.data || [],
      ),
  });

  const { data: allCourses } = useQuery({
    queryKey: ['courses-all'],
    queryFn: () =>
      API.get('/courses', { params: { per_page: 1000 } }).then((res) =>
        Array.isArray(res.data) ? res.data : res.data?.data || [],
      ),
  });

  const { mutate: fetchBranches, data: branchesData } = useMutation({
    mutationFn: () =>
      API.get('/branches').then((res) =>
        Array.isArray(res.data) ? res.data : res.data?.data || [],
      ),
  });

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const branches = Array.isArray(branchesData) ? branchesData : [];

  const handleOrgChange = (field: keyof OrganizationFormData, value: string) => {
    let finalValue = value;
    if (
      field === 'inn' ||
      field === 'mfo' ||
      field === 'account_number' ||
      field === 'trustee_number' ||
      field === 'ifut'
    ) {
      finalValue = value.replace(/\D/g, '');
    }
    setOrganization((prev) => ({ ...prev, [field]: finalValue }));
  };

  const handlePhoneChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    let finalValue = '';
    if (!digits.startsWith('998')) finalValue = '+998' + digits;
    else finalValue = '+' + digits;
    if (finalValue.length < 4) finalValue = '+998';
    if (finalValue.length > 13) return;

    const newPhones = [...organization.phones];
    newPhones[index] = finalValue;
    setOrganization((prev) => ({ ...prev, phones: newPhones }));
  };

  const addPhone = () => {
    setOrganization((prev) => ({ ...prev, phones: [...prev.phones, '+998'] }));
  };

  const removePhone = (index: number) => {
    if (organization.phones.length > 1) {
      const newPhones = organization.phones.filter((_, i) => i !== index);
      setOrganization((prev) => ({ ...prev, phones: newPhones }));
    }
  };

  const handleStudentChange = (
    index: number,
    field: keyof OrganizationStudentFormData,
    value: string | boolean,
  ) => {
    let finalValue = value;
    if (field === 'phone' && typeof value === 'string') {
      const digits = value.replace(/\D/g, '');
      if (!digits.startsWith('998')) finalValue = '+998' + digits;
      else finalValue = '+' + digits;
      if (finalValue.length < 4) finalValue = '+998';
      if (finalValue.length > 13) return;
    }
    setStudents((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        let updated = { ...s, [field]: finalValue };

        // Auto-fill dates when group is selected
        if (field === 'group_id' && value && allGroups) {
          const group = allGroups.find((g: Group) => String(g.id) === value);
          if (group) {
            updated.course_start_date = formatDateForInput(group.start_date);
            updated.course_end_date = formatDateForInput(group.end_date);
          }
        }

        // Auto-calculate total price
        if (
          (field === 'monthly_price' ||
            field === 'group_id' ||
            field === 'course_start_date' ||
            field === 'course_end_date') &&
          updated.monthly_price &&
          updated.course_start_date &&
          updated.course_end_date
        ) {
          const start = new Date(updated.course_start_date);
          const end = new Date(updated.course_end_date);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const months =
              (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            updated.total_price = String(Number(updated.monthly_price) * Math.max(months, 1));
          }
        }

        return updated;
      }),
    );
  };

  const addStudent = () => setStudents((prev) => [...prev, { ...emptyOrganizationStudent }]);
  const removeStudent = (index: number) => {
    if (students.length > 1) setStudents((prev) => prev.filter((_, i) => i !== index));
  };

  const isStep1Valid = () => {
    const o = organization;
    return (
      o.inn &&
      o.organization_name &&
      o.phones[0].length > 4 &&
      o.account_number &&
      o.bank_name &&
      o.mfo &&
      o.director_first_name &&
      o.director_last_name
    );
  };

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => API.post('/student-contracts', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-contracts'] });
      notifications.show({
        title: 'Muvaffaqiyatli',
        message: 'Shartnoma yaratildi',
        color: 'green',
      });
      navigate('/students-contract');
    },
    onError: () =>
      notifications.show({
        title: 'Xatolik',
        message: 'Shartnoma yaratishda xatolik yuz berdi',
        color: 'red',
      }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => API.put(`/student-contracts/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-contracts'] });
      notifications.show({
        title: 'Muvaffaqiyatli',
        message: 'Shartnoma yangilandi',
        color: 'green',
      });
      navigate('/students-contract');
    },
    onError: () =>
      notifications.show({
        title: 'Xatolik',
        message: 'Shartnomani yangilashda xatolik yuz berdi',
        color: 'red',
      }),
  });

  const handleSubmit = () => {
    const payload = {
      contract_type: 'legal',
      organization: { ...organization, phone: organization.phones[0] }, // Fallback to first phone if API only supports one
      students: students.map((s, idx) => {
        const studentPayload: Record<string, unknown> = {
          ...s,
          lid_id: Number(s.lid_id),
          course_id: Number(s.course_id),
          level_id: Number(s.level_id),
          group_id: Number(s.group_id),
          monthly_price: Number(s.monthly_price) || 0,
          total_price: Number(s.total_price) || 0,
          course_start_date: s.course_start_date,
          course_end_date: s.course_end_date,
        };
        if (id && contractToEdit) {
          const contract = contractToEdit.contract || contractToEdit.data || contractToEdit;
          const existingStudent = contract.contract_students?.[idx];
          if (existingStudent?.id) studentPayload.id = existingStudent.id;
        }
        return studentPayload;
      }),
    };
    if (id) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (id && isFetchingContract) {
    return (
      <div className="students-contract container" style={{ marginTop: 50, marginLeft: 140 }}>
        <div style={{ textAlign: 'center', padding: 40 }}>Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="students-contract container" style={{ marginTop: 50, marginLeft: 140 }}>
      <div
        className="sc-page-top"
        style={{
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            background: '#FFEFDB',
            color: '#FE9100',
            padding: '10px 24px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          <i className="fa-solid fa-user"></i>
        </div>
        <span
          style={{
            textTransform: 'uppercase',
            fontFamily: 'noto-sb',
            fontSize: '16px',
            color: '#000',
          }}
        >
          TASHKILOT BILAN SHARTNOMA
        </span>
      </div>

      <div
        className="sc-step-bar"
        style={{
          display: 'flex',
          background: '#003366',
          borderRadius: '40px',
          margin: '16px 0',
          overflow: 'hidden',
        }}
      >
        <div
          className={`sc-step-item ${step === 1 ? 'active' : ''}`}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '14px',
            cursor: 'pointer',
            background: '#003366',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            textTransform: 'uppercase',
            borderRight: '1px solid rgba(255,255,255,0.1)',
          }}
          onClick={() => setStep(1)}
        >
          1-Qadam: Tashkilot
        </div>
        <div
          className={`sc-step-item ${step === 2 ? 'active' : ''}`}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '14px',
            cursor: 'pointer',
            background: step === 2 ? '#003366' : '#5d7ca4',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            textTransform: 'uppercase',
          }}
          onClick={() => {
            if (isStep1Valid()) setStep(2);
            else
              notifications.show({
                title: 'Xatolik',
                message: "Iltimos, tashkilot ma'lumotlarini to'liq to'ldiring!",
                color: 'red',
              });
          }}
        >
          2-Qadam: Oquvchi
        </div>
      </div>

      {step === 1 && (
        <div
          className="sc-form-card"
          style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            marginBottom: '20px',
          }}
        >
          <div className="sc-form-row" style={{ display: 'flex', gap: '18px' }}>
            <div className="sc-form-col" style={{ flex: 2 }}>
              <label className="sc-form-label">
                Tashkilot STIR raqami <span>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="sc-form-input"
                  style={{
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    paddingRight: '140px',
                  }}
                  placeholder="00000000000000"
                  value={organization.inn}
                  onChange={(e) => handleOrgChange('inn', e.target.value)}
                />
                <a
                  href="https://fo.birdarcha.uz/pub/search"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#003366',
                    fontSize: '14px',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  resstordan tekshirish
                  <i
                    className="fa-solid fa-arrow-up-right-from-square"
                    style={{ fontSize: '12px' }}
                  ></i>
                </a>
              </div>
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Shartnoma tili <span>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  className="sc-form-select"
                  style={{
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    appearance: 'none',
                  }}
                  value={organization.language}
                  onChange={(e) => handleOrgChange('language', e.target.value)}
                >
                  <option value="uz">UZ</option>
                  <option value="ru">RU</option>
                  <option value="en">EN</option>
                </select>
                <i
                  className="fa-solid fa-caret-down"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#003366',
                    pointerEvents: 'none',
                  }}
                ></i>
              </div>
            </div>
          </div>

          <div className="sc-form-row" style={{ display: 'flex', gap: '18px', marginTop: '18px' }}>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Filial <span>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  className="sc-form-select"
                  style={{
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    appearance: 'none',
                  }}
                  value={organization.branch_id}
                  onChange={(e) => {
                    const branchId = e.target.value;
                    const selectedBranch = branches.find((b: Branch) => String(b.id) === branchId);
                    if (selectedBranch) {
                      setOrganization((prev) => ({
                        ...prev,
                        branch_id: branchId,
                        city: selectedBranch.city || '',
                      }));
                    } else {
                      handleOrgChange('branch_id', branchId);
                    }
                  }}
                >
                  <option value="">Tanlang</option>
                  {branches?.map((b: Branch) => (
                    <option key={b.id} value={b.id}>
                      {b.name_uz}
                    </option>
                  ))}
                </select>
                <i
                  className="fa-solid fa-caret-down"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#003366',
                    pointerEvents: 'none',
                  }}
                ></i>
              </div>
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">Shahar</label>
              <input
                type="text"
                className="sc-form-input"
                style={{ background: '#e2e8f0', border: 'none' }}
                placeholder="Avtomatik to'ladi"
                value={organization.city}
                readOnly
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Shartnoma sanasi <span>*</span>
              </label>
              <input
                type="date"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                value={organization.contract_date}
                onChange={(e) => handleOrgChange('contract_date', e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '20px 0',
            }}
          >
            <div
              style={{
                background: '#FFEFDB',
                color: '#FE9100',
                padding: '8px',
                borderRadius: '8px',
              }}
            >
              <i className="fa-solid fa-building"></i>
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>
              Tashkilot ma'lumotlari
            </h3>
          </div>

          <div className="sc-form-row" style={{ display: 'flex', gap: '18px' }}>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Ishonchnoma <span>*</span>
              </label>
              <ToggleButton
                options={[
                  { label: 'ishonchnomasiz', value: 'Ishonchnomasiz' },
                  { label: 'Ishonchnomali', value: 'Ishonchnoma bilan' },
                ]}
                value={organization.has_trustee}
                onChange={(val) => handleOrgChange('has_trustee', val)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Ishonchnoma sanasi <span>*</span>
              </label>
              <input
                type="date"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                value={organization.trustee_date}
                onChange={(e) => handleOrgChange('trustee_date', e.target.value)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Ishonchnoma raqami <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                placeholder="kiriting"
                value={organization.trustee_number}
                onChange={(e) => handleOrgChange('trustee_number', e.target.value)}
              />
            </div>
          </div>

          <div className="sc-form-row" style={{ display: 'flex', gap: '18px', marginTop: '18px' }}>
            <div className="sc-form-col" style={{ flex: 2 }}>
              <label className="sc-form-label">
                Tashkilot nomi <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                placeholder="Kiriting"
                value={organization.organization_name}
                onChange={(e) => handleOrgChange('organization_name', e.target.value)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Tashkilot filiali <span>*</span>
              </label>
              <ToggleButton
                options={[
                  { label: "yo'q", value: "yo'q" },
                  { label: 'bor', value: 'bor' },
                ]}
                value={organization.organization_branch}
                onChange={(val) => handleOrgChange('organization_branch', val)}
              />
            </div>
          </div>

          {organization.organization_branch === 'bor' && (
            <>
              <div className="sc-form-row" style={{ marginTop: '18px' }}>
                <div className="sc-form-col">
                  <label className="sc-form-label">
                    Filial nomi <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="sc-form-input"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    placeholder="Kiriting"
                    value={organization.branch_name}
                    onChange={(e) => handleOrgChange('branch_name', e.target.value)}
                  />
                </div>
              </div>

              <div className="sc-form-row" style={{ marginTop: '18px' }}>
                <div className="sc-form-col">
                  <label className="sc-form-label">
                    Filial manzili <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="sc-form-input"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    placeholder="Kiriting"
                    value={organization.branch_address}
                    onChange={(e) => handleOrgChange('branch_address', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="sc-form-row" style={{ display: 'flex', gap: '18px', marginTop: '18px' }}>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Rahbarning familiyasi <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                placeholder="Kiriting"
                value={organization.director_last_name}
                onChange={(e) => handleOrgChange('director_last_name', e.target.value)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Rahbarning ismi <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                placeholder="Kiriting"
                value={organization.director_first_name}
                onChange={(e) => handleOrgChange('director_first_name', e.target.value)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Rahbarning otasining ismi <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                placeholder="Kiriting"
                value={organization.director_father_name}
                onChange={(e) => handleOrgChange('director_father_name', e.target.value)}
              />
            </div>
          </div>

          <div className="sc-form-row" style={{ display: 'flex', gap: '18px', marginTop: '18px' }}>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Shartnoma boshlanish sanasi <span>*</span>
              </label>
              <input
                type="date"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                value={organization.contract_start_date}
                onChange={(e) => handleOrgChange('contract_start_date', e.target.value)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Shartnoma tugash sanasi <span>*</span>
              </label>
              <input
                type="date"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                value={organization.contract_end_date}
                onChange={(e) => handleOrgChange('contract_end_date', e.target.value)}
              />
            </div>
          </div>

          {organization.phones.map((phone, idx) => (
            <div
              key={idx}
              className="sc-form-row"
              style={{ display: 'flex', gap: '18px', marginTop: '18px' }}
            >
              <div className="sc-form-col" style={{ flex: 1 }}>
                <label className="sc-form-label">
                  Telefon nomer {idx + 1} <span>*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    className="sc-form-input"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    value={phone}
                    onChange={(e) => handlePhoneChange(idx, e.target.value)}
                  />
                  {idx === organization.phones.length - 1 ? (
                    <div
                      onClick={addPhone}
                      style={{
                        background: '#003366',
                        color: '#fff',
                        height: '42px',
                        width: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <i className="fa-solid fa-plus"></i>
                    </div>
                  ) : (
                    <div
                      onClick={() => removePhone(idx)}
                      style={{
                        background: '#fee2e2',
                        color: '#ef4444',
                        height: '42px',
                        width: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="sc-form-row" style={{ display: 'flex', gap: '18px', marginTop: '18px' }}>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                IFUT <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                placeholder="Kiriting"
                value={organization.ifut}
                onChange={(e) => handleOrgChange('ifut', e.target.value)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Xisob raqam <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                placeholder="Kiriting"
                value={organization.account_number}
                onChange={(e) => handleOrgChange('account_number', e.target.value)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                Bank nomi <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                placeholder="Kiriting"
                value={organization.bank_name}
                onChange={(e) => handleOrgChange('bank_name', e.target.value)}
              />
            </div>
          </div>

          <div className="sc-form-row" style={{ display: 'flex', gap: '18px', marginTop: '18px' }}>
            <div className="sc-form-col" style={{ flex: '0 0 32%' }}>
              <label className="sc-form-label">
                MFO <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                placeholder="Kiriting"
                value={organization.mfo}
                onChange={(e) => handleOrgChange('mfo', e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '30px',
            }}
          >
            <button
              className="sc-form-cancel-btn"
              style={{
                padding: '12px 32px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                background: '#fff',
                color: '#64748b',
                cursor: 'pointer',
                fontFamily: 'noto-m',
              }}
              onClick={() => navigate('/students-contract')}
            >
              Bekor qilish
            </button>
            <button
              className="sc-form-next-btn"
              style={{
                padding: '12px 32px',
                borderRadius: '10px',
                border: 'none',
                background: '#FE9100',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(254, 145, 0, 0.2)',
              }}
              onClick={() => {
                if (isStep1Valid()) setStep(2);
                else
                  notifications.show({
                    title: 'Xatolik',
                    message: "Iltimos, tashkilot ma'lumotlarini to'liq to'ldiring!",
                    color: 'red',
                  });
              }}
            >
              Keyingisi
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          {students.map((s, idx) => (
            <OrganizationStudentCard
              key={idx}
              index={idx}
              student={s}
              onChange={handleStudentChange}
              onRemove={removeStudent}
              showRemove={students.length > 1}
              allLids={allLids || []}
              allGroups={allGroups || []}
              allCourses={allCourses || []}
            />
          ))}
          <button
            style={{
              width: '100%',
              padding: '14px',
              border: '2px dashed #FE9100',
              borderRadius: '12px',
              background: '#fff',
              color: '#FE9100',
              cursor: 'pointer',
              marginBottom: '20px',
              fontWeight: '600',
              fontSize: '15px',
            }}
            onClick={addStudent}
          >
            + Yana o'quvchi qo'shish
          </button>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '20px',
            }}
          >
            <button
              className="sc-form-cancel-btn"
              style={{
                padding: '12px 32px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                background: '#fff',
                color: '#64748b',
                cursor: 'pointer',
                fontFamily: 'noto-m',
              }}
              onClick={() => navigate('/students-contract')}
            >
              Bekor qilish
            </button>
            <button
              className="sc-form-prev-btn"
              style={{
                padding: '12px 32px',
                borderRadius: '10px',
                border: '1.5px solid #FE9100',
                background: '#fff',
                color: '#FE9100',
                cursor: 'pointer',
                fontFamily: 'noto-m',
              }}
              onClick={() => setStep(1)}
            >
              Oldingisi
            </button>
            <button
              className="sc-form-save-btn"
              style={{
                padding: '12px 32px',
                borderRadius: '10px',
                border: 'none',
                background: '#fe9100',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.2)',
              }}
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LegalEntity;
