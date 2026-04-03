import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { API } from "../../api/api";
import "../users/users.css";
import "./courses.css";
import { useTranslation } from "react-i18next";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";
import type { Level, LevelPayload, Course } from "../../types";

interface LevelFormData {
  name: string;
  course_id: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const CourseLevel = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<Level | null>(null);

  const [formData, setFormData] = useState<LevelFormData>({
    name: "",
    course_id: "",
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

  const { data: courses } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await API.get<Course[]>("/courses");
      return Array.isArray(data) ? data : (data as any)?.data || [];
    },
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const selectedCourseBranch = useMemo(() => {
    if (!formData.course_id || !courses) return "";
    const course = courses.find((c) => String(c.id) === formData.course_id);
    return course?.branch?.name || "";
  }, [formData.course_id, courses]);

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
    setFormData({ name: "", course_id: "" });
  };

  const openEditModal = (item: Level) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      course_id: String(item.course.id),
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
    setSelected(checked ? (levels?.map((l) => l.id) ?? []) : []);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <section className="users container">
      <h1 className="main-title">{t("aside.courseLevel")}</h1>

      {showModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory">
            <h1>{t("aside.courseLevel")}</h1>

            <form
              className="subcategory-form"
              onSubmit={(e) => {
                e.preventDefault();

                const payload: LevelPayload = {
                  name: formData.name.trim(),
                  course_id: Number(formData.course_id),
                };

                if (editingItem) {
                  updateMutation.mutate({ id: editingItem.id, payload });
                } else {
                  createMutation.mutate(payload);
                }
              }}
            >
              <div className="subcategory-form-group">
                <label>{t("courses.course")}</label>
                <select
                  value={formData.course_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      course_id: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">{t("courses.choose")}</option>
                  {courses?.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="subcategory-form-group">
                <label>{t("courses.branch")}</label>
                <input
                  type="text"
                  value={selectedCourseBranch}
                  readOnly
                  disabled
                />
              </div>

              <div className="subcategory-form-group">
                <label>{t("courses.levelName")}</label>
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
                <button type="button" className="cancel" onClick={resetForm}>
                  {t("expenses.cancel")}
                </button>

                <button className="primary" type="submit">
                  {t("expenses.save")}
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
                    selected.length === (levels?.length ?? 0) &&
                    (levels?.length ?? 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t("courses.course")}</th>
              <th>{t("courses.level")}</th>
              <th>{t("courses.branch")}</th>
              <th>{t("courses.createdDate")}</th>
              <th>{t("courses.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={7} />
            ) : levels && levels.length > 0 ? (
              levels.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td>{item.id}</td>
                  <td>{item.course?.name ?? "-"}</td>
                  <td>{item.name}</td>
                  <td>{item.course?.branch?.name ?? "-"}</td>
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
              <EmptyState colSpan={10} message={t("courses.notFound")} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default CourseLevel;
