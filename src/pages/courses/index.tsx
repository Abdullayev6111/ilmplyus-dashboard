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
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";
import type { Course, CoursePayload, Level } from "../../types";

interface CourseFormData {
  name: string;
  branch_id: string;
  level_id: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const Courses = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<Course | null>(null);

  const [formData, setFormData] = useState<CourseFormData>({
    name: "",
    branch_id: "",
    level_id: "",
  });

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
    setFormData({ name: "", branch_id: "", level_id: "" });
  };

  const openEditModal = (item: Course) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      branch_id: String(item.branch?.id || ""),
      level_id: String(item.level?.id || ""),
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
    setSelected(checked ? (courses?.map((c) => c.id) ?? []) : []);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <section className="users container">
      <h1 className="main-title">{t("courses.mainTitle")}</h1>

      {showModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory">
            <h1>{t("courses.course")}</h1>

            <form
              className="subcategory-form"
              onSubmit={(e) => {
                e.preventDefault();

                const payload: CoursePayload = {
                  name: formData.name.trim(),
                  branch_id: Number(formData.branch_id),
                  level_id: Number(formData.level_id),
                };

                if (editingItem) {
                  updateMutation.mutate({ id: editingItem.id, payload });
                } else {
                  createMutation.mutate(payload);
                }
              }}
            >
              <div className="subcategory-form-group">
                <label>{t("courses.courseName")}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="subcategory-form-group">
                <label>{t("courses.branch")}</label>
                <select
                  value={formData.branch_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      branch_id: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">{t("courses.choose")}</option>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="subcategory-form-group">
                <label>Daraja</label>
                <select
                  value={formData.level_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      level_id: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">{t("courses.choose")}</option>
                  {levels?.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button className="primary" type="submit">
                  {t("expenses.save")}
                </button>
                <button type="button" className="cancel" onClick={resetForm}>
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
                    selected.length === (courses?.length ?? 0) &&
                    (courses?.length ?? 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t("courses.courseName")}</th>
              <th>{t("courses.branch")}</th>
              <th>Daraja</th>
              <th>{t("courses.createdDate")}</th>
              <th>{t("courses.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={7} />
            ) : courses && courses.length > 0 ? (
              courses?.map((item) => (
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
                  <td>{item.branch?.name ?? "-"}</td>
                  <td>{item.level?.name ?? "-"}</td>
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

export default Courses;
