﻿import React from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '../../utils/getLocalized';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  full_name: string;
  phone: string;
  birth_date: string;
  pinfl: string;
  citizenship: string;
  passport_series: string;
  passport_number: string;
  passport_given_date: string;
  passport_given_by: string;
  address_registration: string;
  address_living: string;
  photo_url?: string;
  branch_id?: number;
}

interface Contract {
  id: number;
  employee_id: number;
  contract_number: number;
  contract_date: string;
  contract_start_date: string;
  contract_end_date: string;
  status: string;
  base_salary: string;
  employee: Employee;
  department: {
    id: number;
    name_uz: string | null;
    name_ru: string | null;
    name_en: string | null;
  };
  position_id: number;
  position?: {
    id: number;
    name_uz: string | null;
    name_ru: string | null;
    name_en: string | null;
  };
  contract_type: string;
  vacation_type: string;
  working_hours_monthly: string;
  hourly_rate: string;
  total_monthly_salary: string;
  salary_start_date: string;
  salary_end_date: string;
  signed_by: string;
  language: string;
  probation_period: string | null;
  probation_end_date: string | null;
}

interface Props {
  contract: Contract;
  onClose: () => void;
}

const ContractDetail: React.FC<Props> = ({ contract, onClose }) => {
  const { t, i18n } = useTranslation();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  const emp = contract.employee;

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        <div className="detail-section">
          <h2 className="detail-section-title">
            <i className="fas fa-user"></i> {t('contracts.personalInfo')}
          </h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">{t('contracts.fullName')}</span>
              <span className="detail-value">
                {emp.full_name || `${emp.last_name} ${emp.first_name} ${emp.middle_name}`}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">PINFL</span>
              <span className="detail-value">{emp.pinfl || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.birthDate')}</span>
              <span className="detail-value">{formatDate(emp.birth_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.phone')}</span>
              <span className="detail-value">{emp.phone}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.citizenship')}</span>
              <span className="detail-value">{emp.citizenship}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.language')}</span>
              <span className="detail-value">{contract.language || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">
            <i className="fas fa-id-card"></i> {t('contracts.passportInfo')}
          </h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">{t('contracts.serialNumber')}</span>
              <span className="detail-value">
                {emp.passport_series} {emp.passport_number}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.issuedDate')}</span>
              <span className="detail-value">{formatDate(emp.passport_given_date)}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
              <span className="detail-label">{t('contracts.issuedBy')}</span>
              <span className="detail-value">{emp.passport_given_by}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">
            <i className="fas fa-briefcase"></i> {t('contracts.workplaceContract')}
          </h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">{t('contracts.contractNumber')}</span>
              <span className="detail-value">{contract.contract_number}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.department')}</span>
              <span className="detail-value">
                {getLocalized(contract.department, 'name', i18n.language)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.position')}</span>
              <span className="detail-value">
                {contract.position
                  ? getLocalized(contract.position, 'name', i18n.language)
                  : t('contracts.employee')}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.tableStatus')}</span>
              <span className={`badge ${contract.status}`}>
                {contract.status === 'active' ? t('contracts.statusActive') : t('contracts.statusInactive')}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.tableStartDate')}</span>
              <span className="detail-value">{formatDate(contract.contract_start_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.tableEndDate')}</span>
              <span className="detail-value">{formatDate(contract.contract_end_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.contractType')}</span>
              <span className="detail-value">{contract.contract_type}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.probationPeriod')}</span>
              <span className="detail-value">{contract.probation_period || t('contracts.no')}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">
            <i className="fas fa-money-bill-wave"></i> {t('contracts.salaryWorkTime')}
          </h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">{t('contracts.baseSalary')}</span>
              <span className="detail-value">
                {Number(contract.base_salary).toLocaleString()} UZS
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.monthlyWorkHours')}</span>
              <span className="detail-value">{contract.working_hours_monthly} {t('contracts.hours')}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.hourlyRate')}</span>
              <span className="detail-value">
                {Number(contract.hourly_rate).toLocaleString()} UZS
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.totalMonthlySalary')}</span>
              <span className="detail-value" style={{ fontWeight: 'bold', color: '#fe9100' }}>
                {Number(contract.total_monthly_salary).toLocaleString()} UZS
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.salaryPeriod')}</span>
              <span className="detail-value">
                {formatDate(contract.salary_start_date)} - {formatDate(contract.salary_end_date)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('contracts.vacationType')}</span>
              <span className="detail-value">{contract.vacation_type || t('contracts.notAvailable')}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">
            <i className="fas fa-map-marker-alt"></i> {t('contracts.addressInfo')}
          </h2>
          <div className="detail-grid">
            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
              <span className="detail-label">{t('contracts.registeredAddress')}</span>
              <span className="detail-value">{emp.address_registration}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
              <span className="detail-label">{t('contracts.livingAddress')}</span>
              <span className="detail-value">{emp.address_living}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDetail;
