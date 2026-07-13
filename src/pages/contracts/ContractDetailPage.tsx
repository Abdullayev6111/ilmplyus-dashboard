import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "../../api/api";
import { useTranslation } from "react-i18next";
import { getLocalized } from "../../utils/getLocalized";
import { Protected } from "../../components/Protected";
import "./contracts.css";
import DateInput from '@/components/DateInput';
import { formatDate as formatDisplayDate } from '@/utils/date';

interface Contract {
  id: number;
  employee_id: number;
  contract_number: number;
  contract_date: string;
  contract_start_date: string;
  contract_end_date: string;
  status: string;
  base_salary: string;
  employee: {
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
  };
  department: { id: number; name_uz: string | null; name_ru: string | null; name_en: string | null };
  position_id: number;
  position?: { id: number; name_uz: string | null; name_ru: string | null; name_en: string | null };
  contract_type: string;
  contract_duration_months: string | null;
  monthly_salary_type: string | null;
  work_start_date: string | null;
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

type PendingAction = "terminate" | "cancel" | "activate" | null;

const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionDate, setActionDate] = useState("");

  const statusLabel: Record<string, string> = {
    active: t("contracts.status.active"),
    inactive: t("contracts.status.inactive"),
    terminated: t("contracts.status.terminated"),
    cancelled: t("contracts.status.cancelled"),
  };

  // Map the stored option codes back to their human-readable labels (reusing
  // the create-form option translations) for display on the detail page.
  const contractTypeLabels: Record<string, string> = {
    asosiy: t("contractsCreate.contractTypeOptions.asosiy"),
    orindoshlik: t("contractsCreate.contractTypeOptions.orindoshlik"),
    boshqa: t("contractsCreate.contractTypeOptions.boshqa"),
  };
  const conclusionTermLabels: Record<string, string> = {
    nomuayyan: t("contractsCreate.conclusionTermOptions.nomuayyan"),
    muayyan3: t("contractsCreate.conclusionTermOptions.muayyan3"),
    vaqtinchalik: t("contractsCreate.conclusionTermOptions.vaqtinchalik"),
    mavsumiy: t("contractsCreate.conclusionTermOptions.mavsumiy"),
  };
  const salaryTypeLabels: Record<string, string> = {
    shtat: t("contractsCreate.salaryTypeOptions.shtat"),
    oquvchi: t("contractsCreate.salaryTypeOptions.oquvchi"),
    soat: t("contractsCreate.salaryTypeOptions.soat"),
  };
  const vacationTypeLabels: Record<string, string> = {
    beriladi: t("contractsCreate.vacationOptions.given"),
    berilmaydi: t("contractsCreate.vacationOptions.notGiven"),
  };

  const actionLabels: Record<NonNullable<PendingAction>, string> = {
    terminate: t("contracts.detail.terminateDateLabel"),
    cancel: t("contracts.detail.cancelDateLabel"),
    activate: t("contracts.detail.activateDateLabel"),
  };

  const { data: contract, isLoading } = useQuery<Contract>({
    queryKey: ["contracts", id],
    queryFn: async () => {
      const cached = queryClient
        .getQueryData<Contract[]>(["contracts"])
        ?.find((c) => String(c.id) === id);
      if (cached) return cached;
      const { data } = await API.get(`/contracts/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const mutate = (endpoint: string, date: string) =>
    API.patch(`/employees/${contract!.employee.id}/contracts/${contract!.id}/${endpoint}`, { date });

  const actionMutation = useMutation({
    mutationFn: ({ action, date }: { action: string; date: string }) =>
      mutate(action, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      navigate("/contracts");
    },
  });

  const confirmAction = () => {
    if (!actionDate || !pendingAction) return;
    const endpointMap: Record<string, string> = {
      terminate: "terminate",
      cancel: "cancel",
      activate: "activate",
    };
    actionMutation.mutate({ action: endpointMap[pendingAction], date: actionDate });
  };

  if (isLoading || !contract) {
    return <div className="contracts-container container" style={{ paddingTop: 80 }}>{t("contracts.detail.loading")}</div>;
  }

  const formatDate = (s: string | null | undefined) => formatDisplayDate(s, "-");
  const emp = contract.employee;
  const status = contract.status;

  return (
    <div className="contracts-container container">
      <div className="contracts-header">
        <h1>
          <div className="icon-box">
            <i className="fas fa-file-contract"></i>
          </div>
          {t("contracts.detail.titlePrefix")}{contract.contract_number}
        </h1>
        <button className="btn btn-cancel" onClick={() => navigate("/contracts")}>
          <i className="fas fa-arrow-left"></i> {t("contracts.detail.back")}
        </button>
      </div>

      {(status === "active" || (status !== "terminated" && status !== "cancelled")) && (
        <div className="detail-actions detail-actions--top">
          {status === "active" && (
            <>
              <Protected permission="employee_contracts.set_inactive">
                <button className="btn btn-detail-cancel" onClick={() => { setPendingAction("cancel"); setActionDate(""); }}>
                  <i className="fas fa-times-circle"></i> {t("contracts.detail.cancelAction")}
                </button>
              </Protected>
              <Protected permission="employee_contracts.terminate">
                <button className="btn btn-detail-terminate" onClick={() => { setPendingAction("terminate"); setActionDate(""); }}>
                  <i className="fas fa-ban"></i> {t("contracts.detail.terminateAction")}
                </button>
              </Protected>
            </>
          )}
          {status !== "active" && (
            <button className="btn btn-detail-activate" onClick={() => { setPendingAction("activate"); setActionDate(""); }}>
              <i className="fas fa-check-circle"></i> {t("contracts.detail.activateAction")}
            </button>
          )}
        </div>
      )}

      {pendingAction && (
        <div className="detail-date-picker">
          <label className="detail-date-label">
            <i className="fas fa-calendar-alt"></i> {actionLabels[pendingAction]}
          </label>
          <div className="detail-date-row">
            <DateInput
              className="detail-date-input"
              value={actionDate}
              onChange={(e) => setActionDate(e.target.value)}
            />
            <button className="btn btn-save" onClick={confirmAction} disabled={!actionDate || actionMutation.isPending}>
              {t("contracts.detail.confirm")}
            </button>
            <button className="btn btn-cancel" onClick={() => { setPendingAction(null); setActionDate(""); }}>
              {t("contracts.detail.cancel")}
            </button>
          </div>
        </div>
      )}

      <div className="contracts-form">
        <div className="detail-section">
          <h2 className="detail-section-title">
            <i className="fas fa-user"></i> {t("contracts.detail.sections.personal")}
          </h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.fullName")}</span>
              <span className="detail-value">{emp.full_name || `${emp.last_name} ${emp.first_name} ${emp.middle_name}`}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.pinfl")}</span>
              <span className="detail-value">{emp.pinfl || "-"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.birthDate")}</span>
              <span className="detail-value">{formatDate(emp.birth_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.phone")}</span>
              <span className="detail-value">{emp.phone}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.citizenship")}</span>
              <span className="detail-value">{emp.citizenship}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.language")}</span>
              <span className="detail-value">{contract.language || t("contracts.detail.values.naLanguage")}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">
            <i className="fas fa-id-card"></i> {t("contracts.detail.sections.passport")}
          </h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.passportSeries")}</span>
              <span className="detail-value">{emp.passport_series} {emp.passport_number}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.passportGivenDate")}</span>
              <span className="detail-value">{formatDate(emp.passport_given_date)}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: "span 2" }}>
              <span className="detail-label">{t("contracts.detail.fields.passportGivenBy")}</span>
              <span className="detail-value">{emp.passport_given_by}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">
            <i className="fas fa-briefcase"></i> {t("contracts.detail.sections.workplace")}
          </h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.contractNumber")}</span>
              <span className="detail-value">{contract.contract_number}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.department")}</span>
              <span className="detail-value">{getLocalized(contract.department, "name", i18n.language)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.position")}</span>
              <span className="detail-value">{contract.position ? getLocalized(contract.position, "name", i18n.language) : t("contracts.detail.values.defaultPosition")}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.status")}</span>
              <span className={`badge ${status}`}>{statusLabel[status] ?? status}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.workStartDate")}</span>
              <span className="detail-value">{formatDate(contract.work_start_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.startDate")}</span>
              <span className="detail-value">{formatDate(contract.contract_start_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.endDate")}</span>
              <span className="detail-value">{formatDate(contract.contract_end_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.contractType")}</span>
              <span className="detail-value">{contractTypeLabels[contract.contract_type] || contract.contract_type}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.contractDuration")}</span>
              <span className="detail-value">{contract.contract_duration_months ? (conclusionTermLabels[contract.contract_duration_months] || contract.contract_duration_months) : "—"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.salaryType")}</span>
              <span className="detail-value">{contract.monthly_salary_type ? (salaryTypeLabels[contract.monthly_salary_type] || contract.monthly_salary_type) : "—"}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.probation")}</span>
              <span className="detail-value">{contract.probation_period || t("contracts.detail.values.noProbation")}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">
            <i className="fas fa-money-bill-wave"></i> {t("contracts.detail.sections.salary")}
          </h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.baseSalary")}</span>
              <span className="detail-value">{Number(contract.base_salary).toLocaleString()} UZS</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.workingHours")}</span>
              <span className="detail-value">{contract.working_hours_monthly} {t("contracts.detail.values.hours")}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.hourlyRate")}</span>
              <span className="detail-value">{Number(contract.hourly_rate).toLocaleString()} UZS</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.totalSalary")}</span>
              <span className="detail-value" style={{ fontWeight: "bold", color: "#fe9100" }}>
                {Number(contract.total_monthly_salary).toLocaleString()} UZS
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.salaryPeriod")}</span>
              <span className="detail-value">{formatDate(contract.salary_start_date)} — {formatDate(contract.salary_end_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t("contracts.detail.fields.vacationType")}</span>
              <span className="detail-value">{contract.vacation_type ? (vacationTypeLabels[contract.vacation_type] || contract.vacation_type) : t("contracts.detail.values.noVacation")}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h2 className="detail-section-title">
            <i className="fas fa-map-marker-alt"></i> {t("contracts.detail.sections.address")}
          </h2>
          <div className="detail-grid">
            <div className="detail-item" style={{ gridColumn: "span 2" }}>
              <span className="detail-label">{t("contracts.detail.fields.addressRegistration")}</span>
              <span className="detail-value">{emp.address_registration}</span>
            </div>
            <div className="detail-item" style={{ gridColumn: "span 2" }}>
              <span className="detail-label">{t("contracts.detail.fields.addressLiving")}</span>
              <span className="detail-value">{emp.address_living}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractDetailPage;
