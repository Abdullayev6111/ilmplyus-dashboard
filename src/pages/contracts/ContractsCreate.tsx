import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API } from '@/api/api';
import { useOptions } from '@/api/options';
import imageCompression from 'browser-image-compression';
import './contracts.css';
import CameraModal from '@/components/CameraModal/CameraModal';
import DateInput from '@/components/DateInput';

interface AdditionalTask {
  task_id: number;
  salary: number | '';
  comment: string;
}

interface FormState {
  jshshr: string;
  language: 'UZ' | 'RU';
  citizenship: 'citizen' | 'no_citizenship' | 'foreign_citizen';
  country: string;
  branch_id: number;
  city: string;
  contract_date: string;
  passport_series: string;
  passport_number: string;
  passport_given_date: string;
  passport_given_by: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  birth_date: string;
  department_id: number;
  position_id: number;
  work_start_date: string;
  contract_start_date: string;
  contract_end_date: string;
  contract_type: string;
  contract_conclusion_term: string;
  salary_type: string;
  salary_basis: string;
  salary_percent: number | '';
  contract_number: string;
  contract_duration: string;
  probation_enabled: boolean;
  probation_choice: '' | 'sinovsiz' | 'sinov';
  probation_days: number | '';
  working_hours: number | '';
  base_salary: number | '';
  additional_tasks: AdditionalTask[];
  salary_period_start: string;
  salary_period_end: string;
  vacation_enabled: boolean;
  vacation_type: string;
  vacation_days: number | '';
  vacation_payment: number | '';
  phones: string[];
  address_reg: string;
  address_current: string;
  photo: File | null;
  photo_preview: string | null;
}

interface ContractsCreateProps {
  employeeId?: number;
  contractId?: number;
  onCancel?: () => void;
  onSuccess?: () => void;
}

