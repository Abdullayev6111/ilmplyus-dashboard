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

const ExpensesCategory = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [editingItem, setEditingItem] = useState<ExpenseCategory | null>(null);

  const [archivedIds, setArchivedIds] = useState<number[]>(() => {
    const stored = localStorage.getItem("archivedExpensesIds");
    return stored ? JSON.parse(stored) : [];
  });

  const { data: categories, isLoading } = useQuery<ExpenseCategory[]>({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data } = await API.get("/expense-categories");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      API.post("/expense-categories", { name: categoryName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      setShowAddModal(false);
      setCategoryName("");
      setEditingItem(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) =>
      API.put(`/expense-categories/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      setShowAddModal(false);
      setCategoryName("");
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/expense-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    },
  });

  const openEditModal = (item: ExpenseCategory) => {
    setEditingItem(item);
    setCategoryName(item.name);
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

  const archiveExpenses = (item: ExpenseCategory) => {
    try {
      const newArchivedIds = [...archivedIds, item.id];
      setArchivedIds(newArchivedIds);
      localStorage.setItem(
        "archivedExpensesIds",
        JSON.stringify(newArchivedIds),
      );

      const allArchived = JSON.parse(
        localStorage.getItem("archivedExpenses") || "[]",
      );
      const newArchived = [...allArchived, item];
      localStorage.setItem("archivedExpenses", JSON.stringify(newArchived));
    } catch (error) {
      console.error(error);
    }
  };

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? categories?.map((c) => c.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <section className="users container">
      <h1 className="main-title">{t("expenses.expenseCategory")}</h1>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="expenses-category">
            <h1>{t("expenses.expenseCategory")}</h1>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingItem) {
                  updateMutation.mutate({
                    id: editingItem.id,
                    name: categoryName,
                  });
                } else {
                  createMutation.mutate();
                }
              }}
            >
              <label>{t("expenses.expenseCategoryName")}</label>

              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />

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
                    setCategoryName("");
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
                    selected.length === (categories?.length || 0) &&
                    (categories?.length || 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t("expenses.categoryName")}</th>
              <th>{t("expenses.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={4} />
            ) : categories?.length ? (
              categories?.map((item) => (
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

                  <td className="actions">
                    <button
                      className="user-archive-btn"
                      onClick={() => archiveExpenses(item)}
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
                colSpan={4}
                message={t("expenses.categoryNotFound")}
              />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ExpensesCategory;
