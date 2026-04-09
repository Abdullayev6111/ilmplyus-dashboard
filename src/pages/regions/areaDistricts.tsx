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

interface District {
  id: number;
  name: string;
  region_id: number;
}

const AreaDistricts = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [selectedDistricts, setSelectedDistricts] = useState<number[]>([]);
  const [districtName, setDistrictName] = useState("");
  const [editingItem, setEditingItem] = useState<District | null>(null);

  const { data: regions } = useQuery<Region[]>({
    queryKey: ["regions"],
    queryFn: async () => (await API.get("/regions")).data,
  });

  const { data: districts, isLoading } = useQuery<District[]>({
    queryKey: ["districts", selectedRegionId],
    queryFn: async () => {
      if (!selectedRegionId) return [];
      const { data } = await API.get(`/regions/${selectedRegionId}/districts`);
      return data;
    },
    enabled: !!selectedRegionId,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      API.post("/districts", {
        name: districtName,
        region_id: Number(selectedRegionId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["districts", selectedRegionId],
      });
      setShowAddModal(false);
      setDistrictName("");
      setEditingItem(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) =>
      API.put(`/districts/${id}`, {
        name,
        region_id: Number(selectedRegionId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["districts", selectedRegionId],
      });
      setShowAddModal(false);
      setDistrictName("");
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/districts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["districts", selectedRegionId],
      });
    },
  });

  const openEditModal = (item: District) => {
    setEditingItem(item);
    setDistrictName(item.name);
    setShowAddModal(true);
  };

  const confirmDelete = () => {
    if (deleteTarget === "all") {
      selectedDistricts.forEach((id) => deleteMutation.mutate(id));
      setSelectedDistricts([]);
    } else if (typeof deleteTarget === "number") {
      deleteMutation.mutate(deleteTarget);
      setSelectedDistricts((p) => p.filter((x) => x !== deleteTarget));
    }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const toggleAll = (checked: boolean) =>
    setSelectedDistricts(checked ? districts?.map((d) => d.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelectedDistricts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <section className="users container">
      <h1 className="main-title">{t("aside.districts")}</h1>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="districts-container">
            <h1>{t("aside.districts")}</h1>
            <form
              className="district-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (editingItem) {
                  updateMutation.mutate({
                    id: editingItem.id,
                    name: districtName,
                  });
                } else {
                  createMutation.mutate();
                }
              }}
            >
              <div className="district-form-group">
                <label>{t("branches.name")}</label>
                <input
                  type="text"
                  value={districtName}
                  onChange={(e) => setDistrictName(e.target.value)}
                  required
                />
              </div>

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
                    setDistrictName("");
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
        <button
          className="add-new-user"
          onClick={() => setShowAddModal(true)}
          disabled={!selectedRegionId}
        >
          {t("expenses.addBtn")}
        </button>

        <button
          className="delete-all"
          disabled={!selectedDistricts.length}
          onClick={() => {
            setDeleteTarget("all");
            setShowDeleteModal(true);
          }}
        >
          {t("expenses.delete")}
        </button>

        <select
          value={selectedRegionId}
          onChange={(e) => {
            setSelectedRegionId(e.target.value);
            setSelectedDistricts([]);
          }}
        >
          <option value="">{t("aside.regions")}</option>
          {regions?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selectedDistricts.length === (districts?.length || 0) &&
                    (districts?.length || 0) > 0
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
            ) : districts?.length ? (
              districts?.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedDistricts.includes(item.id)}
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
              <EmptyState
                colSpan={10}
                message={
                  selectedRegionId
                    ? t("districts.notFound")
                    : t("districts.choose")
                }
              />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AreaDistricts;
