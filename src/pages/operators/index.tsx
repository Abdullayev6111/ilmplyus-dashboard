import { useState, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { API } from "../../api/api";
import "../users/users.css";
import "./operators.css";
import { useTranslation } from "react-i18next";
import { getLocalized } from "../../utils/getLocalized";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";
import { useTableSettingsStore } from "../../store/useTableSettingsStore";
import type { Branch, UsersResponse } from "../../types";

export interface IpTelefonOperator {
  id: number;
  branch_id: number;
  employee_id: number;
  login: string | number;
  password?: string;
  branch?: {
    id: number;
    name_uz: string;
    name_ru?: string | null;
    name_en?: string | null;
    [key: string]: any;
  };
  employee?: {
    id: number;
    full_name: string;
    first_name?: string;
    last_name?: string;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

export interface IpTelefonOperatorPayload {
  branch_id: number;
  employee_id: number;
  login: string | number;
  password?: string;
}

// const formatDate = (dateString: string) => {
//   const date = new Date(dateString);
//   const day = String(date.getDate()).padStart(2, "0");
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const year = date.getFullYear();
//   return `${day}.${month}.${year}`;
// };

const Operators = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<IpTelefonOperator | null>(
    null,
  );
  const [viewItem, setViewItem] = useState<IpTelefonOperator | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    branch_id: "",
    employee_id: "",
    login: "",
    password: "",
  });

  const { settings } = useTableSettingsStore();
  const operatorSettings = settings.operators || {};
  const isVisible = (colId: string) => operatorSettings[colId] ?? true;

  const { data: operators, isLoading } = useQuery<IpTelefonOperator[]>({
    queryKey: ["ip-telefon-operators"],
    queryFn: async () => {
      const { data } = await API.get<IpTelefonOperator[]>(
        "/ip-telefon-operators",
      );
      return Array.isArray(data) ? data : (data as any)?.data || [];
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const { data: branchesData } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await API.get("/branches");
      return Array.isArray(data) ? data : (data as any)?.data || [];
    },
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const { data: usersData } = useQuery<UsersResponse>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await API.get("/users");
      return data;
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const { data: employeesData } = useQuery<any[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await API.get("/employees");
      return Array.isArray(data) ? data : (data as any)?.data || [];
    },
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: IpTelefonOperatorPayload) =>
      API.post("/ip-telefon-operators", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-telefon-operators"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: {
      id: number;
      payload: IpTelefonOperatorPayload;
    }) => API.put(`/ip-telefon-operators/${params.id}`, params.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-telefon-operators"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/ip-telefon-operators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-telefon-operators"] });
    },
  });

  const availableOperators = useMemo(() => {
    const allUsers = usersData?.data || [];
    const allEmployees = employeesData || [];

    const validUsers = allUsers.filter((u) => {
      // Filter by branch
      const isInBranch =
        !formData.branch_id ||
        (u.branches &&
          u.branches.some((b) => b.id.toString() === formData.branch_id)) ||
        (u.branch && u.branch.id.toString() === formData.branch_id) ||
        u.branch?.toString() === formData.branch_id;

      // Filter by role (must be operator)
      const isOperator = u.roles?.some((r) =>
        r.name.toLowerCase().includes("operator"),
      );

      return isInBranch && isOperator && u.pinfl;
    });

    const matchedEmployees: any[] = [];
    validUsers.forEach((user) => {
      const matchedEmp = allEmployees.find((emp) => emp.pinfl === user.pinfl);
      if (matchedEmp) {
        matchedEmployees.push({
          id: matchedEmp.id,
          full_name:
            matchedEmp.full_name ||
            `${matchedEmp.last_name || ""} ${matchedEmp.first_name || ""}`.trim() ||
            user.full_name,
        });
      }
    });

    return matchedEmployees;
  }, [usersData?.data, employeesData, formData.branch_id]);

  const resetForm = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ branch_id: "", employee_id: "", login: "", password: "" });
  };

  const openEditModal = (item: IpTelefonOperator) => {
    setEditingItem(item);
    setFormData({
      branch_id: item.branch_id?.toString() || "",
      employee_id: item.employee_id?.toString() || "",
      login: item.login?.toString() || "",
      password: item.password || "",
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: IpTelefonOperatorPayload = {
      branch_id: Number(formData.branch_id),
      employee_id: Number(formData.employee_id),
      login: formData.login,
      password: formData.password,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const confirmDelete = () => {
    if (deleteTarget === "all") {
      selected.forEach((id) => deleteMutation.mutate(id));
      setSelected([]);
    }
    if (typeof deleteTarget === "number") {
      deleteMutation.mutate(deleteTarget);
      setSelected((prev) => prev.filter((x) => x !== deleteTarget));
    }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? (operators?.map((c) => c.id) ?? []) : []);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <section className="users container">
      <h1 className="main-title">{t("aside.operators", "Operatorlar")}</h1>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory" style={{ minWidth: 480 }}>
            <h1>
              {editingItem
                ? t("common.edit", "Tahrirlash")
                : t("users.addNew", "Qo'shish")}
            </h1>

            <form className="subcategory-form" onSubmit={handleSubmit}>
              <div className="subcategory-form-group">
                <label>{t("payments.branch", "Filial")}</label>
                <select
                  value={formData.branch_id}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      branch_id: e.target.value,
                      employee_id: "",
                    });
                  }}
                  required
                >
                  <option value="">{t("common.choose", "Tanlang")}</option>
                  {branchesData?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {getLocalized(b, "name", i18n.language)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="subcategory-form-group">
                <label>{t("aside.operators", "Operator")}</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      employee_id: e.target.value,
                    }))
                  }
                  required
                  disabled={!formData.branch_id}
                >
                  <option value="">{t("common.choose", "Tanlang")}</option>
                  {availableOperators.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                  {editingItem &&
                    editingItem.employee &&
                    formData.employee_id ===
                      editingItem.employee_id?.toString() &&
                    !availableOperators.some(
                      (u) => u.id === editingItem.employee_id,
                    ) && (
                      <option value={editingItem.employee_id}>
                        {editingItem.employee.full_name ||
                          editingItem.employee.first_name}
                      </option>
                    )}
                </select>
                {formData.branch_id &&
                  availableOperators.length === 0 &&
                  !editingItem && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "red",
                        marginTop: 4,
                        display: "block",
                      }}
                    >
                      Bu filialda operator topilmadi
                    </span>
                  )}
              </div>

              <div className="subcategory-form-group">
                <label>{t("users.loginText", "Login")}</label>
                <input
                  type="text"
                  value={formData.login}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, login: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="subcategory-form-group">
                <label>{t("users.password", "Password")}</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required={!editingItem}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="primary"
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t("common.saving", "Saqlanmoqda...")
                    : t("common.save", "Saqlash")}
                </button>
                <button type="button" className="cancel" onClick={resetForm}>
                  {t("common.cancel", "Bekor qilish")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t("users.confirmDelete", "O‘chirishni tasdiqlaysizmi?")}</h3>
            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                {t("common.delete", "O'chirish")}
              </button>

              <button
                className="cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                {t("common.cancel", "Bekor qilish")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewItem && (
        <div className="modal-overlay">
          <div
            className="modal"
            style={{ width: 600, padding: 32, borderRadius: 8 }}
          >
            <h2
              style={{
                textAlign: "center",
                marginBottom: 32,
                color: "#003b73",
              }}
            >
              {t("aside.operators", "Operatorlar")}
            </h2>

            <div style={{ display: "flex", marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>
                  {t("users.fish", "F.I.SH")}:
                </p>
                <p style={{ color: "#003b73", fontWeight: 500, fontSize: 16 }}>
                  {viewItem.employee?.full_name ||
                    viewItem.employee?.first_name ||
                    "-"}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>
                  {t("payments.branch", "Filial")}:
                </p>
                <p style={{ color: "#003b73", fontWeight: 500, fontSize: 16 }}>
                  {viewItem.branch
                    ? getLocalized(viewItem.branch, "name", i18n.language)
                    : "-"}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", marginBottom: 32 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>
                  {t("users.loginText", "Login")}:
                </p>
                <p style={{ color: "#003b73", fontWeight: 500, fontSize: 16 }}>
                  {viewItem.login || "-"}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>
                  ID:
                </p>
                <p style={{ color: "#003b73", fontWeight: 500, fontSize: 16 }}>
                  #{viewItem.id}
                </p>
              </div>
            </div>

            <button
              onClick={() => setViewItem(null)}
              style={{
                border: "1px solid #003b73",
                background: "transparent",
                color: "#003b73",
                padding: "8px 32px",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                width: "100%",
              }}
            >
              {t("common.cancel", "Ortga")}
            </button>
          </div>
        </div>
      )}

      <div className="users-filters">
        <button className="add-new-user" onClick={() => setShowModal(true)}>
          {t("users.addNew", "Qo'shish")}
        </button>
        <button
          className="delete-all"
          disabled={!selected.length}
          onClick={() => {
            setDeleteTarget("all");
            setShowDeleteModal(true);
          }}
        >
          {t("common.delete", "O'chirish")}
        </button>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    (operators?.length ?? 0) > 0 &&
                    selected.length === (operators?.length ?? 0)
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              {isVisible("id") && <th>ID</th>}
              {isVisible("full_name") && <th>{t("users.fish", "F.I.SH")}</th>}
              {isVisible("branch") && <th>{t("payments.branch", "Filial")}</th>}
              {isVisible("login") && <th>{t("users.loginText", "Login")}</th>}
              {isVisible("password") && (
                <th>{t("users.password", "Password")}</th>
              )}
              <th>{t("courses.actions", "Harakatlar")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={7} />
            ) : operators && operators.length > 0 ? (
              operators.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  {isVisible("id") && <td>{item.id}</td>}
                  {isVisible("full_name") && (
                    <td>
                      {item.employee?.full_name ||
                        item.employee?.first_name ||
                        "-"}
                    </td>
                  )}
                  {isVisible("branch") && (
                    <td>
                      {item.branch
                        ? getLocalized(item.branch, "name", i18n.language)
                        : "-"}
                    </td>
                  )}
                  {isVisible("login") && <td>{item.login}</td>}
                  {isVisible("password") && <td>{item.password}</td>}
                  <td className="actions">
                    <button
                      className="user-view-btn"
                      onClick={() => setViewItem(item)}
                    >
                      <i className="fa-solid fa-eye"></i>
                    </button>
                    <button
                      className="user-edit-btn"
                      onClick={() => openEditModal(item)}
                    >
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button
                      className="user-delete-btn"
                      onClick={() => {
                        setDeleteTarget(item.id);
                        setShowDeleteModal(true);
                      }}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyState
                colSpan={7}
                message={t("common.noData", "Ma'lumot topilmadi")}
              />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Operators;
