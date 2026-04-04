import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "../../api/api";
import "../users/users.css";
import "./expenses.css";
import { useTranslation } from "react-i18next";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";

interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  name: string;
  expense_category_id: number;
}

interface Cashier {
  id: number;
  full_name: string;
}

interface Branch {
  id: number;
  address: string;
}

interface Expense {
  id: number;
  amount: string;
  expense_date: string;
  info: string;
  category?: Category;
  subcategory?: Subcategory;
  cashier?: Cashier;
  branch?: Branch;
}

const Expenses = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<Expense | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showRange, setShowRange] = useState(false);

  const [formData, setFormData] = useState({
    expense_category_id: "",
    expense_subcategory_id: "",
    user_id: "",
    amount: "",
    expense_date: "",
    branch_id: "",
    info: "",
  });

  const [archivedIds, setArchivedIds] = useState<number[]>(() => {
    const stored = localStorage.getItem("archivedExpenseIds");
    return stored ? JSON.parse(stored) : [];
  });

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: async () => (await API.get("/expenses")).data,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["expense-categories"],
    queryFn: async () => (await API.get("/expense-categories")).data,
  });

  const { data: subcategories } = useQuery<Subcategory[]>({
    queryKey: ["expense-subcategories"],
    queryFn: async () => (await API.get("/expense-subcategories")).data,
  });

  const { data: cashiers } = useQuery<Cashier[]>({
    queryKey: ["cashiers"],
    queryFn: async () => (await API.get("/users")).data?.data || [],
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => (await API.get("/branches")).data,
  });

  const filteredExpenses = expenses
    ?.filter((e) => {
      const matchCategory = categoryFilter
        ? String(e.category?.id) === categoryFilter
        : true;

      const matchSubcategory = subcategoryFilter
        ? String(e.subcategory?.id) === subcategoryFilter
        : true;

      const matchDate =
        fromDate && toDate
          ? e.expense_date >= fromDate && e.expense_date <= toDate
          : true;

      return matchCategory && matchSubcategory && matchDate;
    })
    .sort((a, b) => a.id - b.id);

  const createMutation = useMutation({
    mutationFn: async () => API.post("/expenses", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: typeof formData;
    }) => API.put(`/expenses/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/expenses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const openEditModal = (item: Expense) => {
    setEditingItem(item);
    setFormData({
      expense_category_id: String(item.category?.id || ""),
      expense_subcategory_id: String(item.subcategory?.id || ""),
      user_id: String(item.cashier?.id || ""),
      amount: item.amount,
      expense_date: item.expense_date,
      branch_id: String(item.branch?.id || ""),
      info: item.info,
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setFormData({
      expense_category_id: "",
      expense_subcategory_id: "",
      user_id: "",
      amount: "",
      expense_date: "",
      branch_id: "",
      info: "",
    });
  };

  const confirmDelete = () => {
    if (deleteTarget === "all") {
      selected.forEach((id) => deleteMutation.mutate(id));
      setSelected([]);
    }

    if (typeof deleteTarget === "number") {
      deleteMutation.mutate(deleteTarget);
    }

    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const archiveItem = (item: Expense) => {
    const newIds = [...archivedIds, item.id];
    setArchivedIds(newIds);
    localStorage.setItem("archivedExpenseIds", JSON.stringify(newIds));

    const all = JSON.parse(localStorage.getItem("archivedExpenses") || "[]");
    localStorage.setItem("archivedExpenses", JSON.stringify([...all, item]));
  };

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? filteredExpenses?.map((e) => e.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const filteredSubcategories = subcategories?.filter(
    (s) => String(s.expense_category_id) === formData.expense_category_id,
  );

  return (
    <section className="users container">
      <h1 className="main-title">{t("expenses.expenseTitle")}</h1>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="expenses-create">
            <h1>{t("expenses.addNewExpense")}</h1>

            <form
              className="expenses-create-form"
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
              <div className="create-form">
                <div className="form-group">
                  <label>{t("expenses.expenseCategory")}</label>
                  <select
                    className="create-form-input"
                    value={formData.expense_category_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expense_category_id: e.target.value,
                        expense_subcategory_id: "",
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

                <div className="form-group">
                  <label>{t("expenses.expenseSubCategory")}</label>
                  <select
                    className="create-form-input"
                    value={formData.expense_subcategory_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expense_subcategory_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">{t("expenses.choose")}</option>
                    {filteredSubcategories?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="create-form">
                <div className="form-group">
                  <label>{t("expenses.cashier")}</label>
                  <select
                    value={formData.user_id}
                    className="create-form-input"
                    onChange={(e) =>
                      setFormData({ ...formData, user_id: e.target.value })
                    }
                    required
                  >
                    <option value="">{t("expenses.choose")}</option>
                    {cashiers?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t("expenses.amount")}</label>
                  <input
                    type="number"
                    className="create-form-input"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="create-form">
                <div className="form-group">
                  <label>{t("expenses.date")}</label>
                  <input
                    type="date"
                    className="create-form-input"
                    value={formData.expense_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expense_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t("expenses.branch")}</label>
                  <select
                    value={formData.branch_id}
                    className="create-form-input"
                    onChange={(e) =>
                      setFormData({ ...formData, branch_id: e.target.value })
                    }
                    required
                  >
                    <option value="">{t("expenses.choose")}</option>
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.address}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group comment">
                <label>{t("expenses.comment")}</label>
                <input
                  value={formData.info}
                  className="expenses-comment"
                  onChange={(e) =>
                    setFormData({ ...formData, info: e.target.value })
                  }
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel" onClick={closeModal}>
                  {t("expenses.cancel")}
                </button>

                <button className="primary">{t("expenses.save")}</button>
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

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setSubcategoryFilter("");
          }}
        >
          <option value="">{t("expenses.category")}</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={subcategoryFilter}
          onChange={(e) => setSubcategoryFilter(e.target.value)}
        >
          <option value="">{t("expenses.subCategory")}</option>
          {subcategories
            ?.filter(
              (s) =>
                !categoryFilter ||
                String(s.expense_category_id) === categoryFilter,
            )
            ?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>

        <div style={{ position: "relative" }}>
          <input
            readOnly
            placeholder={t("expenses.date")}
            value={fromDate && toDate ? `${fromDate} - ${toDate}` : ""}
            onClick={() => setShowRange(true)}
          />

          {showRange && (
            <div className="range-box">
              <input
                type="date"
                onChange={(e) => setFromDate(e.target.value)}
              />

              <input
                type="date"
                onChange={(e) => {
                  setToDate(e.target.value);
                  setShowRange(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selected.length === (filteredExpenses?.length || 0) &&
                    (filteredExpenses?.length || 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t("expenses.category")}</th>
              <th>{t("expenses.subCategory")}</th>
              <th>{t("expenses.cashier")}</th>
              <th>{t("expenses.amount")}</th>
              <th>{t("expenses.date")}</th>
              <th>{t("expenses.branch")}</th>
              <th>{t("expenses.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={9} />
            ) : filteredExpenses?.length ? (
              filteredExpenses?.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>

                  <td>{item.id}</td>
                  <td>{item.category?.name || "-"}</td>
                  <td>{item.subcategory?.name || "-"}</td>
                  <td>{item.cashier?.full_name || "-"}</td>
                  <td>{item.amount}</td>
                  <td>{item.expense_date}</td>
                  <td>{item.branch?.address || "-"}</td>

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
              <EmptyState colSpan={10} message={t("expenses.notFound")} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Expenses;
