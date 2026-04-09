import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "../../api/api";
import "./regions.css";
import "../users/users.css";
import { useTranslation } from "react-i18next";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";

interface Region {
  id: number;
  name: string;
}

const AreaRegions = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [regionName, setRegionName] = useState("");
  const [editingItem, setEditingItem] = useState<Region | null>(null);

  const { data: regions, isLoading } = useQuery<Region[]>({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await API.get("/regions");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => API.post("/regions", { name: regionName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      setShowAddModal(false);
      setRegionName("");
      setEditingItem(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) =>
      API.put(`/regions/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      setShowAddModal(false);
      setRegionName("");
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/regions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
    },
  });

  const openEditModal = (item: Region) => {
    setEditingItem(item);
    setRegionName(item.name);
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
    setSelected(checked ? regions?.map((r) => r.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <section className="users container">
      <h1 className="main-title">{t("aside.regions")}</h1>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="regions-category">
            <h1>{t("aside.regions")}</h1>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingItem) {
                  updateMutation.mutate({
                    id: editingItem.id,
                    name: regionName,
                  });
                } else {
                  createMutation.mutate();
                }
              }}
            >
              <label>{t("branches.name")}</label>

              <input
                type="text"
                value={regionName}
                onChange={(e) => setRegionName(e.target.value)}
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
                    setRegionName("");
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
                    selected.length === (regions?.length || 0) &&
                    (regions?.length || 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t("branches.name")}</th>
              <th>{t("expenses.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={4} />
            ) : regions?.length ? (
              regions?.map((item) => (
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
              <EmptyState colSpan={10} message={t("regions.notFound")} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AreaRegions;
