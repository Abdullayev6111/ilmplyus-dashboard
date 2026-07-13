import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "./studentsContracts.css";
import { API } from "@/api/api";
import useAuthStore from "@/store/useAuthStore";
import { isAdminUser } from "@/utils/isAdminUser";

interface ContractStudentDisplay {
  first_name?: string;
  last_name?: string;
  father_name?: string;
  birth_date?: string;
  jshshir?: string;
  is_minor?: boolean;
  has_passport?: boolean;
  birth_cert_series?: string;
  birth_cert_number?: string;
  passport_series?: string;
  passport_number?: string;
  passport_given_date?: string;
  passport_expiry_date?: string;
  phone?: string;
  extra_phones?: string[];
  registered_address?: string;
  residential_address?: string;
  monthly_price?: number | string;
  total_price?: number | string;
  course?: { name_uz?: string };
  level?: { name_uz?: string };
  group?: { name?: string };
}

const ContractDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isAdmin = isAdminUser(useAuthStore((s) => s.user));

  const {
    data: responseData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["student-contract", id],
    queryFn: () => API.get(`/student-contracts/${id}`).then((res) => res.data),
  });

  const contract = responseData?.contract || responseData?.data || responseData;

  /** Bekor qilish / tugatish — ilgari ro'yxatdagi "..." menyusida edi. */
  const statusMutation = useMutation({
    mutationFn: (action: "cancel" | "complete") =>
      API.post(`/student-contracts/${id}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-contract", id] });
      queryClient.invalidateQueries({ queryKey: ["student-contracts"] });
    },
  });

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getFullName = (person: { first_name?: string; last_name?: string; father_name?: string } | null) => {
    if (!person) return "";
    return `${person.last_name || ""} ${person.first_name || ""} ${person.father_name || ""}`.trim();
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case "in_progress":
        return "in_progress";
      case "completed":
        return "completed";
      case "canceled":
        return "canceled";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div
        className="container students-contract"
        style={{ marginTop: 50, marginLeft: 140 }}
      >
        <div style={{ textAlign: "center", padding: 40 }}>{t('studentsContract.details.loading')}</div>
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div
        className="container students-contract"
        style={{ marginTop: 50, marginLeft: 140 }}
      >
        <div style={{ textAlign: "center", padding: 40, color: "red" }}>
          {t('studentsContract.details.error')}
        </div>
      </div>
    );
  }

  // Yakunlangan shartnomani qayta bekor qilib/tugatib bo'lmaydi.
  // Backend `cancelled` deb qaytaradi, lekin bir joyda `canceled` ham uchraydi.
  const FINAL_STATUSES = ["cancelled", "canceled", "completed", "expired"];
  const isActionable = !FINAL_STATUSES.includes(contract.status);

  return (
    <div
      className="container students-contract"
      style={{ marginTop: 50, marginLeft: 140 }}
    >
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate("/students-contract")}
          style={{
            background: "transparent",
            border: "none",
            color: "#003366",
            cursor: "pointer",
            fontFamily: "noto-m",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <i className="fa-solid fa-arrow-left"></i> {t('studentsContract.details.back')}
        </button>

        {isAdmin && isActionable && (
          <div className="sc-details-actions">
            <button
              className="sc-details-action-btn cancel"
              onClick={() => statusMutation.mutate("cancel")}
              disabled={statusMutation.isPending}
            >
              <i className="fa-solid fa-ban"></i> {t('studentsContract.action.cancel')}
            </button>
            <button
              className="sc-details-action-btn terminate"
              onClick={() => statusMutation.mutate("complete")}
              disabled={statusMutation.isPending}
            >
              <i className="fa-solid fa-flag-checkered"></i> {t('studentsContract.action.terminate')}
            </button>
          </div>
        )}
      </div>

      <div className="sc-details-page">
        <div
          className="sc-details-header"
          style={{ flexDirection: "column", gap: 8 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <i
              className="fa-solid fa-file-lines"
              style={{ color: "#cbd5e1" }}
            ></i>
            <span className="sc-details-title">
              {t('studentsContract.details.title')} (#{String(contract.id).padStart(3, "0")})
            </span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <span
              className={`sc-status-badge ${getStatusType(contract.status)}`}
            >
              {responseData.status_label || t('studentsContract.details.statusUnknown')}
            </span>
            <span className="sc-status-badge purple">
              {responseData.type_label || t('studentsContract.details.typeUnknown')}
            </span>
            {contract.language && (
              <span className="sc-status-badge in_progress">
                {t('studentsContract.details.contractLang')}: {contract.language.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {contract.organization && (
          <div className="sc-details-section">
            <div className="sc-details-section-title">
              <i className="fa-solid fa-building"></i> {t('studentsContract.details.orgInfo')}
            </div>
            <div className="sc-details-grid">
              <div className="sc-details-item">
                <span className="sc-details-label">{t('studentsContract.details.orgName')}</span>
                <span className="sc-details-value">
                  {contract.organization.organization_name}
                </span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">{t('studentsContract.details.orgStir')}</span>
                <span className="sc-details-value">
                  {contract.organization.stir}
                </span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">{t('studentsContract.details.contractDate')}</span>
                <span className="sc-details-value">
                  {formatDateTime(
                    contract.contract_date || contract.created_at,
                  )}
                </span>
              </div>
              <div className="sc-details-item" style={{ gridColumn: "1 / -1" }}>
                <span className="sc-details-label">{t('studentsContract.details.directorFullName')}</span>
                <span className="sc-details-value">
                  {`${contract.organization.director_last_name || ""} ${contract.organization.director_first_name || ""} ${contract.organization.director_father_name || ""}`.trim()}
                </span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">{t('studentsContract.details.bankName')}</span>
                <span className="sc-details-value">
                  {contract.organization.bank_name}
                </span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">{t('studentsContract.details.bankAccount')}</span>
                <span className="sc-details-value">
                  {contract.organization.bank_account}
                </span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">{t('studentsContract.details.mfo')}</span>
                <span className="sc-details-value">
                  {contract.organization.mfo}
                </span>
              </div>
            </div>
          </div>
        )}

        {contract.representative && (
          <div className="sc-details-section">
            <div className="sc-details-section-title">
              <i className="fa-solid fa-user"></i> {t('studentsContract.details.repInfo')}
            </div>
            <div className="sc-details-grid">
              <div className="sc-details-item" style={{ gridColumn: "1 / -1" }}>
                <span className="sc-details-label">{t('studentsContract.details.repFullName')}</span>
                <span className="sc-details-value">
                  {getFullName(contract.representative)}
                </span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">{t('studentsContract.details.jshshir')}</span>
                <span className="sc-details-value">
                  {contract.representative.jshshir}
                </span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">
                  {t('studentsContract.details.passportSeriesNum')}
                </span>
                <span className="sc-details-value">
                  {contract.representative.passport_series}{" "}
                  {contract.representative.passport_number}
                </span>
              </div>
              <div className="sc-details-item"></div>
              <div className="sc-details-item">
                <span className="sc-details-label">{t('studentsContract.details.phone')}</span>
                <span className="sc-details-value">
                  {contract.representative.phone}
                </span>
              </div>
              <div className="sc-details-item" style={{ gridColumn: "2 / -1" }}>
                <span className="sc-details-label">{t('studentsContract.details.residentialAddress')}</span>
                <span className="sc-details-value">
                  {contract.representative.residential_address}
                </span>
              </div>
            </div>
          </div>
        )}

        {(contract.contract_students || []).length > 0 && (
          <div className="sc-details-section">
            <div className="sc-details-section-title">
              <i className="fa-solid fa-graduation-cap"></i> {t('studentsContract.details.studentInfo')}
            </div>
            {contract.contract_students.map((student: ContractStudentDisplay, idx: number) => (
              <div
                key={idx}
                className="sc-details-student-card"
                style={{ marginBottom: 16 }}
              >
                <div className="sc-details-grid">
                  <div
                    className="sc-details-item"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className="sc-details-label">{t('studentsContract.details.studentFullName')}</span>
                    <span className="sc-details-value">
                      {getFullName(student)}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">{t('studentsContract.details.birthDate')}</span>
                    <span className="sc-details-value">
                      {formatDateTime(student.birth_date)}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">{t('studentsContract.details.jshshir')}</span>
                    <span className="sc-details-value">
                      {student.jshshir || t('studentsContract.details.notEntered')}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">{t('studentsContract.details.isMinor')}</span>
                    <span className="sc-details-value">
                      {student.is_minor ? t('studentsContract.details.yes') : t('studentsContract.details.no')}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">
                      {t('studentsContract.details.certOrPassport')}
                    </span>
                    <span className="sc-details-value">
                      {student.birth_cert_series || student.passport_series}{" "}
                      {student.birth_cert_number || student.passport_number}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">{t('studentsContract.details.hasPassport')}</span>
                    <span className="sc-details-value">
                      {student.has_passport ? t('studentsContract.details.yes') : t('studentsContract.details.no')}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">{t('studentsContract.details.givenDate')}</span>
                    <span className="sc-details-value">
                      {formatDateTime(student.passport_given_date)}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">
                      {t('studentsContract.details.expiryDate')}
                    </span>
                    <span className="sc-details-value">
                      {formatDateTime(student.passport_expiry_date)}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">{t('studentsContract.details.phone')}</span>
                    <span className="sc-details-value">
                      {student.phone ? `${student.phone}` : t('studentsContract.details.notEntered')}
                    </span>
                  </div>
                  <div
                    className="sc-details-item"
                    style={{ gridColumn: "2 / -1" }}
                  >
                    <span className="sc-details-label">
                      {t('studentsContract.details.extraPhones')}
                    </span>
                    <span className="sc-details-value">
                      {student.extra_phones && student.extra_phones.length > 0
                        ? student.extra_phones
                            .map((p: string) => `${p}`)
                            .join(", ")
                        : t('studentsContract.details.notEntered')}
                    </span>
                  </div>
                  <div
                    className="sc-details-item"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className="sc-details-label">
                      {t('studentsContract.details.registeredAddress')}
                    </span>
                    <span className="sc-details-value">
                      {student.registered_address || t('studentsContract.details.notEntered')}
                    </span>
                  </div>
                  <div
                    className="sc-details-item"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className="sc-details-label">{t('studentsContract.details.residentialAddress')}</span>
                    <span className="sc-details-value">
                      {student.residential_address || t('studentsContract.details.notEntered')}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">{t('studentsContract.details.course')}</span>
                    <span className="sc-details-value">
                      {student.course?.name_uz ||
                        student.level?.name_uz ||
                        t('studentsContract.details.notEntered')}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">{t('studentsContract.details.group')}</span>
                    <span className="sc-details-value">
                      {student.group?.name || t('studentsContract.details.notEntered')}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">
                      {t('studentsContract.details.monthlyPrice')}
                    </span>
                    <span className="sc-details-value">
                      {student.monthly_price
                        ? `${Number(student.monthly_price).toLocaleString()} UZS`
                        : t('studentsContract.details.notEntered')}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">
                      {t('studentsContract.details.totalPrice')}
                    </span>
                    <span className="sc-details-value">
                      {student.total_price
                        ? `${Number(student.total_price).toLocaleString()} UZS`
                        : t('studentsContract.details.notEntered')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {contract.notes && (
          <div className="sc-details-section">
            <div className="sc-details-section-title">
              <i className="fa-solid fa-circle-info"></i> {t('studentsContract.details.notes')}
            </div>
            <div className="sc-details-student-card">
              <span className="sc-details-value">{contract.notes}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractDetails;
