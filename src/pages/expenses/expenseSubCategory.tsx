import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "../../api/api";
import "../users/users.css";
import "./expenses.css";
import { useTranslation } from "react-i18next";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";

interface ExpenseCategory {
  id: number;
  name: string;
}

interface ExpenseSubcategory {
  id: number;
  name: string;
  expense_category_id: number;
  category?: ExpenseCategory;
}

const ExpensesSubcategory = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<ExpenseSubcategory | null>(
    null,
  );

  const [formData, setFormData] = useState({
    name: "",
    expense_category_id: "",
  });

  const [archivedIds, setArchivedIds] = useState<number[]>(() => {
    const stored = localStorage.getItem("archivedExpenseSubcategoryIds");
    return stored ? JSON.parse(stored) : [];
  });

  const { data: subcategories, isLoading } = useQuery<ExpenseSubcategory[]>({
    queryKey: ["expense-subcategories"],
    queryFn: async () => {
      const { data } = await API.get("/expense-subcategories");
      return data;
    },
  });

  const { data: categories } = useQuery<ExpenseCategory[]>({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data } = await API.get("/expense-categories");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => API.post("/expense-subcategories", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-subcategories"] });
      setShowAddModal(false);
      setEditingItem(null);
      setFormData({ name: "", expense_category_id: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: typeof formData;
    }) => API.put(`/expense-subcategories/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-subcategories"] });
      setShowAddModal(false);
      setEditingItem(null);
      setFormData({ name: "", expense_category_id: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      API.delete(`/expense-subcategories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-subcategories"] });
    },
  });

  const openEditModal = (item: ExpenseSubcategory) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      expense_category_id: String(item.expense_category_id),
    });
    setShowAddModal(true);
  };

  const confirmDelete = () => {
    if (deleteTarget === "all") {
      selected.forEach((id) => deleteMutation.mutate(id));
      setSelected([]);
    }

    if (typeof deleteTarget === "number") {
      deleteMutation.mutate(deleteTarget);
      setSelected((p) => p.filter((x) => x !== deleteTarget));
    }

    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const archiveItem = (item: ExpenseSubcategory) => {
    const newArchivedIds = [...archivedIds, item.id];
    setArchivedIds(newArchivedIds);
    localStorage.setItem(
      "archivedExpenseSubcategoryIds",
      JSON.stringify(newArchivedIds),
    );

    const allArchived = JSON.parse(
      localStorage.getItem("archivedExpenseSubcategories") || "[]",
    );
    localStorage.setItem(
      "archivedExpenseSubcategories",
      JSON.stringify([...allArchived, item]),
    );
  };

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? subcategories?.map((c) => c.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <section className="users container">
      <h1 className="main-title">{t("expenses.expenseSubCategory")}</h1>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory">
            <h1>{t("expenses.expenseSubCategory")}</h1>

            <form
              className="subcategory-form"
              onSubmit={(e) => {
                e.preventDefault();

                if (editingItem) {
                  updateMutation.mutate({
                    id: editingItem.id,
                    payload: formData,
                  });
                } else {
                  createMutation.mutate();
                }
              }}
            >
              <div className="subcategory-form-group">
                <label>{t("expenses.expenseSubCategoryName")}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="subcategory-form-group">
                <label>{t("expenses.expenseCategory")}</label>
                <select
                  value={formData.expense_category_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expense_category_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">{t("expenses.choose")}</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button className="primary" type="submit">
                  {t("expenses.save")}
                </button>
                <button
                  type="button"
                  className="cancel"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    setFormData({ name: "", expense_category_id: "" });
                  }}
                >
                  {t("expenses.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t("expenses.confirmDelete")}</h3>

            <div className="modal-actions">
              <button
                className="cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                {t("expenses.cancel")}
              </button>

              <button className="danger" onClick={confirmDelete}>
                {t("expenses.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-filters">
        <button className="add-new-user" onClick={() => setShowAddModal(true)}>
          {t("expenses.addBtn")}
        </button>

        <button
          className="delete-all"
          disabled={!selected.length}
          onClick={() => {
            setDeleteTarget("all");
            setShowDeleteModal(true);
          }}
        >
          {t("expenses.delete")}
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
                    selected.length === (subcategories?.length || 0) &&
                    (subcategories?.length || 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t("expenses.subCategory")}</th>
              <th>{t("expenses.category")}</th>
              <th>{t("expenses.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={5} />
            ) : subcategories?.length ? (
              subcategories?.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>

                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.category?.name || "-"}</td>

                  <td className="actions">
                    <button
                      className="user-archive-btn"
                      onClick={() => archiveItem(item)}
                    >
                      <i className="fa-solid fa-box-archive"></i>
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
                colSpan={10}
                message={t("expenses.subCategoryNotFound")}
              />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ExpensesSubcategory;
