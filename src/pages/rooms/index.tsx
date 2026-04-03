import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "../../api/api";
import "../users/users.css";
import "../expenses/expenses.css";
import { useTranslation } from "react-i18next";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";

interface Branch {
  id: number;
  name: string;
}

interface Room {
  id: number;
  name: string;
  branch_id: number;
  capacity: number;
  floor: number;
  branch?: string;
}

interface RoomFormData {
  name: string;
  branch_id: string;
  capacity: string;
  floor: string;
}

const Rooms = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<Room | null>(null);

  const [formData, setFormData] = useState<RoomFormData>({
    name: "",
    branch_id: "",
    capacity: "",
    floor: "",
  });

  const [archivedIds, setArchivedIds] = useState<number[]>(() => {
    const stored = localStorage.getItem("archivedRoomIds");
    return stored ? JSON.parse(stored) : [];
  });

  const { data: rooms, isLoading } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data } = await API.get("/rooms");
      return data.data;
    },
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await API.get("/branches");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      API.post("/rooms", {
        name: formData.name,
        branch_id: Number(formData.branch_id),
        capacity: Number(formData.capacity),
        floor: Number(formData.floor),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setShowAddModal(false);
      setEditingItem(null);
      setFormData({ name: "", branch_id: "", capacity: "", floor: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: RoomFormData;
    }) =>
      API.put(`/rooms/${id}`, {
        name: payload.name,
        branch_id: Number(payload.branch_id),
        capacity: Number(payload.capacity),
        floor: Number(payload.floor),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setShowAddModal(false);
      setEditingItem(null);
      setFormData({ name: "", branch_id: "", capacity: "", floor: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/rooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });

  const openEditModal = (item: Room) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      branch_id: String(item.branch_id),
      capacity: String(item.capacity),
      floor: String(item.floor),
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

  const archiveItem = (item: Room) => {
    const newArchivedIds = [...archivedIds, item.id];
    setArchivedIds(newArchivedIds);
    localStorage.setItem("archivedRoomIds", JSON.stringify(newArchivedIds));

    const allArchived = JSON.parse(
      localStorage.getItem("archivedRooms") || "[]",
    );
    localStorage.setItem(
      "archivedRooms",
      JSON.stringify([...allArchived, item]),
    );
  };

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? rooms?.map((r) => r.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <section className="users container">
      <h1 className="main-title">{t("rooms.rooms")}</h1>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory">
            <h1>{t("rooms.rooms")}</h1>

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
                <label>{t("rooms.branch")}</label>
                <select
                  value={formData.branch_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      branch_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">{t("rooms.choose")}</option>
                  {branches?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="subcategory-form-group">
                <label>{t("rooms.roomName")}</label>
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
                <label>{t("rooms.capacity")}</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  required
                />
              </div>

              <div className="subcategory-form-group">
                <label>{t("rooms.floor")}</label>
                <input
                  type="number"
                  value={formData.floor}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    setFormData({
                      name: "",
                      branch_id: "",
                      capacity: "",
                      floor: "",
                    });
                  }}
                >
                  {t("rooms.cancel")}
                </button>

                <button className="primary" type="submit">
                  {t("rooms.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t("rooms.confirmDelete")}</h3>

            <div className="modal-actions">
              <button
                className="cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                {t("rooms.cancel")}
              </button>

              <button className="danger" onClick={confirmDelete}>
                {t("rooms.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-filters">
        <button className="add-new-user" onClick={() => setShowAddModal(true)}>
          {t("rooms.addBtn")}
        </button>

        <button
          className="delete-all"
          disabled={!selected.length}
          onClick={() => {
            setDeleteTarget("all");
            setShowDeleteModal(true);
          }}
        >
          {t("rooms.delete")}
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
                    selected.length === (rooms?.length || 0) &&
                    (rooms?.length || 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t("rooms.branchName")}</th>
              <th>{t("rooms.roomName")}</th>
              <th>{t("rooms.capacity")}</th>
              <th>{t("rooms.floor")}</th>
              <th>{t("rooms.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={7} />
            ) : rooms?.length ? (
              rooms.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>

                  <td>{item.id}</td>
                  <td>{item.branch || "-"}</td>
                  <td>{item.name}</td>
                  <td>{item.capacity}</td>
                  <td>{item.floor}</td>

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
              <EmptyState colSpan={10} message={t("rooms.notFound")} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Rooms;
