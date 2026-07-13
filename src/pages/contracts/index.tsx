import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { API } from "../../api/api";
import "./contracts.css";
import { useTranslation } from "react-i18next";
import { getLocalized } from "../../utils/getLocalized";
import ContractsCreate from "./ContractsCreate";
import { Protected } from "@/components/Protected";
import { formatDate as formatDisplayDate } from "@/utils/date";
import { printFromDocxTemplate } from "@/utils/contractPdf";
import { buildEmployeeContractData } from "@/utils/employeeContractPdf";
import employmentTemplate from "@/assets/documents/ILM_PLYUS_Mehnat_shartnomasi_TEMPLATE.docx?url";

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

interface Department {
  id: number;
  name_uz: string | null;
  name_ru: string | null;
  name_en: string | null;
  code?: string;
}

interface BranchRekvizit {
  id: number;
  name_uz?: string | null;
  legal_name?: string | null;
  city?: string | null;
  address_uz?: string | null;
  legal_address_uz?: string | null;
  inn?: string | null;
  phone?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  mfo?: string | null;
  director_name?: string | null;
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
  department: Department;
  position_id: number;
  position?: {
    id: number;
    name_uz: string | null;
    name_ru: string | null;
    name_en: string | null;
  };
  contract_type: string;
  contract_duration_months?: string | null;
  monthly_salary_type?: string | null;
  work_start_date?: string | null;
  vacation_type: string;
  vacation_days?: number | string | null;
  working_hours_monthly: string;
  hourly_rate: string;
  total_monthly_salary: string;
  salary_start_date: string;
  salary_end_date: string;
  signed_by: string;
  language: string;
  probation_period: string | null;
  probation_end_date: string | null;
  /** Word shablonidagi NTM rekvizitlari (STIR, MFO, bank, H/R, rahbar) uchun. */
  branch?: BranchRekvizit;
}

