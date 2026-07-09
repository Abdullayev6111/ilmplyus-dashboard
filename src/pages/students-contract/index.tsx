import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import './studentsContracts.css';
import {
  emptyStudent,
  type ContractsResponse,
  type StudentContract,
  type StudentFormData,
} from '../../types/studentContract.types';
import type { Lid } from '@/types/lid.types';
import type { Group } from '@/types/groups.types';
import { API } from '@/api/api';
import { Protected } from '../../components/Protected';
import { useOptions } from '@/hooks/useOptions';

const getStatusType = (status: string) => {
  switch (status) {
    case 'active':
      return 'active';
    case 'pending':
      return 'pending';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'tasdiq';
  }
};

const getStatusLabel = (status: string, t: (key: string) => string) => {
  switch (status) {
    case 'active':
      return t('studentsContract.statusActive');
    case 'pending':
      return t('studentsContract.statusPending');
    case 'cancelled':
      return t('studentsContract.statusCancelled');
    default:
      return t('studentsContract.statusApproved');
  }
};

const getInitials = (first: string = '', last: string = '') => {
  if (!first && !last) return 'N';
  return `${first[0] || ''}${last[0] || ''}`.toUpperCase();
};

const getMainPerson = (item: StudentContract, t: (key: string) => string) => {
  const student = item.contract_students?.[0];
  if (student && (student.first_name || student.last_name)) {
    return {
      name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      phone: student.phone || '',
      initials: getInitials(student.first_name, student.last_name),
    };
  }

  if (item.representative) {
    return {
      name: `${item.representative.first_name || ''} ${item.representative.last_name || ''}`.trim(),
      phone: item.representative.phone || '',
      initials: getInitials(item.representative.first_name, item.representative.last_name),
    };
  }

  return { name: t('studentsContract.unknown'), phone: '', initials: 'N' };
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${hours}:${minutes} ${day}.${month}.${year}`;
};

const getCourseGroup = (item: StudentContract, t: (key: string) => string) => {
  const student = item.contract_students?.[0];
  return {
    course: student?.level?.name_uz || t('studentsContract.notEntered'),
    group: student?.group?.name || t('studentsContract.notEntered'),
  };
};

// Helper: convert ISO date string to YYYY-MM-DD for date inputs
const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // ISO format: extract date part
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AdultContractForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<StudentFormData>({
    ...emptyStudent,
  });
  const [studentId, setStudentId] = useState<number | null>(null);
  const [lidSearchTerm, setLidSearchTerm] = useState('');
  const [showLidDropdown, setShowLidDropdown] = useState(false);
  const pendingLidIdRef = useRef<number | null>(
    (location.state as { lidId?: number } | null)?.lidId ?? null,
  );

  const { data: contractToEdit, isLoading: isFetchingContract } = useQuery({
    queryKey: ['student-contract', id],
    queryFn: () => API.get(`/student-contracts/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (contractToEdit && id) {
      const contract = contractToEdit.contract || contractToEdit.data || contractToEdit;
      const student = contract.contract_students?.[0];
      if (student) {
        setStudentId(student.id || null);
        setFormData({
          lid_id: String(student.lid_id),
          jshshir: student.jshshir || '',
          language: contract.language || 'uz',
          citizenship: student.citizenship || 'citizen',
          passport_series: student.passport_series || '',
          passport_number: student.passport_number || '',
          passport_given_date: formatDateForInput(student.passport_given_date),
          passport_expiry_date: formatDateForInput(student.passport_expiry_date),
          passport_given_by: student.passport_given_by || '',
          birth_place: student.birth_place || '',
          last_name: student.last_name || '',
          first_name: student.first_name || '',
          father_name: student.father_name || '',
          birth_date: formatDateForInput(student.birth_date),
          group_id: student.group_id ? String(student.group_id) : '',
          course_id: student.course_id ? String(student.course_id) : '',
          level_id: student.level_id ? String(student.level_id) : '',
          phone: student.phone ? student.phone.replace('+', '') : '',
          residential_address: student.residential_address || '',
          registered_address: student.registered_address || '',
          monthly_price: student.monthly_price ? String(student.monthly_price) : '',
          total_price: student.total_price ? String(student.total_price) : '',
          course_start_date: formatDateForInput(student.course_start_date),
          course_end_date: formatDateForInput(student.course_end_date),
          contract_date: formatDateForInput(contract.contract_date),
          notes: contract.notes || '',
        });

        setLidSearchTerm(String(student.lid_id));
      }
    }
  }, [contractToEdit, id]);

  const { data: allLids, isFetching: isSearching } = useQuery({
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

  const { data: allCourses } = useOptions('courses');
  const { data: allLevels } = useOptions('levels');

  const searchResults = useMemo(() => {
    if (!lidSearchTerm) return [];
    const term = lidSearchTerm.toLowerCase();
    return (allLids || [])
      .filter((lid: Lid) => {
        const fullName = `${lid.first_name || ''} ${lid.last_name || ''}`.toLowerCase();
        const idStr = String(lid.id);
        return idStr === term || fullName.includes(term);
      })
      .slice(0, 10);
  }, [allLids, lidSearchTerm]);

  const handleLidSelect = (lid: Lid) => {
    const addressStr = [
      lid.region?.name_uz || lid.region?.name_uz,
      lid.district?.name_uz || lid.district?.name_uz,
    ]
      .filter(Boolean)
      .join(', ');

    setFormData((prev) => ({
      ...prev,
      lid_id: String(lid.id),
      first_name: lid.first_name || prev.first_name,
      last_name: lid.last_name || prev.last_name,
      father_name: lid.father_name || prev.father_name,
      birth_date: lid.birth_date || prev.birth_date,
      phone: lid.phone ? lid.phone.replace('+', '') : prev.phone,
      course_id: lid.course_id ? String(lid.course_id) : prev.course_id,
      group_id: lid.group_id ? String(lid.group_id) : prev.group_id,
      level_id: lid.level_id ? String(lid.level_id) : prev.level_id,
      residential_address: addressStr || prev.residential_address,
      monthly_price: lid.course_price?.new_price
        ? String(lid.course_price.new_price)
        : prev.monthly_price,
    }));

    setLidSearchTerm(String(lid.id));
    setShowLidDropdown(false);
  };

  useEffect(() => {
    if (!allLids || !pendingLidIdRef.current) return;
    const lid = (allLids as Lid[]).find((l) => l.id === pendingLidIdRef.current);
    if (lid) {
      pendingLidIdRef.current = null;
      window.history.replaceState({}, '');
      handleLidSelect(lid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLids]);

  const handleChange = (field: keyof StudentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-fill dates and calculate total price when group is selected
  useEffect(() => {
    if (formData.group_id && allGroups) {
      const selectedGroup = allGroups.find((g: Group) => String(g.id) === formData.group_id);
      if (selectedGroup) {
        setFormData((prev) => {
          const newStartDate = formatDateForInput(selectedGroup.start_date);
          const newEndDate = formatDateForInput(selectedGroup.end_date);

          if (prev.course_start_date !== newStartDate || prev.course_end_date !== newEndDate) {
            return {
              ...prev,
              course_start_date: newStartDate,
              course_end_date: newEndDate,
            };
          }
          return prev;
        });
      }
    }
  }, [formData.group_id, allGroups]);

  // Auto-calculate total price based on monthly_price and duration
  useEffect(() => {
    if (formData.monthly_price && formData.course_start_date && formData.course_end_date) {
      const start = new Date(formData.course_start_date);
      const end = new Date(formData.course_end_date);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const months =
          (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        const total = Number(formData.monthly_price) * Math.max(months, 1);

        setFormData((prev) => ({ ...prev, total_price: String(total) }));
      }
    }
  }, [formData.monthly_price, formData.course_start_date, formData.course_end_date]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => API.post('/student-contracts', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-contracts'] });
      navigate('/students-contract');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => API.put(`/student-contracts/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-contracts'] });
      navigate('/students-contract');
    },
  });

  const handleSubmit = () => {
    const studentPayload: Record<string, unknown> = {
      lid_id: Number(formData.lid_id),
      is_minor: false,
      jshshir: formData.jshshir,
      first_name: formData.first_name,
      last_name: formData.last_name,
      father_name: formData.father_name,
      birth_date: formData.birth_date,
      phone: formData.phone,
      passport_series: formData.passport_series,
      passport_number: formData.passport_number,
      passport_given_date: formData.passport_given_date,
      passport_expiry_date: formData.passport_expiry_date,
      passport_given_by: formData.passport_given_by,
      registered_address: formData.registered_address || formData.residential_address,
      residential_address: formData.residential_address,
      course_id: Number(formData.course_id),
      level_id: Number(formData.level_id),
      group_id: Number(formData.group_id),
      monthly_price: Number(formData.monthly_price) || 0,
      total_price: Number(formData.total_price) || 0,
      course_start_date: formData.course_start_date,
      course_end_date: formData.course_end_date,
    };

    if (id && studentId) {
      studentPayload.id = studentId;
    }

    const payload = {
      contract_type: 'adult',
      language: formData.language,
      branch_id: 1,
      contract_date: formData.contract_date,
      notes: formData.notes,
      students: [studentPayload],
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
        <div style={{ textAlign: 'center', padding: 40 }}>{t('studentsContract.loading')}</div>
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
          className="sc-page-top-icon"
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
          className="sc-page-top-title"
          style={{
            textTransform: 'uppercase',
            fontFamily: 'noto-sb',
            fontSize: '16px',
            color: '#000',
          }}
        >
          {t('studentsContract.contractWithStudent')}
        </span>
      </div>

      <div className="sc-section-card">
        <div
          className="sc-section-card-header"
          style={{
            justifyContent: 'center',
            background: '#0f3460',
            borderRadius: '10px',
            margin: '16px',
            padding: '12px 24px',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontFamily: 'noto-b',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {t('studentsContract.step1Student')}
          </span>
        </div>

        <div className="sc-section-card-body">
          <div className="sc-form-grid cols-2" style={{ gap: '24px 18px', marginBottom: '24px' }}>
            {}
            <div className="sc-form-group" style={{ position: 'relative' }}>
              <label className="sc-form-label">
                {t('studentsContract.lidIdSearch')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                placeholder={t('studentsContract.lidSearchPlaceholder')}
                value={lidSearchTerm || formData.lid_id}
                onChange={(e) => {
                  setLidSearchTerm(e.target.value);
                  handleChange('lid_id', e.target.value);
                  setShowLidDropdown(true);
                  if (e.target.value === '') {
                    // Just clearing search
                  }
                }}
                onFocus={() => setShowLidDropdown(true)}
                onBlur={() => setTimeout(() => setShowLidDropdown(false), 200)}
              />
              {showLidDropdown && lidSearchTerm.length > 0 && (
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
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 10,
                  }}
                >
                  {isSearching ? (
                    <div
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '13px',
                      }}
                    >
                      {t('studentsContract.searching')}
                    </div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr
                          style={{
                            background: '#f8faff',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          <th
                            style={{
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontSize: '12px',
                              color: '#64748b',
                              fontWeight: 600,
                            }}
                          >
                            ID
                          </th>
                          <th
                            style={{
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontSize: '12px',
                              color: '#64748b',
                              fontWeight: 600,
                            }}
                          >
                            {t('studentsContract.nameCol')}
                          </th>
                          <th
                            style={{
                              padding: '8px 12px',
                              textAlign: 'left',
                              fontSize: '12px',
                              color: '#64748b',
                              fontWeight: 600,
                            }}
                          >
                            {t('studentsContract.telephoneCol')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((lid: Lid) => (
                          <tr
                            key={lid.id}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              transition: 'background 0.2s',
                            }}
                            onClick={() => handleLidSelect(lid)}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f5ff')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td
                              style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                color: '#1e293b',
                              }}
                            >
                              {lid.id}
                            </td>
                            <td
                              style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                color: '#1e293b',
                              }}
                            >
                              {lid.first_name} {lid.last_name}
                            </td>
                            <td
                              style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                color: '#1e293b',
                              }}
                            >
                              {lid.phone}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '13px',
                      }}
                    >
                      {t('studentsContract.noResults')}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="sc-form-group">
              <label className="sc-form-label">
                JSHSHR <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                placeholder="00000000000000"
                value={formData.jshshir}
                onChange={(e) => handleChange('jshshir', e.target.value)}
              />
            </div>

            {}
            <div className="sc-form-group">
              <label className="sc-form-label">
                {t('studentsContract.contractLanguage')} <span>*</span>
              </label>
              <select
                className="sc-form-select"
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
              >
                <option value="uz">UZ</option>
                <option value="ru">RU</option>
                <option value="en">EN</option>
              </select>
            </div>
            <div className="sc-form-group">
              <label className="sc-form-label">
                {t('studentsContract.citizenship')} <span>*</span>
              </label>
              <select
                className="sc-form-select"
                value={formData.citizenship}
                onChange={(e) => handleChange('citizenship', e.target.value)}
              >
                <option value="citizen">{t('studentsContract.uzbekistan')}</option>
                <option value="foreign">{t('studentsContract.foreign')}</option>
              </select>
            </div>
          </div>

          <div
            className="sc-form-grid"
            style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px 18px' }}
          >
            {}
            <div className="sc-form-group span-2">
              <label className="sc-form-label">
                {t('studentsContract.certPassport')} <span>*</span>
              </label>
              <div className="sc-passport-group" style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="sc-form-input"
                  style={{ width: '80px' }}
                  placeholder="A-AA"
                  maxLength={3}
                  value={formData.passport_series}
                  onChange={(e) => handleChange('passport_series', e.target.value)}
                />
                <input
                  type="text"
                  className="sc-form-input"
                  style={{ flex: 1 }}
                  placeholder=""
                  value={formData.passport_number}
                  onChange={(e) => handleChange('passport_number', e.target.value)}
                />
              </div>
            </div>
            <div className="sc-form-group">
              <label className="sc-form-label">
                {t('studentsContract.issuedDate')} <span>*</span>
              </label>
              <input
                type="date"
                className="sc-form-input"
                value={formData.passport_given_date}
                onChange={(e) => handleChange('passport_given_date', e.target.value)}
              />
            </div>
            <div className="sc-form-group">
              <label className="sc-form-label">
                {t('studentsContract.birthPlace')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                placeholder={t('studentsContract.enter')}
                value={formData.birth_place}
                onChange={(e) => handleChange('birth_place', e.target.value)}
              />
            </div>

            {}
            <div className="sc-form-group" style={{ gridColumn: 'span 4' }}>
              <label className="sc-form-label">
                {t('studentsContract.lastName')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                placeholder={t('studentsContract.enter')}
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
              />
            </div>

            {}
            <div className="sc-form-group span-2">
              <label className="sc-form-label">
                {t('studentsContract.firstName')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                placeholder={t('studentsContract.enter')}
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
              />
            </div>
            <div className="sc-form-group span-2">
              <label className="sc-form-label">
                {t('studentsContract.fatherName')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                placeholder={t('studentsContract.enter')}
                value={formData.father_name}
                onChange={(e) => handleChange('father_name', e.target.value)}
              />
            </div>

            {}
            <div className="sc-form-group">
              <label className="sc-form-label">
                {t('studentsContract.birthDate')} <span>*</span>
              </label>
              <input
                type="date"
                className="sc-form-input"
                value={formData.birth_date}
                onChange={(e) => handleChange('birth_date', e.target.value)}
              />
            </div>
            <div className="sc-form-group">
              <label className="sc-form-label">
                {t('studentsContract.group')} <span>*</span>
              </label>
              <select
                className="sc-form-select"
                value={formData.group_id}
                onChange={(e) => handleChange('group_id', e.target.value)}
              >
                <option value="">{t('studentsContract.select')}</option>
                {(allGroups || []).map((g: Group) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sc-form-group">
              <label className="sc-form-label">
                {t('studentsContract.course')} <span>*</span>
              </label>
              <select
                className="sc-form-select"
                value={formData.course_id}
                onChange={(e) => {
                  handleChange('course_id', e.target.value);
                  handleChange('level_id', '');
                }}
              >
                <option value="">{t('studentsContract.select')}</option>
                {(allCourses || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sc-form-group">
              <label className="sc-form-label">
                {t('studentsContract.level')} <span>*</span>
              </label>
              <select
                className="sc-form-select"
                value={formData.level_id}
                onChange={(e) => handleChange('level_id', e.target.value)}
              >
                <option value="">{t('studentsContract.select')}</option>
                {(allLevels || []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {}
            <div className="sc-form-group span-2">
              <label className="sc-form-label">
                {t('studentsContract.phoneNo')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                placeholder="+998"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
            <div className="sc-form-group span-2">
              <label className="sc-form-label">
                {t('studentsContract.primaryAddress')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                placeholder={t('studentsContract.enter')}
                value={formData.residential_address}
                onChange={(e) => handleChange('residential_address', e.target.value)}
              />
            </div>
            <div className="sc-form-group span-2">
              <label className="sc-form-label">{t('studentsContract.regAddressLabel')}</label>
              <input
                type="text"
                className="sc-form-input"
                placeholder={t('studentsContract.enter')}
                value={formData.registered_address}
                onChange={(e) => handleChange('registered_address', e.target.value)}
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-form-label">{t('studentsContract.monthlyPayment')}</label>
              <input
                type="number"
                className="sc-form-input"
                placeholder="500000"
                value={formData.monthly_price}
                onChange={(e) => handleChange('monthly_price', e.target.value)}
              />
            </div>
            <div className="sc-form-group">
              <label className="sc-form-label">{t('studentsContract.totalPrice')}</label>
              <input
                type="number"
                className="sc-form-input"
                placeholder="3000000"
                value={formData.total_price}
                onChange={(e) => handleChange('total_price', e.target.value)}
              />
            </div>
            <div className="sc-form-group">
              <label className="sc-form-label">{t('studentsContract.courseStartDate')}</label>
              <input
                type="date"
                className="sc-form-input"
                value={formData.course_start_date}
                onChange={(e) => handleChange('course_start_date', e.target.value)}
              />
            </div>
            <div className="sc-form-group">
              <label className="sc-form-label">{t('studentsContract.courseEndDate')}</label>
              <input
                type="date"
                className="sc-form-input"
                value={formData.course_end_date}
                onChange={(e) => handleChange('course_end_date', e.target.value)}
              />
            </div>

            <div className="sc-form-group span-2">
              <label className="sc-form-label">{t('studentsContract.contractDateLabel')}</label>
              <input
                type="date"
                className="sc-form-input"
                value={formData.contract_date}
                onChange={(e) => handleChange('contract_date', e.target.value)}
              />
            </div>
            <div className="sc-form-group span-2">
              <label className="sc-form-label">{t('studentsContract.note')}</label>
              <input
                type="text"
                className="sc-form-input"
                placeholder={t('studentsContract.notePlaceholder')}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="sc-form-actions" style={{ justifyContent: 'flex-end', paddingRight: 16 }}>
        <button
          className="sc-form-cancel-btn"
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            color: '#374151',
            borderRadius: '8px',
          }}
          onClick={() => navigate('/students-contract')}
        >
          {t('studentsContract.cancel')}
        </button>
        <button
          className="sc-form-save-btn"
          style={{
            background: '#FE9100',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'normal',
            fontSize: '14px',
            padding: '10px 14px',
          }}
          onClick={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending
            ? t('studentsContract.saving')
            : t('studentsContract.save')}
        </button>
      </div>
    </div>
  );
};

const StudentsContract = () => {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [idSortOrder, setIdSortOrder] = useState<'asc' | 'desc'>('asc');
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const isAdultForm = location.pathname.includes('/students-contract/adult');

  const { data: contractsData, isLoading } = useQuery<ContractsResponse>({
    queryKey: ['student-contracts', currentPage, searchQuery],
    queryFn: () =>
      API.get('/student-contracts', {
        params: { page: currentPage, search: searchQuery },
      }).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !isAdultForm,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => API.delete(`/student-contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-contracts'] });
    },
  });

  if (isAdultForm) {
    return <AdultContractForm />;
  }

  const contracts = contractsData?.data || [];
  const totalItems = contractsData?.total || 0;
  const totalPages = contractsData?.last_page || 1;
  const itemsPerPage = contractsData?.per_page || 10;
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handleContractSelect = (type: string) => {
    setShowModal(false);
    switch (type) {
      case 'adult':
        navigate('/students-contract/adult');
        break;
      case 'minor':
        navigate('/students-contract/minor');
        break;
      case 'legal':
        navigate('/students-contract/legal');
        break;
      case 'legal-rep':
        navigate('/students-contract/legal-representative');
        break;
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('studentsContract.confirmDelete'))) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (item: StudentContract) => {
    const type =
      item.contract_type === 'adult'
        ? 'adult'
        : item.contract_type === 'minor'
          ? 'minor'
          : item.contract_type === 'legal'
            ? 'legal'
            : item.contract_type === 'legal-rep' || item.contract_type === 'representative'
              ? 'legal-representative'
              : 'adult';

    navigate(`/students-contract/${type}/edit/${item.id}`);
  };

  const renderPagination = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3);
      if (currentPage > 4) pages.push('...');
      if (currentPage > 3 && currentPage < totalPages - 2) {
        pages.push(currentPage);
      }
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }

    const unique = pages.filter((p, i, arr) => arr.indexOf(p) === i);

    return unique.map((page, idx) => {
      if (page === '...') {
        return (
          <span key={`dots-${idx}`} className="sc-page-dots">
            ...
          </span>
        );
      }
      return (
        <button
          key={page}
          className={`sc-page-btn ${currentPage === page ? 'active' : ''}`}
          onClick={() => setCurrentPage(page as number)}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <div className="container students-contract">
      <div className="sc-page-header">
        <h1 className="sc-page-title">{t('studentsContract.pageTitle')}</h1>
        <div className="sc-header-actions">
          <div className="sc-search-wrapper">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder={t('studentsContract.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button className="sc-filter-btn">
            <i className="fa-solid fa-sliders"></i>
            {t('studentsContract.filterBtn')}
          </button>
          <Protected permission="student_contracts.create">
            <button className="sc-create-btn" onClick={() => setShowModal(true)}>
              {t('studentsContract.createContract')}
            </button>
          </Protected>
        </div>
      </div>

      <div className="sc-table-card">
        <div className="sc-table-card-header">
          <span className="sc-table-section-title">{t('studentsContract.newStudents')}</span>
        </div>

        <table className="sc-table">
          <thead>
            <tr>
              <th
                className="sc-th-id"
                onClick={() => setIdSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                ID{' '}
                <i
                  className={`fa-solid fa-sort-${idSortOrder === 'asc' ? 'up' : 'down'}`}
                  style={{ fontSize: 11, marginLeft: 4 }}
                ></i>
              </th>
              <th className="sc-th-name">{t('studentsContract.colStudent')}</th>
              <th>{t('studentsContract.colDirection')}</th>
              <th>{t('studentsContract.group')}</th>
              <th>{t('studentsContract.colBranch')}</th>
              <th>{t('studentsContract.colStatus')}</th>
              <th>{t('studentsContract.colDate')}</th>
              <th>{t('studentsContract.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                  {t('studentsContract.loading')}
                </td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                  {t('studentsContract.noData')}
                </td>
              </tr>
            ) : (
              [...contracts]
                .sort((a, b) => (idSortOrder === 'asc' ? a.id - b.id : b.id - a.id))
                .map((item) => {
                  const person = getMainPerson(item, t);
                  const courseGroup = getCourseGroup(item, t);

                  return (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>
                        <div className="sc-student-cell">
                          <div className="sc-avatar">{person.initials}</div>
                          <div>
                            <div className="sc-student-name">{person.name}</div>
                            <div className="sc-student-phone">{person.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="sc-course-badge purple">
                          <span className="badge-dot"></span>
                          {courseGroup.course}
                        </span>
                      </td>
                      <td>{courseGroup.group}</td>
                      <td>{item.branch?.name_uz || item.branch?.city}</td>

                      <td>
                        <span className={`sc-status-badge ${getStatusType(item.status)}`}>
                          {getStatusLabel(item.status, t)}
                        </span>
                      </td>
                      <td>{formatDateTime(item.created_at)}</td>
                      <td>
                        <div className="sc-actions">
                          <button className="sc-action-btn print" title="Print">
                            <i className="fa-solid fa-print"></i>
                          </button>
                          <button
                            className="sc-action-btn view"
                            title={t('studentsContract.colActions')}
                            onClick={() => navigate(`/students-contract/${item.id}`)}
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          <Protected permission="student_contracts.edit">
                            <button
                              className="sc-action-btn edit"
                              title={t('common.edit')}
                              onClick={() => handleEdit(item)}
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                          </Protected>
                          <Protected permission="student_contracts.delete">
                            <button
                              className="sc-action-btn delete"
                              title={t('studentsContract.delete')}
                              onClick={() => handleDelete(item.id)}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </Protected>
                        </div>
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>

        <div className="sc-table-footer">
          <span className="sc-table-info">
            {t('studentsContract.showingInfo', {
              total: totalItems,
              start: startItem,
              end: endItem,
            })}
          </span>
          <div className="sc-pagination">
            <button
              className="sc-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <i className="fa-solid fa-chevron-left" style={{ fontSize: 11 }}></i>
            </button>
            {renderPagination()}
            <button
              className="sc-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <i className="fa-solid fa-chevron-right" style={{ fontSize: 11 }}></i>
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="sc-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <span className="sc-modal-header-title">
                {t('studentsContract.selectContractType')}
              </span>
              <button className="sc-modal-close" onClick={() => setShowModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="sc-modal-body">
              <button className="sc-contract-option" onClick={() => handleContractSelect('adult')}>
                <span className="sc-contract-option-icon">
                  <i className="fa-solid fa-user"></i>
                </span>
                <span className="sc-contract-option-text">
                  {t('studentsContract.adultContract')}
                </span>
                <span className="sc-contract-option-arrow">
                  <i className="fa-solid fa-chevron-right"></i>
                </span>
              </button>
              <button className="sc-contract-option" onClick={() => handleContractSelect('minor')}>
                <span className="sc-contract-option-icon">
                  <i className="fa-solid fa-child"></i>
                </span>
                <span className="sc-contract-option-text">
                  {t('studentsContract.minorContract')}
                </span>
                <span className="sc-contract-option-arrow">
                  <i className="fa-solid fa-chevron-right"></i>
                </span>
              </button>
              <button className="sc-contract-option" onClick={() => handleContractSelect('legal')}>
                <span className="sc-contract-option-icon">
                  <i className="fa-solid fa-building"></i>
                </span>
                <span className="sc-contract-option-text">
                  {t('studentsContract.legalContract')}
                </span>
                <span className="sc-contract-option-arrow">
                  <i className="fa-solid fa-chevron-right"></i>
                </span>
              </button>
              <button
                className="sc-contract-option"
                onClick={() => handleContractSelect('legal-rep')}
              >
                <span className="sc-contract-option-icon">
                  <i className="fa-solid fa-users"></i>
                </span>
                <span className="sc-contract-option-text">
                  {t('studentsContract.legalRepContract')}
                </span>
                <span className="sc-contract-option-arrow">
                  <i className="fa-solid fa-chevron-right"></i>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsContract;
