import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sourceAPI,
  type Source,
  type SourcePayload,
} from "../../api/source.api";
import "../users/users.css";
import "../expenses/expenses.css";
import { useTranslation } from "react-i18next";
import { getLocalized } from "../../utils/getLocalized";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";
import { useTableSettingsStore } from "../../store/useTableSettingsStore";

interface SourceFormData {
  name_uz: string;
  name_ru: string;
  name_en: string;
  link: string;
  created_at: string;
  updated_at: string;
}

const emptyForm: SourceFormData = {
  name_uz: "",
  name_ru: "",
  name_en: "",
  link: "",
  created_at: "",
  updated_at: "",
};

const formatDateTime = (iso: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toLocalDateTimeInput = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Sources = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const { settings } = useTableSettingsStore();
  const sourceSettings = settings.sources || {};
  const isVisible = (colId: string) => sourceSettings[colId] ?? true;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<Source | null>(null);

  const [formData, setFormData] = useState<SourceFormData>(emptyForm);

  const { data: sources, isLoading } = useQuery<Source[]>({
    queryKey: ["sources"],
    queryFn: sourceAPI.getSources,
  });

  const sortedSources = useMemo(() => {
    return (sources || []).slice().sort((a, b) => a.id - b.id);
  }, [sources]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: SourcePayload = {
        name_uz: formData.name_uz,
        name_ru: formData.name_ru || undefined,
        name_en: formData.name_en || undefined,
        link: formData.link,
      };
      return sourceAPI.createSource(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      setShowAddModal(false);
      setEditingItem(null);
      setFormData(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: SourceFormData;
    }) => {
      const apiPayload: SourcePayload = {
        name_uz: payload.name_uz,
        name_ru: payload.name_ru || undefined,
        name_en: payload.name_en || undefined,
        link: payload.link,
      };
      if (payload.created_at) {
        apiPayload.created_at = new Date(payload.created_at).toISOString();
      }
      if (payload.updated_at) {
        apiPayload.updated_at = new Date(payload.updated_at).toISOString();
      }
      return sourceAPI.updateSource(id, apiPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      setShowAddModal(false);
      setEditingItem(null);
      setFormData(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: sourceAPI.deleteSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
  });

  const openEditModal = (item: Source) => {
    setEditingItem(item);
    setFormData({
      name_uz: item.name_uz || "",
      name_ru: item.name_ru || "",
      name_en: item.name_en || "",
      link: item.link || "",
      created_at: toLocalDateTimeInput(item.created_at),
      updated_at: toLocalDateTimeInput(item.updated_at),
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

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? sources?.map((s) => s.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const resetForm = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setFormData(emptyForm);
  };

  return (
    <section className="users container">
      <h1 className="main-title">{t("sources.title")}</h1>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory">
            <h1>
              {editingItem ? t("sources.editTitle") : t("sources.addTitle")}
            </h1>

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
                <label>{t("sources.nameUz")}</label>
                <input
                  type="text"
                  value={formData.name_uz}
                  onChange={(e) =>
                    setFormData({ ...formData, name_uz: e.target.value })
                  }
                  placeholder={t("sources.nameUz")}
                  required
                />
              </div>

              <div className="subcategory-form-group">
                <label>{t("sources.nameRu")}</label>
                <input
                  type="text"
                  value={formData.name_ru}
                  onChange={(e) =>
                    setFormData({ ...formData, name_ru: e.target.value })
                  }
                  placeholder={t("sources.nameRu")}
                />
              </div>

              <div className="subcategory-form-group">
                <label>{t("sources.nameEn")}</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) =>
                    setFormData({ ...formData, name_en: e.target.value })
                  }
                  placeholder={t("sources.nameEn")}
                />
              </div>

              <div className="subcategory-form-group">
                <label>{t("sources.link")}</label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) =>
                    setFormData({ ...formData, link: e.target.value })
                  }
                  placeholder="https://..."
                  required
                />
              </div>

              {editingItem && (
                <>
                  <div className="subcategory-form-group">
                    <label>{t("sources.createdAt")}</label>
                    <input
                      type="datetime-local"
                      value={formData.created_at}
                      onChange={(e) =>
                        setFormData({ ...formData, created_at: e.target.value })
                      }
                    />
                  </div>

                  <div className="subcategory-form-group">
                    <label>{t("sources.updatedAt")}</label>
                    <input
                      type="datetime-local"
                      value={formData.updated_at}
                      onChange={(e) =>
                        setFormData({ ...formData, updated_at: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button
                  className="primary"
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t("sources.saving")
                    : t("sources.save")}
                </button>

                <button type="button" className="cancel" onClick={resetForm}>
                  {t("sources.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t("sources.confirmDelete")}</h3>

            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                {t("sources.delete")}
              </button>

              <button
                className="cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                {t("sources.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-filters">
        <button className="add-new-user" onClick={() => setShowAddModal(true)}>
          {t("sources.addBtn")}
        </button>

        <button
          className="delete-all"
          disabled={!selected.length}
          onClick={() => {
            setDeleteTarget("all");
            setShowDeleteModal(true);
          }}
        >
          {t("sources.delete")}
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
                    selected.length === (sources?.length || 0) &&
                    (sources?.length || 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              {isVisible("id") && <th>ID</th>}
              {isVisible("name") && <th>{t("sources.name")}</th>}
              {isVisible("link") && <th>{t("sources.link")}</th>}
              {isVisible("createdAt") && <th>{t("sources.createdAt")}</th>}
              {isVisible("updatedAt") && <th>{t("sources.updatedAt")}</th>}
              <th>{t("sources.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={7} />
            ) : sortedSources.length ? (
              sortedSources.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>

                  {isVisible("id") && <td>{item.id}</td>}
                  {isVisible("name") && (
                    <td>{getLocalized(item, "name", i18n.language)}</td>
                  )}
                  {isVisible("link") && (
                    <td>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#003366",
                          textDecoration: "underline",
                        }}
                      >
                        {item.link}
                      </a>
                    </td>
                  )}
                  {isVisible("createdAt") && (
                    <td>{formatDateTime(item.created_at)}</td>
                  )}
                  {isVisible("updatedAt") && (
                    <td>{formatDateTime(item.updated_at)}</td>
                  )}

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
              <EmptyState colSpan={7} message={t("sources.notFound")} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Sources;