const Contracts: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editContract, setEditContract] = useState<{
    employeeId: number;
    contractId: number;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [busyDoc, setBusyDoc] = useState<{
    contractId: number;
    mode: "pdf" | "print";
  } | null>(null);

  const {
    data: contracts,
    isLoading,
    isError,
  } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data } = await API.get("/contracts");
      return data;
    },
  });

  const processedData = useMemo(() => {
    if (!contracts) return [];
    // Eng oxirgi qo'shilgan shartnoma jadval boshida turishi kerak. sortByNewest
    // avval `created_at` ga qaraydi, u esa bu yerda ishonchli emas — id bo'yicha saralaymiz.
    return [...contracts].sort((a, b) => b.id - a.id);
  }, [contracts]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  const deleteMutation = useMutation({
    mutationFn: async ({
      employeeId,
      contractId,
    }: {
      employeeId: number;
      contractId: number;
    }) => {
      await API.delete(`/employees/${employeeId}/contracts/${contractId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });

  const handleDelete = (employeeId: number, contractId: number) => {
    if (window.confirm(t("contracts.deleteConfirm"))) {
      deleteMutation.mutate({ employeeId, contractId });
    }
  };
  // Delete tugmasi izohga olingan; tugma qaytarilganda quyidagi qatorni o'chirish kerak
  void handleDelete;

  /**
   * Mehnat shartnomasini Word shabloni asosida PDF/chop etishga uzatadi.
   * Jadvaldagi shartnoma obyekti to'liq ishlatiladi — alohida so'rov yuborilmaydi
   * (backendda GET /contracts/{id} yo'q).
   *
   * O'quvchi shartnomalari bilan bir xil `printFromDocxTemplate` chaqiriladi,
   * shuning uchun PDF/print parametrlari aynan bir xil bo'ladi.
   */
  const handleGenerate = async (contract: Contract, mode: "pdf" | "print") => {
    setBusyDoc({ contractId: contract.id, mode });
    try {
      await printFromDocxTemplate(
        employmentTemplate,
        buildEmployeeContractData(contract),
        String(contract.contract_number ?? contract.id),
        mode,
      );
    } catch (err) {
      console.error(`${mode} xatosi:`, err);
      alert(t(mode === "pdf" ? "contracts.pdfError" : "contracts.printError"));
    } finally {
      setBusyDoc(null);
    }
  };

  const formatDate = (dateStr: string) => formatDisplayDate(dateStr, "-");

  if (isCreating) {
    return (
      <ContractsCreate
        onCancel={() => setIsCreating(false)}
        onSuccess={() => setIsCreating(false)}
      />
    );
  }

  if (editContract) {
    return (
      <ContractsCreate
        employeeId={editContract.employeeId}
        contractId={editContract.contractId}
        onCancel={() => setEditContract(null)}
        onSuccess={() => setEditContract(null)}
      />
    );
  }

  return (
    <div className="contracts-container container">
      <div className="contracts-header">
        <h1>
          <div className="icon-box">
            <i className="fas fa-file-contract"></i>
          </div>
          {t("contracts.title")}
        </h1>
        <button className="btn btn-save" onClick={() => setIsCreating(true)}>
          <i className="fas fa-plus"></i> {t("contracts.newContract")}
        </button>
      </div>

      <div className="contracts-table-card">
        <table className="contracts-table">
          <thead>
            <tr>
              <th>{t("contracts.table.id")}</th>
              <th>{t("contracts.table.fullName")}</th>
              <th>{t("contracts.table.phone")}</th>
              <th>{t("contracts.table.department")}</th>
              <th>{t("contracts.table.status")}</th>
              <th>{t("contracts.table.startDate")}</th>
              <th>{t("contracts.table.endDate")}</th>
              <th>{t("contracts.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} align="center">
                  {t("contracts.loading")}
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} align="center">
                  {t("contracts.error")}
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} align="center">
                  {t("contracts.noData")}
                </td>
              </tr>
            ) : (
              paginatedData?.map((contract) => {
                const emp = contract.employee || {};
                return (
                  <tr key={contract.id}>
                    <td>{contract.id}</td>
                    <td>
                      {emp.full_name ||
                        `${emp.last_name || ""} ${emp.first_name || ""} ${emp.middle_name || ""}`.trim() ||
                        "-"}
                    </td>
                    <td>{emp.phone || "-"}</td>
                    <td>
                      {getLocalized(contract.department, "name", i18n.language)}
                    </td>
                    <td>
                      <span className={`badge ${contract.status}`}>
                        {contract.status === "active"
                          ? t("contracts.status.active")
                          : t("contracts.status.inactive")}
                      </span>
                    </td>
                    <td>{formatDate(contract.contract_start_date)}</td>
                    <td>{formatDate(contract.contract_end_date)}</td>
                    <td>
                      <div className="action-btns">
                        <div
                          className="action-icon view-icon"
                          onClick={() => navigate(`/contracts/${contract.id}`)}
                          title={t("contracts.actions.view")}
                        >
                          <i className="fas fa-eye"></i>
                        </div>
                        <Protected permission="employee_contracts.edit">
                          <div
                            className="action-icon edit-icon"
                            onClick={() =>
                              setEditContract({
                                employeeId: emp.id,
                                contractId: contract.id,
                              })
                            }
                            title={t("contracts.actions.edit")}
                          >
                            <i className="fas fa-pen"></i>
                          </div>
                        </Protected>
                        <Protected permission="employee_contracts.edit">
                          <div
                            className="action-icon salary-icon"
                            onClick={() => navigate(`/contracts/${contract.id}?action=salary`)}
                            title={t("contracts.actions.salary")}
                          >
                            <i className="fas fa-coins"></i>
                          </div>
                        </Protected>
                        <div
                          className="action-icon pdf-icon"
                          onClick={() => !busyDoc && handleGenerate(contract, "pdf")}
                          title={t("contracts.actions.pdf")}
                          style={{
                            pointerEvents: busyDoc ? "none" : "auto",
                            opacity: busyDoc ? 0.5 : 1,
                          }}
                        >
                          <i
                            className={
                              busyDoc?.contractId === contract.id && busyDoc.mode === "pdf"
                                ? "fas fa-spinner fa-spin"
                                : "fas fa-file-pdf"
                            }
                          ></i>
                        </div>
                        <div
                          className="action-icon print-icon"
                          onClick={() => !busyDoc && handleGenerate(contract, "print")}
                          title={t("contracts.actions.print")}
                          style={{
                            pointerEvents: busyDoc ? "none" : "auto",
                            opacity: busyDoc ? 0.5 : 1,
                          }}
                        >
                          <i
                            className={
                              busyDoc?.contractId === contract.id && busyDoc.mode === "print"
                                ? "fas fa-spinner fa-spin"
                                : "fas fa-print"
                            }
                          ></i>
                        </div>
                        {/* Delete tugmasi vaqtincha yopilgan, kerak bo'lganda izohdan chiqariladi
                        <Protected permission="employee_contracts.delete">
                          <div
                            className="action-icon delete-icon"
                            onClick={() => handleDelete(emp.id, contract.id)}
                            title={t("contracts.actions.delete")}
                            style={{
                              pointerEvents: deleteMutation.isPending ? "none" : "auto",
                              opacity: deleteMutation.isPending ? 0.5 : 1,
                            }}
                          >
                            <i className="fas fa-trash"></i>
                          </div>
                        </Protected>
                        */}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && processedData.length > 0 && (
        <div className="pagination-container">
          <div className="page-size-selector">
            <span>{t("contracts.show")}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 15, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>{t("contracts.perPage")}</span>
          </div>

          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <i className="fas fa-chevron-left"></i>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
              )
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span>...</span>}
                  <button
                    className={`page-btn ${currentPage === p ? "active" : ""}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}

            <button
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;
