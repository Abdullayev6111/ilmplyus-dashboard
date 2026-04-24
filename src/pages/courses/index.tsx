import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { API } from "../../api/api";
import "../users/users.css";
import "./courses.css";
import "../levels/levels.css";
import { useTranslation } from "react-i18next";
import { getLocalized } from "../../utils/getLocalized";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";
import type { Course, CoursePayload, Level } from "../../types";
import { useTableSettingsStore } from "../../store/useTableSettingsStore";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const Courses = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<Course | null>(null);
  const [viewItem, setViewItem] = useState<Course | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name_uz: "",
    name_ru: "",
    name_en: "",
  });
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [selectedLevelIds, setSelectedLevelIds] = useState<number[]>([]);
  const [openBranchDropdown, setOpenBranchDropdown] = useState(false);
  const [openLevelDropdown, setOpenLevelDropdown] = useState(false);

  const { settings } = useTableSettingsStore();
  const courseSettings = settings.courses || {};
  const isVisible = (colId: string) => courseSettings[colId] ?? true;

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await API.get<Course[]>("/courses");
      return Array.isArray(data) ? data : (data as any)?.data || [];
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const { data: branches } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await API.get("/branches");
      return Array.isArray(data) ? data : (data as any)?.data || [];
    },
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const { data: levels } = useQuery<Level[]>({
    queryKey: ["levels"],
    queryFn: async () => {
      const { data } = await API.get<Level[]>("/levels");
      return Array.isArray(data) ? data : (data as any)?.data || [];
    },
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CoursePayload) => API.post("/courses", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { id: number; payload: CoursePayload }) =>
      API.put(`/courses/${params.id}`, params.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });

  const resetForm = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ name_uz: "", name_ru: "", name_en: "" });
    setSelectedBranchIds([]);
    setSelectedLevelIds([]);
    setOpenBranchDropdown(false);
    setOpenLevelDropdown(false);
  };

  const openEditModal = (item: Course) => {
    setEditingItem(item);
    setFormData({
      name_uz: item.name_uz,
      name_ru: item.name_ru || "",
      name_en: item.name_en || "",
    });
    setSelectedBranchIds(item.branches?.map((b) => b.id) || []);
    setSelectedLevelIds(item.levels?.map((l) => l.id) || []);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CoursePayload = {
      name_uz: formData.name_uz.trim(),
      ...(editingItem && {
        name_ru: formData.name_ru?.trim() || "",
        name_en: formData.name_en?.trim() || "",
      }),
      branch_ids: selectedBranchIds,
      level_ids: selectedLevelIds,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addBranch = (id: number) => {
    if (!selectedBranchIds.includes(id))
      setSelectedBranchIds((prev) => [...prev, id]);
  };
  const removeBranch = (id: number) =>
    setSelectedBranchIds((prev) => prev.filter((x) => x !== id));

  const addLevel = (id: number) => {
    if (!selectedLevelIds.includes(id))
      setSelectedLevelIds((prev) => [...prev, id]);
  };
  const removeLevel = (id: number) =>
    setSelectedLevelIds((prev) => prev.filter((x) => x !== id));

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
    setSelected(checked ? (courses?.map((c) => c.id) ?? []) : []);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <section className="users container">
      <h1 className="main-title">{t("courses.mainTitle")}</h1>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory" style={{ minWidth: 480 }}>
            <h1>
              {editingItem
                ? t("courses.editTitle", "Kursni tahrirlash")
                : t("courses.addTitle", "Kurs qo'shish")}
            </h1>

            <form className="subcategory-form" onSubmit={handleSubmit}>
              {/* Course name */}
              <div className="subcategory-form-group">
                <label>{t("courses.courseName")} (UZ)</label>
                <input
                  type="text"
                  value={formData.name_uz}
                  onChange={(e) => setFormData(prev => ({...prev, name_uz: e.target.value}))}
                  required
                />
              </div>

              {editingItem && (
                <>
                  <div className="subcategory-form-group">
                    <label>{t("courses.courseName")} (RU)</label>
                    <input
                      type="text"
                      value={formData.name_ru}
                      onChange={(e) => setFormData(prev => ({...prev, name_ru: e.target.value}))}
                    />
                  </div>
                  <div className="subcategory-form-group">
                    <label>{t("courses.courseName")} (EN)</label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData(prev => ({...prev, name_en: e.target.value}))}
                    />
                  </div>
                </>
              )}

              {/* Branch multi-select */}
              <div className="subcategory-form-group">
                <label>{t("courses.branch")}</label>
                <div style={{ position: "relative" }}>
                  <div
                    className="selected-items-box"
                    onClick={() => setOpenBranchDropdown(true)}
                    style={{
                      minHeight: 36,
                      border: "1px solid #003366",
                      borderRadius: 8,
                      padding: "4px 8px",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    {selectedBranchIds.map((id) => {
                      const branch = branches?.find((b) => b.id === id);
                      return (
                        <div
                          key={id}
                          className="selected-item"
                          style={{
                            border: "1px solid #ccc",
                            background: "#f0f0f0",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 8px",
                            borderRadius: 4,
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBranch(id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 16,
                              color: "#666",
                              padding: 0,
                            }}
                          >
                            &times;
                          </button>
                          <span style={{ fontSize: 13 }}>{branch ? getLocalized(branch, 'name', i18n.language) : id}</span>
                        </div>
                      );
                    })}

                    {selectedBranchIds.length === 0 && (
                      <span style={{ color: "#888", fontSize: 14 }}>
                        {t("courses.choose")}
                      </span>
                    )}
                  </div>

                  {openBranchDropdown && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 10 }}
                        onClick={() => setOpenBranchDropdown(false)}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 11,
                          background: "#fff",
                          border: "1px solid #ddd",
                          borderRadius: 8,
                          maxHeight: 200,
                          overflowY: "auto",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          marginTop: 4,
                        }}
                      >
                        {branches?.map((b) => {
                          const isSelected = selectedBranchIds.includes(b.id);
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                if (!isSelected) {
                                  addBranch(b.id);
                                }
                              }}
                              style={{
                                padding: "8px 12px",
                                cursor: isSelected ? "not-allowed" : "pointer",
                                color: isSelected ? "#aaa" : "#333",
                                background: isSelected
                                  ? "#f9f9f9"
                                  : "transparent",
                                borderBottom: "1px solid #eee",
                                fontSize: 14,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              {getLocalized(b, 'name', i18n.language)}
                              {isSelected && (
                                <i
                                  className="fa-solid fa-check"
                                  style={{ color: "#003366" }}
                                ></i>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Level multi-select */}
              <div className="subcategory-form-group">
                <label>{t("levels.level")}</label>
                <div style={{ position: "relative" }}>
                  <div
                    className="selected-items-box"
                    onClick={() => setOpenLevelDropdown(true)}
                    style={{
                      minHeight: 36,
                      border: "1px solid #003366",
                      borderRadius: 8,
                      padding: "4px 8px",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    {selectedLevelIds.map((id) => {
                      const level = levels?.find((l) => l.id === id);
                      return (
                        <div
                          key={id}
                          className="selected-item"
                          style={{
                            border: "1px solid #ccc",
                            background: "#f0f0f0",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 8px",
                            borderRadius: 4,
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLevel(id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 16,
                              color: "#666",
                              padding: 0,
                            }}
                          >
                            &times;
                          </button>
                          <span style={{ fontSize: 13 }}>{level ? getLocalized(level, 'name', i18n.language) : id}</span>
                        </div>
                      );
                    })}

                    {selectedLevelIds.length === 0 && (
                      <span style={{ color: "#888", fontSize: 14 }}>
                        {t("courses.choose")}
                      </span>
                    )}
                  </div>

                  {openLevelDropdown && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 10 }}
                        onClick={() => setOpenLevelDropdown(false)}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 11,
                          background: "#fff",
                          border: "1px solid #ddd",
                          borderRadius: 8,
                          maxHeight: 200,
                          overflowY: "auto",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          marginTop: 4,
                        }}
                      >
                        {levels?.map((l) => {
                          const isSelected = selectedLevelIds.includes(l.id);
                          return (
                            <div
                              key={l.id}
                              onClick={() => {
                                if (!isSelected) {
                                  addLevel(l.id);
                                }
                              }}
                              style={{
                                padding: "8px 12px",
                                cursor: isSelected ? "not-allowed" : "pointer",
                                color: isSelected ? "#aaa" : "#333",
                                background: isSelected
                                  ? "#f9f9f9"
                                  : "transparent",
                                borderBottom: "1px solid #eee",
                                fontSize: 14,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              {getLocalized(l, 'name', i18n.language)}
                              {isSelected && (
                                <i
                                  className="fa-solid fa-check"
                                  style={{ color: "#003366" }}
                                ></i>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
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
                    ? t("expenses.saving", "Saqlanmoqda...")
                    : t("expenses.save")}
                </button>
                <button type="button" className="cancel" onClick={resetForm}>
                  {t("expenses.cancel")}
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
            <h3>{t("expenses.confirmDelete")}</h3>
            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                {t("expenses.delete")}
              </button>

              <button
                className="cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                {t("expenses.cancel")}
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
              {t("courses.detailsTitle")}
            </h2>

            <div style={{ display: "flex", marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>
                  {t("courses.courseName")}:
                </p>
                <p style={{ color: "#003b73", fontWeight: 500, fontSize: 16 }}>
                  {viewItem ? getLocalized(viewItem, 'name', i18n.language) : ''}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>
                  {t("courses.branch")}:
                </p>
                <p style={{ color: "#003b73", fontWeight: 500, fontSize: 16 }}>
                  {viewItem.branches && viewItem.branches.length > 0
                    ? viewItem.branches.map((b) => getLocalized(b, "name", i18n.language)).join(", ")
                    : "-"}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", marginBottom: 32 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>
                  {t("courses.createdDate")}:
                </p>
                <p style={{ color: "#003b73", fontWeight: 500, fontSize: 16 }}>
                  {viewItem.created_at ? formatDate(viewItem.created_at) : "-"}
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

            <hr
              style={{
                border: "none",
                borderTop: "1px solid #ddd",
                marginBottom: 24,
              }}
            />

            <h4
              style={{
                color: "#003b73",
                marginBottom: 16,
                textTransform: "uppercase",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {t("courses.availableLevels")}
            </h4>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 40,
              }}
            >
              {viewItem.levels && viewItem.levels.length > 0 ? (
                viewItem.levels.map((level) => (
                  <span
                    key={level.id}
                    style={{
                      border: "1px solid #003b73",
                      color: "#003b73",
                      borderRadius: 20,
                      padding: "6px 16px",
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    {getLocalized(level, "name", i18n.language)}
                  </span>
                ))
              ) : (
                <span style={{ color: "#888", fontSize: 14 }}>-</span>
              )}
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
              }}
            >
              {t("courses.back")}
            </button>
          </div>
        </div>
      )}

      <div className="users-filters">
        <button className="add-new-user" onClick={() => setShowModal(true)}>
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
                    (courses?.length ?? 0) > 0 &&
                    selected.length === (courses?.length ?? 0)
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              {isVisible("id") && <th>ID</th>}
              {isVisible("name") && <th>{t("courses.courseName")}</th>}
              {isVisible("branches") && <th>{t("courses.branch")}</th>}
              {isVisible("levels") && <th>{t("levels.level")}</th>}
              {isVisible("created_at") && <th>{t("courses.createdDate")}</th>}
              <th>{t("courses.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={7} />
            ) : courses && courses.length > 0 ? (
              courses.map((item) => {
                const branchLabel =
                  item.branches && item.branches.length > 0
                    ? item.branches.map((b) => getLocalized(b, "name", i18n.language)).join(", ")
                    : "-";

                const levelLabel =
                  item.levels && item.levels.length > 0
                    ? item.levels.map((l) => getLocalized(l, "name", i18n.language)).join(", ")
                    : "-";

                return (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => toggleOne(item.id)}
                      />
                    </td>
                    {isVisible("id") && <td>{item.id}</td>}
                    {isVisible("name") && <td>{getLocalized(item, "name", i18n.language)}</td>}
                    {isVisible("branches") && <td>{branchLabel}</td>}
                    {isVisible("levels") && <td>{levelLabel}</td>}
                    {isVisible("created_at") && <td>
                      {item.created_at ? formatDate(item.created_at) : "-"}
                    </td>}
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
                );
              })
            ) : (
              <EmptyState colSpan={7} message={t("courses.notFound")} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Courses;
