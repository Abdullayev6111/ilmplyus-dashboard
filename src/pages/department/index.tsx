import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { API } from "../../api/api";
import { useTranslation } from "react-i18next";
import { getLocalized } from "../../utils/getLocalized";
import EmptyState from "../../components/EmptyState";
import "../branches/branches.css";
import type { Branch, DepartmentType, DepartmentPayload } from "../../types";
import { useEffect, useMemo, useState } from "react";

// --- API FUNCTIONS ---
const getBranches = async (): Promise<Branch[]> => {
  const { data } = await API.get("/branches");
  return data;
};

const getDepartments = async (): Promise<DepartmentType[]> => {
  const { data } = await API.get("/departments");
  return data;
};

const createDepartment = async (
  payload: DepartmentPayload,
): Promise<DepartmentType> => {
  const { data } = await API.post("/departments", payload);
  return data;
};

const updateDepartment = async (
  id: number,
  payload: DepartmentPayload,
): Promise<DepartmentType> => {
  const { data } = await API.put(`/departments/${id}`, payload);
  return data;
};

const deleteDepartment = async (id: number): Promise<void> => {
  await API.delete(`/departments/${id}`);
};

// --- MODAL COMPONENT ---
interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: DepartmentPayload, id?: number) => void;
  branches: Branch[];
  initialData?: DepartmentType | null;
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  branches,
  initialData,
}) => {
  const { t, i18n } = useTranslation();
  const [nameUz, setNameUz] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [branchId, setBranchId] = useState<number | "">("");
  const [manager, setManager] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isCodeModified, setIsCodeModified] = useState(false);

  useEffect(() => {
    if (initialData) {
      setNameUz(initialData.name_uz || "");
      setNameRu(initialData.name_ru || "");
      setNameEn(initialData.name_en || "");
      setCode(initialData.code);
      setBranchId(initialData.branch_id);
      setManager(initialData.manager || "");
      setIsActive(initialData.is_active);
      setIsCodeModified(true);
    } else {
      setNameUz("");
      setNameRu("");
      setNameEn("");
      setCode("");
      setBranchId("");
      setManager("");
      setIsActive(true);
      setIsCodeModified(false);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return;

    const payload: DepartmentPayload = {
      name_uz: nameUz,
      code,
      branch_id: Number(branchId),
      manager,
      is_active: isActive,
      ...(initialData && {
        name_ru: nameRu,
        name_en: nameEn,
      }),
    };

    onSubmit(payload, initialData?.id);
  };

  const inputStyle = { padding: "6px 10px", height: "36px", fontSize: "13px" };

  return (
    <div className="branch-modal-overlay" onClick={onClose}>
      <form
        className="branch-modal branch-add-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 className="branch-modal-heading">
          {initialData
            ? t("departments.editTitle")
            : t("departments.addNewTitle")}
        </h3>

        <div className="branch-form-wrapper">
          <div className="branch-form-left">
            <div className="branch-input-group">
              <label htmlFor="name_uz">{t("departments.name")} (UZ)</label>
              <input
                id="name_uz"
                type="text"
                value={nameUz}
                onChange={(e) => {
                  const newName = e.target.value;
                  setNameUz(newName);
                  if (!isCodeModified && !initialData) {
                    setCode(newName.toUpperCase().replace(/\s+/g, "_"));
                  }
                }}
                required
                style={inputStyle}
              />
            </div>

            {initialData && (
              <>
                <div className="branch-input-group">
                  <label htmlFor="name_ru">{t("departments.name")} (RU)</label>
                  <input
                    id="name_ru"
                    type="text"
                    value={nameRu}
                    onChange={(e) => setNameRu(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div className="branch-input-group">
                  <label htmlFor="name_en">{t("departments.name")} (EN)</label>
                  <input
                    id="name_en"
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </>
            )}

            <div className="branch-input-group">
              <label htmlFor="code">{t("departments.code")}</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setIsCodeModified(true);
                }}
                required
                style={inputStyle}
              />
            </div>

            <div className="branch-input-group">
              <label htmlFor="branch">{t("departments.branch")}</label>
              <select
                id="branch"
                value={branchId}
                onChange={(e) => setBranchId(Number(e.target.value))}
                required
                style={inputStyle}
              >
                <option value="" disabled>
                  {t("departments.selectBranch")}
                </option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {getLocalized(b, 'name', i18n.language)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="branch-form-right">
            <div className="branch-input-group">
              <label htmlFor="manager">{t("departments.manager")}</label>
              <input
                id="manager"
                type="text"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div className="branch-input-group">
              <label htmlFor="status">{t("departments.status")}</label>
              <div className="branch-toggle-wrapper">
                <button
                  type="button"
                  className={isActive ? "" : "branch-active-btn"}
                  onClick={() => setIsActive(false)}
                  aria-label={t("departments.inactive")}
                >
                  {t("departments.inactive")}
                </button>
                <button
                  type="button"
                  className={isActive ? "branch-active-btn" : ""}
                  onClick={() => setIsActive(true)}
                  aria-label={t("departments.active")}
                >
                  {t("departments.active")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="branch-modal-buttons">
          <button type="submit" className="branch-save-btn">
            {t("departments.save")}
          </button>
          <button type="button" onClick={onClose} className="branch-cancel-btn">
            {t("departments.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
const Department = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] =
    useState<DepartmentType | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? tableData?.map((r) => r.id) : []);

  const toggleOne = (id: number) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<
    DepartmentType[]
  >({
    queryKey: ["departments"],
    queryFn: getDepartments,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: DepartmentPayload }) =>
      updateDepartment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const handleOpenModal = (department?: DepartmentType) => {
    setEditingDepartment(department || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
  };

  const handleSubmit = (payload: DepartmentPayload, id?: number) => {
    if (id) {
      updateMutation.mutate({ id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t("departments.confirmDelete", "Haqiqatan ham o‘chirmoqchimisiz?"))) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteSelected = () => {
    if (window.confirm(t("departments.confirmBatchDelete", "Tanlanganlarni haqiqatan ham o'chirmoqchimisiz?"))) {
      selected.forEach((id) => deleteMutation.mutate(id));
      setSelected([]);
    }
  };

  const tableData = useMemo(() => {
    return [...departments].sort((a, b) => a.id - b.id);
  }, [departments]);

  if (isLoadingDepartments) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        {t("departments.loading")}
      </div>
    );
  }

  return (
    <section className="branch-container container">
      <h1 className="branch-page-title">{t("departments.listTitle")}</h1>

      <div className="branch-filter-panel">
        <button className="branch-add-btn" onClick={() => handleOpenModal()}>
          {t("departments.addNewTitle")}
        </button>

        <button
          className="branch-delete-btn"
          disabled={!selected.length}
          onClick={handleDeleteSelected}
          style={{ opacity: selected.length ? 1 : 0.5, cursor: selected.length ? "pointer" : "not-allowed" }}
        >
          {t("departments.deleteSelected")}
        </button>
      </div>

      <div className="branch-table-container">
        <table className="branch-data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selected.length === tableData?.length && tableData?.length > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t("departments.name")}</th>
              <th>{t("departments.code")}</th>
              <th>{t("departments.branch")}</th>
              <th>{t("departments.manager")}</th>
              <th>{t("departments.status")}</th>
              <th>{t("departments.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {tableData?.map((dept) => (
              <tr key={dept.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(dept.id)}
                    onChange={() => toggleOne(dept.id)}
                  />
                </td>
                <td>{dept.id}</td>
                <td>{getLocalized(dept, 'name', i18n.language)}</td>
                <td>{dept.code}</td>
                <td>{dept.branch ? getLocalized(dept.branch, 'name', i18n.language) : "-"}</td>
                <td>{dept.manager}</td>
                <td>
                  {dept.is_active
                    ? t("departments.active")
                    : t("departments.inactive")}
                </td>
                <td className="branch-action-cell">
                  <button
                    className="branch-edit-icon"
                    onClick={() => handleOpenModal(dept)}
                    aria-label={t("common.edit", "Tahrirlash")}
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button
                    className="branch-delete-icon"
                    onClick={() => handleDelete(dept.id)}
                    aria-label={t("common.delete", "O‘chirish")}
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
            {tableData.length === 0 && (
              <EmptyState colSpan={8} message={t("common.noData")} />
            )}
          </tbody>
        </table>
      </div>

      <DepartmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        branches={branches}
        initialData={editingDepartment}
      />
    </section>
  );
};

export default Department;
