import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { API } from "../../api/api";
import "../users/users.css";
import "../levels/levels.css";
import { useTranslation } from "react-i18next";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";
import type { PositionItem, PositionPayload } from "../../types";
import type { DepartmentType } from "../../types";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const Positions = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<PositionItem | null>(null);

  const [formData, setFormData] = useState<PositionPayload>({
    name: "",
    department_id: 0,
  });

  const { data: positions, isLoading } = useQuery<PositionItem[]>({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data } = await API.get<PositionItem[] | { data: PositionItem[] }>(
        "/positions",
      );
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const { data: departments } = useQuery<DepartmentType[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await API.get<
        DepartmentType[] | { data: DepartmentType[] }
      >("/departments");
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    staleTime: 1000 * 60 * 5,
  });

  const createMutation = useMutation({
    mutationFn: (payload: PositionPayload) => API.post("/positions", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; payload: PositionPayload }) =>
      API.put(`/positions/${params.id}`, params.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => API.delete(`/positions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
    },
  });

  const resetForm = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ name: "", department_id: 0 });
  };

  const openEditModal = (item: PositionItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      department_id: item.department?.id ?? 0,
    });
    setShowModal(true);
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
    setSelected(checked ? (positions?.map((p) => p.id) ?? []) : []);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <section className="users container">
      <h1 className="main-title">{t("positions.mainTitle")}</h1>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory">
            <h1>
              {editingItem ? t("positions.editTitle") : t("positions.addTitle")}
            </h1>

            <form
              className="subcategory-form"
              onSubmit={(e) => {
                e.preventDefault();

                const payload: PositionPayload = {
                  name: formData.name.trim(),
                  department_id: formData.department_id,
                };

                if (editingItem) {
                  updateMutation.mutate({ id: editingItem.id, payload });
                } else {
                  createMutation.mutate(payload);
                }
              }}
            >
              {/* Department select */}
              <div className="subcategory-form-group">
                <label>{t("positions.department")}</label>
                <select
                  value={formData.department_id || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      department_id: Number(e.target.value),
                    }))
                  }
                  required
                >
                  <option value="">{t("positions.choose")}</option>
                  {departments?.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Position name input */}
              <div className="subcategory-form-group">
                <label>{t("positions.positionName")}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="modal-actions">
                <button className="primary" type="submit" disabled={isPending}>
                  {isPending ? t("users.saving") : t("payments.save")}
                </button>

                <button type="button" className="cancel" onClick={resetForm}>
                  {t("payments.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t("users.confirmDelete")}</h3>

            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                {t("users.delete")}
              </button>

              <button
                className="cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                {t("users.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="users-filters">
        <button className="add-new-user" onClick={() => setShowModal(true)}>
          {t("users.addNew")}
        </button>

        <button
          className="delete-all"
          disabled={!selected.length}
          onClick={() => {
            setDeleteTarget("all");
            setShowDeleteModal(true);
          }}
        >
          {t("users.delete")}
        </button>
      </div>

      {/* Table */}
      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selected.length === (positions?.length ?? 0) &&
                    (positions?.length ?? 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t("positions.department")}</th>
              <th>{t("positions.positionName")}</th>
              <th>{t("positions.createdDate")}</th>
              <th>{t("positions.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={6} />
            ) : positions && positions.length > 0 ? (
              positions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td>{item.id}</td>
                  <td>{item.department?.name ?? "-"}</td>
                  <td>{item.name}</td>
                  <td>{item.created_at ? formatDate(item.created_at) : "-"}</td>
                  <td className="actions">
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
              <EmptyState colSpan={5} message={t("positions.notFound")} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Positions;
