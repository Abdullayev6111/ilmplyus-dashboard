import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "../../api/api";
import "./roles.css";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";
import type { Role, Branch } from "../../types/common.types";
import { getLocalized } from "../../utils/getLocalized";

const Roles = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  const [roleFormData, setRoleFormData] = useState<{
    name: string;
    branch_ids: number[];
  }>({
    name: "",
    branch_ids: [],
  });

  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data } = await API.get("/roles");
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await API.get("/branches");
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (newRole: { name: string; branch_ids: number[] }) => {
      const { data } = await API.post("/roles", newRole);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setShowRoleModal(false);
      resetRoleForm();
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number;
      updates: { name: string; branch_ids: number[] };
    }) => {
      const { data } = await API.put(`/roles/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setShowRoleModal(false);
      setEditingRole(null);
      resetRoleForm();
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const resetRoleForm = () => {
    setRoleFormData({
      name: "",
      branch_ids: [],
    });
  };

  const handleRoleSubmit = () => {
    const payload = {
      name: roleFormData.name,
      branch_ids: roleFormData.branch_ids,
    };
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, updates: payload });
    } else {
      createRoleMutation.mutate(payload);
    }
  };

  const openRoleEditModal = (role: Role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      branch_ids: role.branches ? role.branches.map((b) => Number(b.id)) : [],
    });
    setShowRoleModal(true);
  };

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? roles?.map((r) => r.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const handleBatchDelete = () => {
    if (
      window.confirm(
        t("roles.confirmBatchDelete", "Tanlanganlarni haqiqatan ham o'chirmoqchimisiz?")
      )
    ) {
      selected.forEach((id) => deleteRoleMutation.mutate(id));
      setSelected([]);
    }
  };

  return (
    <section className="role-container container">
      <h1 className="role-page-title">
        {t("roles.listTitle", "Amallar ro'yxati")}
      </h1>

      <div className="role-header-actions">
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="role-add-btn"
            onClick={() => {
              resetRoleForm();
              setEditingRole(null);
              setShowRoleModal(true);
            }}
          >
            {t("roles.addNew", "Yangi ro'l qo'shish")}
          </button>
          
          <button
            className="delete-all"
            disabled={!selected.length}
            onClick={handleBatchDelete}
            style={{ width: "auto", padding: "0 15px", borderRadius: "10px" }}
          >
            {t("roles.delete", "O'chirish")}
          </button>
        </div>
      </div>

      {showRoleModal && (
        <div className="role-modal-overlay">
          <div className="role-modal">
            <h3 className="role-modal-heading">
              {editingRole
                ? t("roles.editRole", "Ro'lni tahrirlash")
                : t("roles.addNewRole", "Yangi ro'l qo'shish")}
            </h3>

            <div className="role-form-wrapper">
              <div className="role-input-group">
                <label>{t("roles.roleName", "Ro'l nomi")}</label>
                <input
                  type="text"
                  placeholder={t("roles.rolePlaceholder", "Nomini kiriting")}
                  value={roleFormData.name}
                  onChange={(e) =>
                    setRoleFormData({ ...roleFormData, name: e.target.value })
                  }
                />
              </div>

              <div className="role-input-group">
                <label>{t("roles.branches", "Filiallar")}</label>
                <select
                  value=""
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value && !roleFormData.branch_ids.includes(value)) {
                      setRoleFormData((prev) => ({
                        ...prev,
                        branch_ids: [...prev.branch_ids, value],
                      }));
                    }
                  }}
                  className="role-selector-input"
                >
                  <option value="">
                    {t("roles.selectBranchPlaceholder", "Filialni tanlang")}
                  </option>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {getLocalized(branch, 'name', i18n.language)}
                    </option>
                  ))}
                </select>

                {roleFormData.branch_ids.length > 0 && (
                  <div className="selected-branches">
                    {roleFormData.branch_ids.map((id) => {
                      const branch = branches?.find((b) => b.id === id);
                      return (
                        <div key={id} className="branch-chip">
                          {branch ? getLocalized(branch, 'name', i18n.language) : id}
                          <button
                            type="button"
                            onClick={() =>
                              setRoleFormData((prev) => ({
                                ...prev,
                                branch_ids: prev.branch_ids.filter(
                                  (x) => x !== id,
                                ),
                              }))
                            }
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="role-modal-buttons">
              <button
                className="role-save-btn"
                onClick={handleRoleSubmit}
                disabled={
                  createRoleMutation.isPending ||
                  updateRoleMutation.isPending ||
                  !roleFormData.name
                }
              >
                {createRoleMutation.isPending || updateRoleMutation.isPending
                  ? t("roles.saving", "Saqlanmoqda...")
                  : t("roles.save", "Saqlash")}
              </button>

              <button
                className="role-cancel-btn"
                onClick={() => {
                  setShowRoleModal(false);
                  setEditingRole(null);
                  resetRoleForm();
                }}
              >
                {t("roles.cancel", "Bekor qilish")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="role-table-container">
        <table className="role-data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selected.length > 0 && selected.length === roles?.length
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t("roles.name", "Nomi")}</th>
              <th>{t("roles.branchesList", "Filiallar")}</th>
              <th>{t("roles.actions", "Harakatlar")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={5} columnCount={4} />
            ) : roles && roles.length > 0 ? (
              roles.map((role) => (
                <tr key={role.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(role.id)}
                      onChange={() => toggleOne(role.id)}
                    />
                  </td>
                  <td>{role.id}</td>
                  <td>{role.name}</td>
                  <td>
                    {role.branches && role.branches.length > 0
                      ? role.branches.map((b) => getLocalized(b, 'name', i18n.language)).join(", ")
                      : t("roles.noBranches", "Filial yo'q")}
                  </td>
                  <td className="role-action-cell">
                    <button
                      className="role-edit-icon"
                      onClick={() => openRoleEditModal(role)}
                      title={t("roles.edit", "Tahrirlash")}
                    >
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button
                      className="role-delete-icon"
                      onClick={() => {
                        if (
                          window.confirm(
                            t(
                              "roles.confirmDelete",
                              "Haqiqatan ham o'chirmoqchimisiz?",
                            ),
                          )
                        ) {
                          deleteRoleMutation.mutate(role.id);
                        }
                      }}
                      title={t("roles.delete", "O'chirish")}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                    <button
                      className="role-permission-icon"
                      onClick={() => navigate(`/roles/${role.id}/permissions`)}
                      title={t("roles.assignPermissions", "Huquqlar berish")}
                    >
                      <i className="fa-solid fa-shield-halved"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyState
                colSpan={5}
                message={t("roles.notFound", "Ro'llar topilmadi")}
              />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Roles;
