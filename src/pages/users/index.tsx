import { useState, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { API } from "../../api/api";
import "./users.css";
import { useTranslation } from "react-i18next";
import TableSkeleton from "../../components/TableSkeleton";
import EmptyState from "../../components/EmptyState";
import type { User, UsersResponse, Branch, Position, Role } from "../../types";
import { useTableSettingsStore } from "../../store/useTableSettingsStore";

const genPassword = () =>
  Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

const Users = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [editingId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [workTimeId, setWorkTimeId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | "all" | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // const [password, setPassword] = useState(genPassword());
  const [showRange, setShowRange] = useState(false);
  const [userImage, setUserImage] = useState<File | null>(null);

  const { settings } = useTableSettingsStore();
  const userSettings = settings.users || {};
  const isVisible = (colId: string) => userSettings[colId] ?? true;

  const { data: apiData, isLoading } = useQuery<UsersResponse>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await API.get("/users");
      return data;
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const [formData, setFormData] = useState({
    familiya: "",
    ism: "",
    sharif: "",
    pinfl: "",
    phone: "",
    username: "",
    password: genPassword(),
    start_date: "",
    role_ids: [] as string[],
    branch_ids: [] as string[],
    type: "",
    position_id: "",
    is_active: true,
  });

  const addRole = (roleId: string) => {
    if (roleId && !formData.role_ids.includes(roleId)) {
      setFormData({ ...formData, role_ids: [...formData.role_ids, roleId] });
    }
  };

  const removeRole = (roleId: string) => {
    setFormData({
      ...formData,
      role_ids: formData.role_ids.filter((id) => id !== roleId),
    });
  };

  const addBranch = (branchId: string) => {
    if (branchId && !formData.branch_ids.includes(branchId)) {
      setFormData({
        ...formData,
        branch_ids: [...formData.branch_ids, branchId],
      });
    }
  };

  const removeBranch = (branchId: string) => {
    setFormData({
      ...formData,
      branch_ids: formData.branch_ids.filter((id) => id !== branchId),
    });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        full_name:
          `${formData.familiya} ${formData.ism} ${formData.sharif}`.trim(),
        username: formData.username,
        pinfl: formData.pinfl,
        phone: formData.phone,
        password: formData.password,
        position_id: formData.position_id
          ? Number(formData.position_id)
          : undefined,
        branch_id:
          formData.branch_ids.length > 0
            ? Number(formData.branch_ids[0])
            : undefined,
        roles: formData.role_ids.map(Number),
        is_active: formData.is_active,
      };

      if (userImage) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v === undefined) return;
          if (Array.isArray(v)) {
            v.forEach((item) => fd.append(`${k}[]`, String(item)));
          } else {
            fd.append(k, String(v));
          }
        });
        fd.append("image", userImage);
        const res = await API.post("/users", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
      }

      const res = await API.post("/users", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowAddModal(false);
      setUserImage(null);
      resetForm();
    },
  });

  const { data: branchesData } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await API.get("/branches");
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const { data: positionsData } = useQuery<Position[]>({
    queryKey: ["positions"],
    queryFn: async () => {
      const { data } = await API.get("/positions");
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const { data: rolesData } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data } = await API.get("/roles");
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const roles = rolesData || [];

  const branches = branchesData || [];
  const positions = positionsData || [];

  const handleSubmit = () => {
    createMutation.mutate();
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      familiya: user.full_name.split(" ")[0] || "",
      ism: user.full_name.split(" ")[1] || "",
      sharif: user.full_name.split(" ")[2] || "",
      pinfl: user.pinfl || "",
      phone: user.phone,
      username: user.username,
      password: "",
      start_date: user.created_at.slice(0, 10),
      role_ids: user.roles?.map((r) => r.id.toString()),
      branch_ids: user.branch ? [user.branch.id.toString()] : [],
      type: user.type,
      position_id: "",
      is_active: user.is_active,
    });
    setShowAddModal(true);
  };

  const handleEditSubmit = () => {
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        updates: {
          full_name:
            `${formData.familiya} ${formData.ism} ${formData.sharif}`.trim(),
          username: formData.username,
          pinfl: formData.pinfl,
          phone: formData.phone,
          roles: formData.role_ids.map(Number),
          branch_id:
            formData.branch_ids.length > 0
              ? Number(formData.branch_ids[0])
              : null,
          position_id: formData.position_id
            ? Number(formData.position_id)
            : null,
          is_active: formData.is_active,
        },
      });
    } else {
      createMutation.mutate();
    }
  };

  interface UpdateUserPayload {
    full_name?: string;
    username?: string;
    pinfl?: string;
    phone?: string;
    roles?: number[];
    branch_id?: number | null;
    position_id?: number | null;
    is_active?: boolean;
  }

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number;
      updates: UpdateUserPayload;
    }) => {
      const { data } = await API.put(`/users/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowAddModal(false);
      setEditingUser(null);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      familiya: "",
      ism: "",
      sharif: "",
      pinfl: "",
      phone: "",
      username: "",
      password: genPassword(),
      start_date: "",
      role_ids: [],
      branch_ids: [],
      type: "",
      position_id: "",
      is_active: true,
    });
    setEditingUser(null);
    setUserImage(null);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const filtered = useMemo(() => {
    const users = apiData?.data || [];

    return users
      .filter((u) => {
        const d = u.created_at.slice(0, 10);
        const matchSearch = u.full_name
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchRole = role ? u.roles[0]?.name === role : true;

        if (!matchSearch || !matchRole) return false;

        if (fromDate && toDate) {
          return d >= fromDate && d <= toDate;
        }

        return true;
      })
      .sort((a, b) => a.id - b.id);
  }, [apiData?.data, search, role, fromDate, toDate]);

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? filtered?.map((u) => u.id) : []);

  const toggleOne = (id: number) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

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

  const archiveUser = (u: User) => {
    const archived = JSON.parse(localStorage.getItem("archivedUsers") || "[]");
    localStorage.setItem("archivedUsers", JSON.stringify([...archived, u]));
    deleteMutation.mutate(u.id);
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/png", "image/jpeg"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Only PNG or JPG format is allowed");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert("Maximum file size is 5MB");
      e.target.value = "";
      return;
    }

    setUserImage(file);
  };

  return (
    <section className="users container">
      <h1 className="main-title">{t("users.listTitle")}</h1>
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal add-user-modal">
            <h3 className="modal-title">
              {editingUser
                ? t("users.userEditTitle")
                : t("users.addNewUserTitle")}
            </h3>

            <div className="add-user-form">
              <div className="form-left">
                <div className="form-group">
                  <label>{t("users.lastName")}</label>
                  <input
                    type="text"
                    value={formData.familiya}
                    onChange={(e) =>
                      setFormData({ ...formData, familiya: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>{t("users.firstName")}</label>
                  <input
                    type="text"
                    value={formData.ism}
                    onChange={(e) =>
                      setFormData({ ...formData, ism: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>{t("users.familyName")}</label>
                  <input
                    type="text"
                    value={formData.sharif}
                    onChange={(e) =>
                      setFormData({ ...formData, sharif: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>{t("users.pinfl")}</label>
                  <input
                    type="text"
                    value={formData.pinfl}
                    maxLength={14}
                    onChange={(e) => {
                      const val = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 14);
                      setFormData({ ...formData, pinfl: val });
                    }}
                  />
                  {formData.pinfl.length > 0 &&
                    formData.pinfl.length !== 14 && (
                      <span
                        className="error-text"
                        style={{
                          color: "red",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {t("users.pinflError")}
                      </span>
                    )}
                </div>
                <div className="form-group">
                  <label>{t("users.phoneNumber")}</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>{t("users.loginText")}</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>{t("users.password")}</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder={t("users.passwordPlaceholder")}
                    />
                    <button
                      className="refresh-password"
                      type="button"
                      title={t("users.generatePasswordTooltip")}
                      onClick={() => {
                        const newPass = genPassword();
                        setFormData({ ...formData, password: newPass });
                      }}
                    >
                      🔄
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t("users.startDate")}</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>{t("users.imageLabel")}</label>

                  <div className="file-upload-wrapper">
                    <input
                      id="userImage"
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleFileChange}
                      className="file-input"
                    />
                    <label htmlFor="userImage" className="file-upload-btn">
                      {t("users.upload")}
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-right">
                <div className="form-group">
                  <label>{t("users.roles")}</label>
                  <div className="selected-items-box">
                    {formData.role_ids?.map((roleId) => {
                      const role = roles.find(
                        (r) => r.id.toString() === roleId,
                      );
                      return (
                        <div key={roleId} className="selected-item">
                          {role?.name || roleId}
                          <button onClick={() => removeRole(roleId)}>×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <select
                    onChange={(e) => {
                      addRole(e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">{t("users.choose")}</option>
                    {roles?.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t("users.branches")}</label>
                  <div className="selected-items-box">
                    {formData.branch_ids?.map((branchId) => {
                      const branch = branches.find(
                        (b) => b.id.toString() === branchId,
                      );
                      return (
                        <div key={branchId} className="selected-item">
                          {branch?.address || branchId}
                          <button onClick={() => removeBranch(branchId)}>
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <select
                    onChange={(e) => {
                      addBranch(e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">{t("users.choose")}</option>
                    {branches?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.address}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t("users.position")}</label>
                  <select
                    value={formData.position_id}
                    onChange={(e) =>
                      setFormData({ ...formData, position_id: e.target.value })
                    }
                  >
                    <option value="">{t("users.choose")}</option>
                    {positions?.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t("users.endDate")}</label>
                  <input type="date" />
                </div>

                <div className="form-group">
                  <div className="toggle-buttons">
                    <button
                      type="button"
                      className={formData.is_active ? "" : "active"}
                      onClick={() =>
                        setFormData({ ...formData, is_active: false })
                      }
                    >
                      {t("users.inactive")}
                    </button>
                    <button
                      type="button"
                      className={formData.is_active ? "active" : ""}
                      onClick={() =>
                        setFormData({ ...formData, is_active: true })
                      }
                    >
                      {t("users.active")}
                    </button>
                  </div>
                </div>

                {!formData.is_active && (
                  <div className="form-group">
                    <label>{t("users.isActive")}</label>
                    <div className="checkbox-group">
                      <label>
                        <input type="checkbox" /> {t("users.yes")}
                      </label>
                      <label>
                        <input type="checkbox" /> {t("users.no")}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="primary"
                onClick={editingUser ? handleEditSubmit : handleSubmit}
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  formData.pinfl.length !== 14
                }
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t("users.saving")
                  : t("users.save")}
              </button>

              <button
                className="cancel"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                  resetForm();
                }}
              >
                {t("users.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t("users.confirmDelete")}</h3>

            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                {t("users.confirm")}
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
        <button className="add-new-user" onClick={() => setShowAddModal(true)}>
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

        <select onChange={(e) => setRole(e.target.value)}>
          <option value="">{t("users.employeeType")}</option>
          {roles?.map((role) => (
            <option key={role.id} value={role.name}>
              {role.name}
            </option>
          ))}
        </select>

        <input
          placeholder={t("users.search")}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div style={{ position: "relative" }}>
          <input
            type="text"
            readOnly
            placeholder={t("users.dateFilter")}
            value={fromDate && toDate ? `${fromDate} - ${toDate}` : ""}
            onClick={() => setShowRange(true)}
          />

          {showRange && (
            <div className="range-box">
              <input
                type="date"
                onChange={(e) => setFromDate(e.target.value)}
              />

              <input
                type="date"
                onChange={(e) => {
                  setToDate(e.target.value);
                  setShowRange(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selected.length === filtered.length && filtered.length > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              {isVisible("id") && <th>ID</th>}
              {isVisible("full_name") && <th>{t("users.fish")}</th>}
              {isVisible("phone") && <th>{t("users.phone")}</th>}
              {isVisible("role") && <th>{t("users.role")}</th>}
              {isVisible("status") && <th>{t("users.status")}</th>}
              {isVisible("branch") && <th>{t("users.branch")}</th>}
              {isVisible("username") && <th>{t("users.loginText")}</th>}
              {isVisible("date") && <th>{t("users.date")}</th>}
              <th>{t("users.actions")}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={10} />
            ) : filtered.length > 0 ? (
              filtered?.map((u) => (
                <tr key={u.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(u.id)}
                      onChange={() => toggleOne(u.id)}
                    />
                  </td>

                  {isVisible("id") && <td>{u.id}</td>}

                  {isVisible("full_name") && (
                    <td>
                      {editingId === u.id ? (
                        <input
                          value={u.full_name}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: u.id,
                              updates: { full_name: e.target.value },
                            })
                          }
                        />
                      ) : (
                        u.full_name
                      )}
                    </td>
                  )}

                  {isVisible("phone") && <td>{u.phone}</td>}
                  {isVisible("role") && <td>{u.roles[0]?.name || "-"}</td>}
                  {isVisible("status") && (
                    <td>
                      {u.is_active ? t("users.active") : t("users.inactive")}
                    </td>
                  )}
                  {isVisible("branch") && <td>{u.branch?.address || "-"}</td>}
                  {isVisible("username") && <td>{u.username}</td>}
                  {isVisible("date") && (
                    <td>{u.created_at.slice(0, 10).replaceAll("-", ".")}</td>
                  )}

                  <td className="actions">
                    <div style={{ position: "relative" }}>
                      <button
                        className="user-workTime-btn"
                        onClick={() => setWorkTimeId(u.id)}
                      >
                        <i className="fa-solid fa-clock"></i>
                      </button>

                      {workTimeId === u.id && (
                        <div
                          style={{
                            position: "absolute",
                            top: -60,
                            left: -40,
                            background: "#fff",
                            border: "1px solid #003366",
                            padding: 8,
                          }}
                        >
                          <input type="time" step="60" lang="ru" />
                          <button onClick={() => setWorkTimeId(null)}>
                            OK
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      className="user-archive-btn"
                      onClick={() => archiveUser(u)}
                    >
                      <i className="fa-solid fa-box-archive"></i>
                    </button>

                    <button
                      className="user-edit-btn"
                      onClick={() => openEditModal(u)}
                    >
                      <i className="fa-solid fa-pen"></i>
                    </button>

                    <button
                      className="user-delete-btn"
                      onClick={() => {
                        setDeleteTarget(u.id);
                        setShowDeleteModal(true);
                      }}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyState colSpan={10} message={t("users.notFound")} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Users;
