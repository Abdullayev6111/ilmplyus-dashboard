import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { API } from "../../api/api";
import "../users/users.css";
import "./levels.css";
import { useTranslation } from "react-i18next";
import { getLocalized } from "../../utils/getLocalized";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";
import type { Level, LevelPayload } from "../../types";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const Levels = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<Level | null>(null);

  const [formData, setFormData] = useState<LevelPayload>({
    name_uz: "",
    name_ru: "",
    name_en: "",
  });

  const { data: levels, isLoading } = useQuery<Level[]>({
    queryKey: ["levels"],
    queryFn: async () => {
      const { data } = await API.get<Level[]>("/levels");
      return Array.isArray(data) ? data : (data as any)?.data || [];
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: LevelPayload) => API.post("/levels", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { id: number; payload: LevelPayload }) =>
      API.put(`/levels/${params.id}`, params.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/levels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
    },
  });

  const resetForm = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ name_uz: "", name_ru: "", name_en: "" });
  };

  const openEditModal = (item: Level) => {
    setEditingItem(item);
    setFormData({
      name_uz: item.name_uz,
      name_ru: item.name_ru || "",
      name_en: item.name_en || "",
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
    setSelected(checked ? (levels?.map((c) => c.id) ?? []) : []);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <section className="users container">
      <h1 className="main-title">{t("levels.mainTitle")}</h1>

      {showModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory">
            <h1>{t("levels.level")}</h1>

            <form
              className="subcategory-form"
              onSubmit={(e) => {
                e.preventDefault();

                const payload: LevelPayload = {
                  name_uz: formData.name_uz.trim(),
                  ...(editingItem && {
                    name_ru: formData.name_ru?.trim() || "",
                    name_en: formData.name_en?.trim() || "",
                  }),
                };

                if (editingItem) {
                  updateMutation.mutate({ id: editingItem.id, payload });
                } else {
                  createMutation.mutate(payload);
                }
              }}
            >
              <div className="subcategory-form-group">
                <label>{t("levels.levelName")} (UZ)</label>
                <input
                  type="text"
                  value={formData.name_uz}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name_uz: e.target.value }))
                  }
                  required
                />
              </div>

              {editingItem && (
                <>
                  <div className="subcategory-form-group">
                    <label>{t("levels.levelName")} (RU)</label>
                    <input
                      type="text"
                      value={formData.name_ru}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name_ru: e.target.value }))
                      }
                    />
                  </div>

                  <div className="subcategory-form-group">
                    <label>{t("levels.levelName")} (EN)</label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name_en: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button className="primary" type="submit">
                  {t("payments.save")}
                </button>
                <button type="button" className="cancel" onClick={resetForm}>
                  {t("payments.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selected.length === (levels?.length ?? 0) &&
                    (levels?.length ?? 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t("levels.levelName")}</th>
              <th>{t("levels.createdDate")}</th>
              <th>{t("levels.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={5} />
            ) : levels && levels.length > 0 ? (
              levels?.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td>{item.id}</td>
                  <td>{getLocalized(item, 'name', i18n.language)}</td>
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
              <EmptyState colSpan={5} message={t("levels.notFound")} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Levels;