const formatDateForInput = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
  if (/^\d{2}\.\d{2}\.\d{4}/.test(dateStr)) {
    const [day, month, year] = dateStr.substring(0, 10).split('.');
    return `${year}-${month}-${day}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return '';
};

export function ContractsCreate({
  employeeId: propEmpId,
  contractId: propContractId,
  onCancel,
  onSuccess,
}: ContractsCreateProps) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const employeeId =
    propEmpId || (paramId && !isNaN(Number(paramId)) ? Number(paramId) : undefined);
  const contractId = propContractId || undefined;

  const [formData, setFormData] = useState<FormState>({
    jshshr: '',
    language: 'UZ',
    citizenship: 'citizen',
    country: '',
    branch_id: 0,
    city: '',
    contract_date: '',
    passport_series: '',
    passport_number: '',
    passport_given_date: '',
    passport_given_by: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    birth_date: '',
    department_id: 0,
    position_id: 0,
    work_start_date: '',
    contract_start_date: '',
    contract_end_date: '',
    contract_type: '',
    contract_conclusion_term: '',
    salary_type: '',
    salary_basis: '',
    salary_percent: '',
    contract_number: '',
    contract_duration: '',
    probation_enabled: false,
    probation_choice: '',
    probation_days: '',
    working_hours: '',
    base_salary: '',
    additional_tasks: [],
    salary_period_start: '',
    salary_period_end: '',
    vacation_enabled: false,
    vacation_type: '',
    vacation_days: '',
    vacation_payment: '',
    phones: ['+998'],
    address_reg: '',
    address_current: '',
    photo: null,
    photo_preview: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const { data: branches } = useOptions('branches');
  const { data: departments } = useOptions('departments');
  const { data: positions } = useOptions('positions');

  // JSHSHIR autofill user'ning `full_name`, `phone`, `branch_id`, `department_id` larini
  // o'qiydi — /options/users bularni bermaydi, shuning uchun to'liq endpoint saqlanadi.
  const { data: users } = useQuery<any[]>({
    queryKey: ['users-all'],
    queryFn: async () => {
      const res = await API.get('/users', { params: { per_page: 1000 } });
      const d = res.data;
      return Array.isArray(d) ? d : d?.data || [];
    },
  });

  useQuery({
    queryKey: ['contracts', employeeId, contractId],
    queryFn: async () => {
      if (!employeeId) return null;
      const { data: contractsData } = await API.get(`/contracts`);
      const contracts = Array.isArray(contractsData) ? contractsData : contractsData?.data || [];
      let contract;
      if (contractId) {
        contract = contracts.find(
          (c: { id: number; employee?: { id: number } }) => c.id === contractId,
        );
      } else {
        contract = contracts.find(
          (c: { id: number; employee?: { id: number } }) => c.employee?.id === employeeId,
        );
      }

      if (contract) {
        const emp = contract.employee || {};
        setFormData((prevData) => ({
          ...prevData,
          first_name: emp.first_name || '',
          last_name: emp.last_name || '',
          middle_name: emp.middle_name || '',
          birth_date: formatDateForInput(emp.birth_date),
          jshshr: emp.jshshr || emp.pinfl || '',
          passport_series: emp.passport_series || '',
          passport_number: emp.passport_number || '',
          passport_given_date: formatDateForInput(emp.passport_given_date),
          passport_given_by: emp.passport_given_by || '',

          branch_id: Number(emp.branch_id || contract.branch_id || prevData.branch_id || 0),
          department_id: Number(
            contract.department?.id || contract.department_id || prevData.department_id || 0,
          ),
          position_id: Number(
            contract.position?.id || contract.position_id || prevData.position_id || 0,
          ),
          work_start_date: formatDateForInput(contract.work_start_date),

          contract_start_date: formatDateForInput(contract.contract_start_date),
          contract_end_date: formatDateForInput(contract.contract_end_date),
          contract_date: formatDateForInput(contract.contract_date),
          contract_type: contract.contract_type || '',
          contract_conclusion_term:
            contract.contract_duration_months || contract.contract_conclusion_term || '',
          salary_type: contract.monthly_salary_type || contract.salary_type || '',
          salary_basis: contract.salary_basis || '',
          salary_percent:
            contract.salary_percent === null || contract.salary_percent === undefined
              ? ''
              : Number(contract.salary_percent),
          contract_number: contract.contract_number ? String(contract.contract_number) : '',
          contract_duration:
            contract.contract_duration != null ? String(contract.contract_duration) : '',

          probation_enabled: !!contract.probation_period,
          probation_choice: contract.probation_period ? 'sinov' : '',
          probation_days: parseInt(contract.probation_period) || 0,
          working_hours: Number(contract.working_hours_monthly) || 0,
          base_salary: Number(contract.base_salary) || 0,

          salary_period_start: formatDateForInput(contract.salary_start_date),
          salary_period_end: formatDateForInput(contract.salary_end_date),

          vacation_enabled: contract.vacation_type === 'beriladi',
          vacation_type: contract.vacation_type || '',

          address_reg: emp.address_registration || emp.address_reg || '',
          address_current: emp.address_living || emp.address_current || '',
          phones: emp.phone ? [emp.phone] : ['+998'],

          language: contract.language || emp.language || 'UZ',
          citizenship: contract.citizenship || emp.citizenship || 'citizen',
          country: contract.country || emp.country || '',
        }));
      }
      return contract;
    },
    enabled: !!employeeId,
  });

  const selectedBranch = useMemo(
    () => branches?.find((b) => b.id === Number(formData.branch_id)),
    [branches, formData.branch_id],
  );

  const filteredPositions = useMemo(() => {
    if (!positions) return [];
    if (!formData.department_id) return positions;
    return positions.filter(
      (p) => Number(p.department_id) === Number(formData.department_id),
    );
  }, [positions, formData.department_id]);

  // "Shartnoma uchun oylik turi" tanlovi "Oylik hisoblash asosi" optionlarini belgilaydi.
  // "foiz" da esa select o'rniga foiz qiymati kiritiladi.
  const salaryBasisOptions = useMemo<string[]>(() => {
    if (formData.salary_type === 'shtat') return ['totalHours', 'baseSalary', 'hourlySalary'];
    if (formData.salary_type === 'soat') return ['totalHours', 'baseWorkHours', 'hourlyWorkHours'];
    return [];
  }, [formData.salary_type]);

  const hourlyRate = useMemo(() => {
    const workingHours = Number(formData.working_hours);
    const baseSalary = Number(formData.base_salary);

    return workingHours > 0 ? (baseSalary / workingHours).toFixed(2) : '0.00';
  }, [formData.base_salary, formData.working_hours]);

  const totalMonthlySalary = useMemo(() => {
    const baseSalary = Number(formData.base_salary);

    const additionalTotal = formData.additional_tasks.reduce(
      (sum, task) => sum + Number(task.salary || 0),
      0,
    );

    return baseSalary + additionalTotal;
  }, [formData.base_salary, formData.additional_tasks]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const req = t('contractsValidation.required');

    // JSHSHR
    if (!formData.jshshr) newErrors.jshshr = req;
    else if (!/^\d{14}$/.test(formData.jshshr)) newErrors.jshshr = t('contractsCreate.jshshrError');

    // Citizenship country (only required for foreign citizens)
    if (formData.citizenship === 'foreign_citizen' && !formData.country) newErrors.country = req;

    if (!formData.branch_id) newErrors.branch_id = req;
    if (!formData.contract_date) newErrors.contract_date = req;

    // Passport
    if (!formData.passport_series) newErrors.passport_series = req;
    else if (!/^[A-Z]{2}$/.test(formData.passport_series))
      newErrors.passport_series = t('contractsCreate.passportSeriesError');

    if (!formData.passport_number) newErrors.passport_number = req;
    else if (!/^\d{7}$/.test(formData.passport_number))
      newErrors.passport_number = t('contractsCreate.passportNumberError');

    if (!formData.passport_given_date) newErrors.passport_given_date = req;
    if (!formData.passport_given_by) newErrors.passport_given_by = req;

    // Personal
    if (!formData.last_name) newErrors.last_name = req;
    if (!formData.first_name) newErrors.first_name = req;
    if (!formData.middle_name) newErrors.middle_name = req;
    if (!formData.birth_date) newErrors.birth_date = req;

    // Department / position / work
    if (!formData.department_id) newErrors.department_id = req;
    if (!formData.position_id) newErrors.position_id = req;
    if (!formData.work_start_date) newErrors.work_start_date = req;

    // Contract dates / types
    if (!formData.contract_start_date) newErrors.contract_start_date = req;
    if (!formData.contract_end_date) newErrors.contract_end_date = req;
    if (!formData.contract_type) newErrors.contract_type = req;
    if (!formData.contract_conclusion_term) newErrors.contract_conclusion_term = req;
    if (!formData.salary_type) newErrors.salary_type = req;
    if (formData.salary_type === 'foiz') {
      if (formData.salary_percent === '') newErrors.salary_percent = req;
    } else if (formData.salary_type && !formData.salary_basis) {
      newErrors.salary_basis = req;
    }
    if (!formData.contract_duration) newErrors.contract_duration = req;

    // Probation
    if (!formData.probation_choice) newErrors.probation_choice = req;
    if (formData.probation_choice === 'sinov' && !formData.probation_days)
      newErrors.probation_days = req;

    // Salary
    if (!formData.working_hours) newErrors.working_hours = req;
    if (!formData.base_salary) newErrors.base_salary = req;

    // Salary period
    if (!formData.salary_period_start) newErrors.salary_period_start = req;
    if (!formData.salary_period_end) newErrors.salary_period_end = req;
    else if (
      formData.salary_period_start &&
      new Date(formData.salary_period_end) <= new Date(formData.salary_period_start)
    ) {
      newErrors.salary_period_end = t('contractsValidation.mustBeGreater');
    }

    // Vacation
    if (!formData.vacation_type) newErrors.vacation_type = req;
    if (formData.vacation_type === 'beriladi') {
      if (!formData.vacation_days) newErrors.vacation_days = req;
      if (!formData.vacation_payment) newErrors.vacation_payment = req;
    }

    // Phone (first number must be a full +998 number)
    if (!formData.phones[0] || formData.phones[0].replace(/\D/g, '').length < 12)
      newErrors.phone = req;

    // Addresses
    if (!formData.address_reg) newErrors.address_reg = req;
    if (!formData.address_current) newErrors.address_current = req;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // After the first submit attempt, re-validate live so red borders clear once fixed
  useEffect(() => {
    if (submitted) validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, submitted]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const empFormData = new FormData();
      empFormData.append('last_name', formData.last_name);
      empFormData.append('first_name', formData.first_name);
      empFormData.append('middle_name', formData.middle_name);
      empFormData.append('branch_id', String(formData.branch_id));
      empFormData.append('pinfl', formData.jshshr);
      empFormData.append('passport_series', formData.passport_series);
      empFormData.append('passport_number', formData.passport_number);
      empFormData.append('passport_given_date', formData.passport_given_date);
      empFormData.append('passport_given_by', formData.passport_given_by);
      empFormData.append('birth_date', formData.birth_date);
      empFormData.append('phone', formData.phones[0]);
      empFormData.append('address_registration', formData.address_reg);
      empFormData.append('address_living', formData.address_current);
      empFormData.append('citizenship', formData.citizenship);
      empFormData.append('country', formData.country);
      empFormData.append('language', formData.language);
      empFormData.append('department_id', String(formData.department_id));

      if (formData.photo) {
        empFormData.append('photo', formData.photo);
      }

      let currentEmployeeId = employeeId;
      if (employeeId) {
        // Use POST with _method=PUT for multipart/form-data support in Laravel/PHP
        empFormData.append('_method', 'PUT');
        await API.post(`/employees/${employeeId}`, empFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const res = await API.post('/employees', empFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        currentEmployeeId = res.data?.data?.id || res.data?.id;
        if (!currentEmployeeId) {
          throw new Error(t('contractsCreate.employeeCreateError'));
        }
      }

      let nextContractNumber: number = 1;
      if (!contractId) {
        try {
          const res = await API.get(`/contracts`);
          if (!currentEmployeeId) {
            throw new Error(t('contractsCreate.employeeIdError'));
          }
          const allContracts = Array.isArray(res.data) ? res.data : res.data?.data || [];
          if (Array.isArray(allContracts)) {
            const numbers: number[] = allContracts
              .map((c: any) => Number(c.contract_number))
              .filter((n: number) => !isNaN(n) && n > 0);
            if (numbers.length > 0) {
              const lastNumber: number = Math.max(...numbers);
              nextContractNumber = lastNumber + 1;
            }
          }
        } catch (err) {
          throw new Error(t('contractsCreate.contractNumberError'));
          console.log(err);
        }
      }

      let probationEndDate: string | null = null;

      const probationDays = Number(formData.probation_days);

      if (formData.probation_enabled && formData.contract_start_date && probationDays > 0) {
        const d = new Date(formData.contract_start_date);
        d.setDate(d.getDate() + probationDays);
        probationEndDate = d.toISOString().split('T')[0];
      }

      const contractData = {
        employee_id: currentEmployeeId,
        contract_number: contractId ? Number(formData.contract_number) : nextContractNumber,
        language: formData.language,
        citizenship: 'Uzbekistan',
        contract_date: formData.contract_date,
        signed_by: 'HR Manager',
        department_id: Number(formData.department_id),
        position_id: Number(formData.position_id),
        work_start_date: formData.work_start_date,
        contract_start_date: formData.contract_start_date,
        contract_end_date: formData.contract_end_date,
        contract_type: formData.contract_type,
        contract_duration: String(formData.contract_duration),
        contract_duration_months: formData.contract_conclusion_term,
        monthly_salary_type: formData.salary_type,
        salary_basis: formData.salary_type === 'foiz' ? null : formData.salary_basis || null,
        salary_percent:
          formData.salary_type === 'foiz' && formData.salary_percent !== ''
            ? Number(formData.salary_percent)
            : null,
        probation_period: formData.probation_enabled ? `${formData.probation_days} kun` : null,
        probation_end_date: probationEndDate,
        working_hours_monthly: Number(formData.working_hours),
        base_salary: Number(formData.base_salary),
        hourly_rate: Number(hourlyRate),
        total_monthly_salary: Number(totalMonthlySalary),
        salary_start_date: formData.salary_period_start,
        salary_end_date: formData.salary_period_end,
        vacation_type: formData.vacation_type,
        status: 'active',
      };

      if (contractId && currentEmployeeId) {
        await API.put(`/employees/${currentEmployeeId}/contracts/${contractId}`, contractData);
      } else {
        await API.post(`/employees/${currentEmployeeId}/contracts`, contractData);
      }
    },
    onError: (error: any) => {
      const responseErrors = error.response?.data?.errors;
      if (responseErrors) {
        const backendErrors: Record<string, string> = {};
        Object.entries(responseErrors).forEach(([field, msgs]) => {
          backendErrors[field] = (msgs as string[])[0];
        });
        setErrors((prev) => ({ ...prev, ...backendErrors }));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/contracts');
      }
    },
  });

  // When a full 14-digit JSHSHR is entered, try to match it against the users
  // list (by pinfl) and auto-fill the matching person's details.
  const handleJshshrChange = (raw: string) => {
    const value = raw.replace(/\D/g, '');
    setFormData((prev) => {
      const next: FormState = { ...prev, jshshr: value };
      if (value.length !== 14 || !users) return next;

      const match = users.find(
        (u) => String(u?.pinfl ?? '').replace(/\D/g, '') === value,
      );
      if (!match) return next;

      const m: any = match;
      const nameParts = String(m.full_name || '').trim().split(/\s+/);
      next.last_name = nameParts[0] || prev.last_name;
      next.first_name = nameParts[1] || prev.first_name;
      next.middle_name = nameParts[2] || prev.middle_name;
      next.phones = m.phone ? [m.phone] : prev.phones;
      next.branch_id = Number(m.branch_id || m.branches?.[0]?.id) || prev.branch_id;
      next.department_id = Number(m.department_id || m.departments?.[0]?.id) || prev.department_id;
      return next;
    });
  };

  const updatePhone = (index: number, value: string) => {
    // Force prefix +998 and allow only digits after it
    if (!value.startsWith('+998')) {
      const newPhones = [...formData.phones];
      newPhones[index] = '+998';
      setFormData({ ...formData, phones: newPhones });
      return;
    }
    const newPhones = [...formData.phones];
    newPhones[index] = value;
    setFormData({ ...formData, phones: newPhones });
  };

  const handleAddField = (field: 'additional_tasks' | 'phones') => {
    if (field === 'phones') {
      setFormData({ ...formData, phones: [...formData.phones, '+998'] });
    } else {
      setFormData({
        ...formData,
        additional_tasks: [...formData.additional_tasks, { task_id: 0, salary: 0, comment: '' }],
      });
    }
  };

  const updateTask = (index: number, updates: Partial<AdditionalTask>) => {
    const newTasks = [...formData.additional_tasks];
    newTasks[index] = { ...newTasks[index], ...updates };
    setFormData({ ...formData, additional_tasks: newTasks });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);

      if (compressedFile.size > 200 * 1024) {
        setErrors((prev) => ({
          ...prev,
          photo: t('contractsCreate.photoSizeError'),
        }));
        return;
      }

      setErrors(({ photo, ...rest }) => rest);

      setFormData((prev) => ({
        ...prev,
        photo: compressedFile,
        photo_preview: URL.createObjectURL(compressedFile),
      }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        photo: t('contractsCreate.photoProcessError'),
      }));
    }
  };

  return (
    <div className="contracts-container ccr-create-page">
      <div className="contracts-header">
        <h1>
          <div className="icon-box">
            <i className="fas fa-user-edit"></i>
          </div>
          {t('contractsCreate.pageTitle')}
        </h1>
      </div>

      <form
        className="contracts-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (validate()) {
            saveMutation.mutate();
          } else {
            // No request is sent until every required field is valid — scroll
            // to and focus the first invalid field so the blocker is visible.
            setTimeout(() => {
              const firstError = document.querySelector<HTMLElement>('.contracts-form .error');
              if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus?.();
              }
            }, 0);
          }
        }}
      >
        {/* JSHSHR */}
        <div className="crow crow-1">
          <div className="form-group">
            <label>
              JSHSHR <span className="required">*</span>
            </label>
            <input
              type="text"
              placeholder="00000000000000"
              maxLength={14}
              value={formData.jshshr}
              onChange={(e) => handleJshshrChange(e.target.value)}
              className={errors.jshshr ? 'error' : ''}
            />
            {errors.jshshr && <span className="error-text">{errors.jshshr}</span>}
          </div>
        </div>

        {/* Shartnoma tili | Fuqaroligi */}
        <div className="crow crow-2">
          <div className="form-group">
            <label>
              {t('contractsCreate.contractLanguage')} <span className="required">*</span>
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
            >
              <option value="UZ">UZ</option>
              <option value="RU">RU</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              {t('contractsCreate.citizenship')} <span className="required">*</span>
            </label>
            <select
              value={formData.citizenship}
              onChange={(e) => setFormData({ ...formData, citizenship: e.target.value as any })}
            >
              <option value="citizen">{t('contractsCreate.citizenUz')}</option>
              <option value="no_citizenship">{t('contractsCreate.citizenNone')}</option>
              <option value="foreign_citizen">{t('contractsCreate.citizenForeign')}</option>
            </select>
          </div>
        </div>

        {formData.citizenship === 'foreign_citizen' && (
          <div className="crow crow-1">
            <div className="form-group">
              <label>
                {t('contractsCreate.country')} <span className="required">*</span>
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className={errors.country ? 'error' : ''}
              />
            </div>
          </div>
        )}

        {/* Filial | Shahar | Shartnoma sanasi */}
        <div className="crow crow-3">
          <div className="form-group">
            <label>
              {t('contractsCreate.branch')} <span className="required">*</span>
            </label>
            <select
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: Number(e.target.value) })}
              className={errors.branch_id ? 'error' : ''}
            >
              <option value={0}>{t('contractsCreate.select')}</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t('contractsCreate.city')}</label>
            <input type="text" value={selectedBranch?.city || ''} readOnly disabled />
          </div>

          <div className="form-group">
            <label>
              {t('contractsCreate.contractDate')} <span className="required">*</span>
            </label>
            <DateInput
              value={formData.contract_date}
              onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
              className={errors.contract_date ? 'error' : ''}
            />
          </div>
        </div>

        {/* Passport seriyasi va raqami | Berilgan sanasi | Kim tomonidan berilganligi */}
        <div className="crow crow-3">
          <div className="form-group">
            <label>
              {t('contractsCreate.passportSeries')} <span className="required">*</span>
            </label>
            <div className="passport-row">
              <input
                type="text"
                maxLength={2}
                placeholder="AA"
                value={formData.passport_series}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormData({ ...formData, passport_series: val });
                  if (val.length === 2) document.getElementById('pass-num')?.focus();
                }}
                className={errors.passport_series ? 'error' : ''}
              />
              <input
                id="pass-num"
                type="text"
                maxLength={7}
                placeholder="1234567"
                value={formData.passport_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    passport_number: e.target.value.replace(/\D/g, ''),
                  })
                }
                className={errors.passport_number ? 'error' : ''}
              />
            </div>
            {(errors.passport_series || errors.passport_number) && (
              <span className="error-text">{errors.passport_series || errors.passport_number}</span>
            )}
          </div>

          <div className="form-group">
            <label>
              {t('contractsCreate.passportGivenDate')} <span className="required">*</span>
            </label>
            <DateInput
              value={formData.passport_given_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  passport_given_date: e.target.value,
                })
              }
              className={errors.passport_given_date ? 'error' : ''}
            />
          </div>

          <div className="form-group">
            <label>
              {t('contractsCreate.passportGivenBy')} <span className="required">*</span>
            </label>
            <input
              type="text"
              placeholder={t('contractsCreate.enterPlaceholder')}
              value={formData.passport_given_by}
              onChange={(e) => setFormData({ ...formData, passport_given_by: e.target.value })}
              className={errors.passport_given_by ? 'error' : ''}
            />
          </div>
        </div>

        {/* Rasm (mavjud funksiya, layout tartibidan tashqari) */}
        <div className="crow crow-1">
          <div className="form-group">
            <label>{t('contractsCreate.photo')}</label>

            <div style={{ display: 'flex', gap: 10 }}>
              <input type="file" accept="image/*" onChange={handleFileChange} />

              <button type="button" className="camera-btn " onClick={() => setIsCameraOpen(true)}>
                <span className="camera-btn-icon">📷</span>
                <span>{t('contractsCreate.camera')}</span>
              </button>
            </div>

            {formData.photo_preview && (
              <div style={{ position: 'relative', width: 100 }}>
                <img
                  src={formData.photo_preview}
                  alt="preview"
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginTop: 10,
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      photo: null,
                      photo_preview: null,
                    }))
                  }
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    background: 'red',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {errors.photo && <span className="error-text">{errors.photo}</span>}
          </div>
        </div>

        {/* Familiya | Ism | Otasini ismi */}
        <div className="crow crow-3">
          <div className="form-group">
            <label>
              {t('contractsCreate.lastName')} <span className="required">*</span>
            </label>
            <input
              type="text"
              placeholder={t('contractsCreate.inputPlaceholder')}
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className={errors.last_name ? 'error' : ''}
            />
          </div>
          <div className="form-group">
            <label>
              {t('contractsCreate.firstName')} <span className="required">*</span>
            </label>
            <input
              type="text"
              placeholder={t('contractsCreate.inputPlaceholder')}
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className={errors.first_name ? 'error' : ''}
            />
          </div>
          <div className="form-group">
            <label>
              {t('contractsCreate.middleName')} <span className="required">*</span>
            </label>
            <input
              type="text"
              placeholder={t('contractsCreate.inputPlaceholder')}
              value={formData.middle_name}
              onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
              className={errors.middle_name ? 'error' : ''}
            />
          </div>
        </div>

        {/* Tug'ilgan sanasi */}
        <div className="crow crow-1">
          <div className="form-group">
            <label>
              {t('contractsCreate.birthDate')} <span className="required">*</span>
            </label>
            <DateInput
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className={errors.birth_date ? 'error' : ''}
            />
          </div>
        </div>

        {/* Bo'lim | Lavozimi | Ish boshlash sanasi */}
        <div className="crow crow-3">
          <div className="form-group">
            <label>
              {t('contractsCreate.department')} <span className="required">*</span>
            </label>
            <select
              value={formData.department_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  department_id: Number(e.target.value),
                  position_id: 0,
                })
              }
              className={errors.department_id ? 'error' : ''}
            >
              <option value={0}>{t('contractsCreate.selectPlaceholder')}</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              {t('contractsCreate.position')} <span className="required">*</span>
            </label>
            <select
              value={formData.position_id}
              disabled={!formData.department_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  position_id: Number(e.target.value),
                })
              }
              className={errors.position_id ? 'error' : ''}
            >
              <option value={0}>{t('contractsCreate.selectPlaceholder')}</option>
              {filteredPositions?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              {t('contractsCreate.workStartDate')} <span className="required">*</span>
            </label>
            <DateInput
              value={formData.work_start_date}
              onChange={(e) => setFormData({ ...formData, work_start_date: e.target.value })}
              className={errors.work_start_date ? 'error' : ''}
            />
          </div>
        </div>

        {/* Shartnoma boshlanish sanasi | Shartnoma tugash sanasi */}
        <div className="crow crow-2">
          <div className="form-group">
            <label>
              {t('contractsCreate.contractStartDate')} <span className="required">*</span>
            </label>
            <DateInput
              value={formData.contract_start_date}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contract_start_date: e.target.value,
                })
              }
              className={errors.contract_start_date ? 'error' : ''}
            />
          </div>

          <div className="form-group">
            <label>
              {t('contractsCreate.contractEndDate')} <span className="required">*</span>
            </label>
            <DateInput
              value={formData.contract_end_date}
              onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
              className={errors.contract_end_date ? 'error' : ''}
            />
          </div>
        </div>

        {/* Shartnoma turi | Shartnoma tuzish muddati | Shartnoma uchun oylik turi */}
        <div className="crow crow-3">
          <div className="form-group">
            <label>
              {t('contractsCreate.contractType')} <span className="required">*</span>
            </label>
            <select
              value={formData.contract_type}
              onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
              className={errors.contract_type ? 'error' : ''}
            >
              <option value="">{t('contractsCreate.select')}</option>
              <option value="asosiy">{t('contractsCreate.contractTypeOptions.asosiy')}</option>
              <option value="orindoshlik">
                {t('contractsCreate.contractTypeOptions.orindoshlik')}
              </option>
              <option value="boshqa">{t('contractsCreate.contractTypeOptions.boshqa')}</option>
            </select>
            {errors.contract_type && <span className="error-text">{errors.contract_type}</span>}
          </div>

          <div className="form-group">
            <label>
              {t('contractsCreate.contractConclusionTerm')} <span className="required">*</span>
            </label>
            <select
              value={formData.contract_conclusion_term}
              onChange={(e) =>
                setFormData({ ...formData, contract_conclusion_term: e.target.value })
              }
              className={errors.contract_conclusion_term ? 'error' : ''}
            >
              <option value="">{t('contractsCreate.select')}</option>
              <option value="nomuayyan">
                {t('contractsCreate.conclusionTermOptions.nomuayyan')}
              </option>
              <option value="muayyan3">
                {t('contractsCreate.conclusionTermOptions.muayyan3')}
              </option>
              <option value="vaqtinchalik">
                {t('contractsCreate.conclusionTermOptions.vaqtinchalik')}
              </option>
              <option value="mavsumiy">
                {t('contractsCreate.conclusionTermOptions.mavsumiy')}
              </option>
            </select>
          </div>

          <div className="form-group">
            <label>
              {t('contractsCreate.salaryType')} <span className="required">*</span>
            </label>
            <select
              value={formData.salary_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salary_type: e.target.value,
                  salary_basis: '',
                  salary_percent: '',
                })
              }
              className={errors.salary_type ? 'error' : ''}
            >
              <option value="">{t('contractsCreate.select')}</option>
              <option value="shtat">{t('contractsCreate.salaryTypeOptions.shtat')}</option>
              <option value="foiz">{t('contractsCreate.salaryTypeOptions.foiz')}</option>
              <option value="soat">{t('contractsCreate.salaryTypeOptions.soat')}</option>
            </select>
          </div>
        </div>

        {/* Oylik hisoblash asosi — "Shartnoma uchun oylik turi" tanloviga bog'liq */}
        {formData.salary_type === 'foiz' && (
          <div className="crow crow-3">
            <div className="form-group">
              <label>
                {t('contractsCreate.salaryPercent')} <span className="required">*</span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="%"
                value={formData.salary_percent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salary_percent: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                className={errors.salary_percent ? 'error' : ''}
              />
              {errors.salary_percent && <span className="error-text">{errors.salary_percent}</span>}
            </div>
          </div>
        )}

        {salaryBasisOptions.length > 0 && (
          <div className="crow crow-3">
            <div className="form-group">
              <label>
                {t('contractsCreate.salaryBasis')} <span className="required">*</span>
              </label>
              <select
                value={formData.salary_basis}
                onChange={(e) => setFormData({ ...formData, salary_basis: e.target.value })}
                className={errors.salary_basis ? 'error' : ''}
              >
                <option value="">{t('contractsCreate.select')}</option>
                {salaryBasisOptions.map((key) => (
                  <option key={key} value={key}>
                    {t(`contractsCreate.salaryBasisOptions.${key}`)}
                  </option>
                ))}
              </select>
              {errors.salary_basis && <span className="error-text">{errors.salary_basis}</span>}
            </div>
          </div>
        )}

        {/* Shartnoma muddati | Sinov muddati | Sinov muddati kunda */}
        <div className="crow crow-3">
          <div className="form-group">
            <label>
              {t('contractsCreate.contractDuration')} <span className="required">*</span>
            </label>
            <input
              type="text"
              placeholder={t('contractsCreate.inputPlaceholder')}
              value={formData.contract_duration}
              onChange={(e) => setFormData({ ...formData, contract_duration: e.target.value })}
              className={errors.contract_duration ? 'error' : ''}
            />
          </div>

          <div className="form-group">
            <label>
              {t('contractsCreate.probation')} <span className="required">*</span>
            </label>
            <select
              value={formData.probation_choice}
              onChange={(e) => {
                const v = e.target.value as '' | 'sinovsiz' | 'sinov';
                setFormData({
                  ...formData,
                  probation_choice: v,
                  probation_enabled: v === 'sinov',
                  probation_days: v === 'sinov' ? formData.probation_days : '',
                });
              }}
              className={errors.probation_choice ? 'error' : ''}
            >
              <option value="">{t('contractsCreate.select')}</option>
              <option value="sinovsiz">{t('contractsCreate.probationOptions.none')}</option>
              <option value="sinov">{t('contractsCreate.probationOptions.yes')}</option>
            </select>
          </div>

          {formData.probation_choice === 'sinov' && (
            <div className="form-group">
              <label>
                {t('contractsCreate.probationDays')} <span className="required">*</span>
              </label>
              <input
                type="number"
                value={formData.probation_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    probation_days: Number(e.target.value),
                  })
                }
                className={errors.probation_days ? 'error' : ''}
              />
            </div>
          )}
        </div>

        {/* Umumiy ish soati (oylik) | Asosiy maosh | Soatlik maosh */}
        <div className="crow crow-3">
          <div className="form-group">
            <label>
              {t('contractsCreate.workingHours')} <span className="required">*</span>
            </label>
            <input
              type="number"
              value={formData.working_hours}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  working_hours: e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              className={errors.working_hours ? 'error' : ''}
            />
          </div>

          <div className="form-group">
            <label>
              {t('contractsCreate.baseSalary')} <span className="required">*</span>
            </label>
            <input
              type="number"
              value={formData.base_salary}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  base_salary: Number(e.target.value),
                })
              }
              className={errors.base_salary ? 'error' : ''}
            />
          </div>

          <div className="form-group">
            <label>{t('contractsCreate.hourlyRate')}</label>
            <input type="text" value={hourlyRate} readOnly disabled />
          </div>
        </div>

        {/* Qo'shimcha topshiriq | Maosh + Izoh */}
        <div className="dynamic-section">
          <h3>{t('contractsCreate.additionalTasks')}</h3>
          {formData.additional_tasks.map((task, idx) => (
            <div key={idx} className="task-item">
              <button
                type="button"
                className="remove-dynamic-btn task-remove"
                onClick={() =>
                  setFormData({
                    ...formData,
                    additional_tasks: formData.additional_tasks.filter((_, i) => i !== idx),
                  })
                }
              >
                <i className="fas fa-trash"></i>
              </button>
              <div className="crow crow-2">
                <div className="form-group">
                  <label>{t('contractsCreate.task')}</label>
                  <select
                    value={task.task_id}
                    onChange={(e) => updateTask(idx, { task_id: Number(e.target.value) })}
                  >
                    <option value={0}>{t('contractsCreate.selectPlaceholder')}</option>
                    <option value={1}>Monitoring</option>
                    <option value={2}>Adminstrator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('contractsCreate.salary')}</label>
                  <input
                    type="number"
                    value={task.salary}
                    onChange={(e) =>
                      updateTask(idx, {
                        salary: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="crow crow-1">
                <div className="form-group">
                  <label>{t('contractsCreate.comment')}</label>
                  <input
                    type="text"
                    value={task.comment}
                    onChange={(e) => updateTask(idx, { comment: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="add-dynamic-btn"
            onClick={() => handleAddField('additional_tasks')}
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>

        {/* Jami oylik maosh */}
        <div className="crow crow-1">
          <div className="form-group">
            <label>{t('contractsCreate.totalSalary')}</label>
            <input
              type="text"
              value={totalMonthlySalary.toFixed(2)}
              readOnly
              disabled
              style={{ background: '#f8fafc', fontWeight: 'bold' }}
            />
          </div>
        </div>

        {/* Maosh boshlanish sanasi | Maosh tugash sanasi */}
        <div className="crow crow-2">
          <div className="form-group">
            <label>
              {t('contractsCreate.salaryPeriodStart')} <span className="required">*</span>
            </label>
            <DateInput
              value={formData.salary_period_start}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salary_period_start: e.target.value,
                })
              }
              className={errors.salary_period_start ? 'error' : ''}
            />
          </div>
          <div className="form-group">
            <label>
              {t('contractsCreate.salaryPeriodEnd')} <span className="required">*</span>
            </label>
            <DateInput
              value={formData.salary_period_end}
              min={formData.salary_period_start || undefined}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, salary_period_end: val });
                if (formData.salary_period_start && val) {
                  if (new Date(val) <= new Date(formData.salary_period_start)) {
                    setErrors((prev) => ({
                      ...prev,
                      salary_period_end: t('contractsValidation.mustBeGreater'),
                    }));
                  } else {
                    setErrors((prev) => {
                      const newE = { ...prev };
                      delete newE.salary_period_end;
                      return newE;
                    });
                  }
                }
              }}
              className={errors.salary_period_end ? 'error' : ''}
            />
            {errors.salary_period_end && (
              <span className="error-text">{errors.salary_period_end}</span>
            )}
          </div>
        </div>

        {/* Mehnat ta'tili | Ta'til kuni | Ta'til kuni uchun maosh */}
        <div className="crow crow-3">
          <div className="form-group">
            <label>
              {t('contractsCreate.vacationType')} <span className="required">*</span>
            </label>
            <select
              value={formData.vacation_type}
              onChange={(e) => {
                const v = e.target.value;
                setFormData({
                  ...formData,
                  vacation_type: v,
                  vacation_enabled: v === 'beriladi',
                  vacation_days: v === 'beriladi' ? formData.vacation_days : '',
                  vacation_payment: v === 'beriladi' ? formData.vacation_payment : '',
                });
              }}
              className={errors.vacation_type ? 'error' : ''}
            >
              <option value="">{t('contractsCreate.select')}</option>
              <option value="beriladi">{t('contractsCreate.vacationOptions.given')}</option>
              <option value="berilmaydi">{t('contractsCreate.vacationOptions.notGiven')}</option>
            </select>
            {errors.vacation_type && <span className="error-text">{errors.vacation_type}</span>}
          </div>

          {formData.vacation_enabled && (
            <>
              <div className="form-group">
                <label>
                  {t('contractsCreate.vacationDays')} <span className="required">*</span>
                </label>
                <input
                  type="number"
                  value={formData.vacation_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vacation_days: Number(e.target.value),
                    })
                  }
                  className={errors.vacation_days ? 'error' : ''}
                />
              </div>
              <div className="form-group">
                <label>
                  {t('contractsCreate.vacationPayment')} <span className="required">*</span>
                </label>
                <input
                  type="number"
                  value={formData.vacation_payment}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vacation_payment: Number(e.target.value),
                    })
                  }
                  className={errors.vacation_payment ? 'error' : ''}
                />
              </div>
            </>
          )}
        </div>

        {/* Telefon raqam */}
        <div className="dynamic-section">
          <label>
            {t('contractsCreate.phone')} <span className="required">*</span>
          </label>
          {formData.phones.map((phone, idx) => (
            <div key={idx} className="dynamic-item" style={{ gridTemplateColumns: '1fr 50px' }}>
              <input
                type="text"
                value={phone}
                onChange={(e) => updatePhone(idx, e.target.value)}
                className={errors.phone && idx === 0 ? 'error' : ''}
              />
              {idx > 0 && (
                <button
                  type="button"
                  className="remove-dynamic-btn"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      phones: formData.phones.filter((_, i) => i !== idx),
                    })
                  }
                >
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="add-dynamic-btn"
            onClick={() => handleAddField('phones')}
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>

        {/* Yashash joyi (Ro'yxatga olingan manzili) | Yashash joyi */}
        <div className="crow crow-2">
          <div className="form-group">
            <label>
              {t('contractsCreate.addressReg')} <span className="required">*</span>
            </label>
            <textarea
              value={formData.address_reg}
              onChange={(e) => setFormData({ ...formData, address_reg: e.target.value })}
              className={errors.address_reg ? 'error' : ''}
            />
          </div>
          <div className="form-group">
            <label>
              {t('contractsCreate.addressCurrent')} <span className="required">*</span>
            </label>
            <textarea
              value={formData.address_current}
              onChange={(e) => setFormData({ ...formData, address_current: e.target.value })}
              className={errors.address_current ? 'error' : ''}
            />
          </div>
        </div>

        {isCameraOpen && (
          <CameraModal
            onClose={() => setIsCameraOpen(false)}
            onCapture={(file, preview) => {
              setFormData((prev) => ({
                ...prev,
                photo: file,
                photo_preview: preview,
              }));
            }}
          />
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-save" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? t('contractsCreate.saving') : t('contractsCreate.save')}
          </button>
          <button
            type="button"
            className="btn btn-cancel"
            onClick={() => {
              if (onCancel) onCancel();
              else navigate('/contracts');
            }}
          >
            {t('contractsCreate.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ContractsCreate;
