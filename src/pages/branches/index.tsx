import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import './branches.css';
import Loading from '../../components/Loading';
import { useTranslation } from 'react-i18next';

interface Branch {
  id: number;
  name: string;
  city: string;
  has_contract: number;
  director_name: string;
  address: string;
  postal_code: string;
  legal_name: string;
  inn: string;
  phone: string;
  email: string;
  bank_name: string;
  account_number: string;
  mfo: string;
  oked: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const Branches = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletionTarget, setDeletionTarget] = useState<number | 'all' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data: branchesApiData, isLoading } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await API.get('/branches');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const [branchFormData, setBranchFormData] = useState({
    filial_nomi: '',
    joylashtirish_shahri: '',
    manzil: '',
    direktor_fio: '',
    email: '',
    ishchi_raqami: '',
    oked: '',
    pochta_indeksi: '',
    yurdik_nomi: '',
    tashkilot_inn: '',
    telefon_nomer: '',
    bank_nomi: '',
    mfo: '',
    holat: true,
  });

  const createBranchMutation = useMutation({
    mutationFn: async (newBranch: typeof branchFormData) => {
      const payload = {
        name: newBranch.filial_nomi,
        city: newBranch.joylashtirish_shahri,
        address: newBranch.manzil,
        director_name: newBranch.direktor_fio,
        email: newBranch.email,
        account_number: newBranch.ishchi_raqami,
        oked: newBranch.oked,
        postal_code: newBranch.pochta_indeksi,
        legal_name: newBranch.yurdik_nomi,
        inn: newBranch.tashkilot_inn,
        phone: newBranch.telefon_nomer,
        bank_name: newBranch.bank_nomi,
        mfo: newBranch.mfo,
        is_active: newBranch.holat ? 1 : 0,
      };
      const { data } = await API.post('/branches', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setShowBranchModal(false);
      resetBranchForm();
    },
  });

  interface BranchUpdatePayload {
    name?: string;
    city?: string;
    address?: string;
    director_name?: string;
    email?: string;
    account_number?: string;
    oked?: string;
    postal_code?: string;
    legal_name?: string;
    inn?: string;
    phone?: string;
    bank_name?: string;
    mfo?: string;
    is_active?: number;
  }

  const updateBranchMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: BranchUpdatePayload }) => {
      const { data } = await API.put(`/branches/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setShowBranchModal(false);
      setEditingBranch(null);
      resetBranchForm();
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const resetBranchForm = () => {
    setBranchFormData({
      filial_nomi: '',
      joylashtirish_shahri: '',
      manzil: '',
      direktor_fio: '',
      email: '',
      ishchi_raqami: '',
      oked: '',
      pochta_indeksi: '',
      yurdik_nomi: '',
      tashkilot_inn: '',
      telefon_nomer: '',
      bank_nomi: '',
      mfo: '',
      holat: true,
    });
  };

  const handleBranchSubmit = () => {
    createBranchMutation.mutate(branchFormData);
  };

  const openBranchEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchFormData({
      filial_nomi: branch.name,
      joylashtirish_shahri: branch.city,
      manzil: branch.address,
      direktor_fio: branch.director_name,
      email: branch.email,
      ishchi_raqami: branch.account_number,
      oked: branch.oked,
      pochta_indeksi: branch.postal_code,
      yurdik_nomi: branch.legal_name,
      tashkilot_inn: branch.inn,
      telefon_nomer: branch.phone,
      bank_nomi: branch.bank_name,
      mfo: branch.mfo,
      holat: branch.is_active === 1,
    });
    setShowBranchModal(true);
  };

  const handleBranchEditSubmit = () => {
    if (editingBranch) {
      updateBranchMutation.mutate({
        id: editingBranch.id,
        updates: {
          name: branchFormData.filial_nomi,
          city: branchFormData.joylashtirish_shahri,
          address: branchFormData.manzil,
          director_name: branchFormData.direktor_fio,
          email: branchFormData.email,
          account_number: branchFormData.ishchi_raqami,
          oked: branchFormData.oked,
          postal_code: branchFormData.pochta_indeksi,
          legal_name: branchFormData.yurdik_nomi,
          inn: branchFormData.tashkilot_inn,
          phone: branchFormData.telefon_nomer,
          bank_name: branchFormData.bank_nomi,
          mfo: branchFormData.mfo,
          is_active: branchFormData.holat ? 1 : 0,
        },
      });
    } else {
      createBranchMutation.mutate(branchFormData);
    }
  };

  const filteredBranches = useMemo(() => {
    const branches = branchesApiData || [];

    return branches
      .filter((branch) => {
        const dateValue = branch.created_at.slice(0, 10);
        const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (dateFrom && dateTo) {
          return dateValue >= dateFrom && dateValue <= dateTo;
        }

        return true;
      })
      .sort((a, b) => a.id - b.id);
  }, [branchesApiData, searchTerm, dateFrom, dateTo]);

  const toggleAllBranches = (checked: boolean) =>
    setSelectedBranches(checked ? filteredBranches?.map((b) => b.id) : []);

  const toggleSingleBranch = (id: number) =>
    setSelectedBranches((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const confirmBranchDeletion = () => {
    if (deletionTarget === 'all') {
      selectedBranches.forEach((id) => deleteBranchMutation.mutate(id));
      setSelectedBranches([]);
    }

    if (typeof deletionTarget === 'number') {
      deleteBranchMutation.mutate(deletionTarget);
      setSelectedBranches((prev) => prev.filter((x) => x !== deletionTarget));
    }

    setShowDeleteConfirmation(false);
    setDeletionTarget(null);
  };

  if (isLoading)
    return (
      <div>
        <Loading />
      </div>
    );

  return (
    <section className="branch-container container">
      <h1 className="branch-page-title">{t('branches.listTitle')}</h1>

      {showBranchModal && (
        <div className="branch-modal-overlay">
          <div className="branch-modal branch-add-modal">
            <h3 className="branch-modal-heading">
              {editingBranch ? t('branches.editBranchTitle') : t('branches.addNewBranchTitle')}
            </h3>

            <div className="branch-form-wrapper">
              <div className="branch-form-left">
                <div className="branch-input-group">
                  <label>{t('branches.branchName')}</label>
                  <input
                    type="text"
                    value={branchFormData.filial_nomi}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, filial_nomi: e.target.value })
                    }
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.location')}</label>
                  <input
                    type="text"
                    value={branchFormData.joylashtirish_shahri}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, joylashtirish_shahri: e.target.value })
                    }
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.address')}</label>
                  <input
                    type="text"
                    value={branchFormData.manzil}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, manzil: e.target.value })
                    }
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.director')}</label>
                  <input
                    type="text"
                    value={branchFormData.direktor_fio}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, direktor_fio: e.target.value })
                    }
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.email')}</label>
                  <input
                    type="text"
                    value={branchFormData.email}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, email: e.target.value })
                    }
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.accountNumber')}</label>
                  <input
                    type="text"
                    value={branchFormData.ishchi_raqami}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, ishchi_raqami: e.target.value })
                    }
                  />
                </div>

                <div className="branch-input-group">
                  <label>OKED</label>
                  <input
                    type="text"
                    value={branchFormData.oked}
                    onChange={(e) => setBranchFormData({ ...branchFormData, oked: e.target.value })}
                  />
                </div>
              </div>

              <div className="branch-form-right">
                <div className="branch-input-group">
                  <label>{t('branches.index')}</label>
                  <input
                    type="text"
                    value={branchFormData.pochta_indeksi}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, pochta_indeksi: e.target.value })
                    }
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.legalName')}</label>
                  <input
                    type="text"
                    value={branchFormData.yurdik_nomi}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, yurdik_nomi: e.target.value })
                    }
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.organizationInn')}</label>
                  <input
                    type="text"
                    value={branchFormData.tashkilot_inn}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, tashkilot_inn: e.target.value })
                    }
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.phoneNumber')}</label>
                  <input
                    type="text"
                    value={branchFormData.telefon_nomer}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, telefon_nomer: e.target.value })
                    }
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.bankName')}</label>
                  <input
                    type="text"
                    value={branchFormData.bank_nomi}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, bank_nomi: e.target.value })
                    }
                  />
                </div>

                <div className="branch-input-group">
                  <label>MFO</label>
                  <input
                    type="text"
                    value={branchFormData.mfo}
                    onChange={(e) => setBranchFormData({ ...branchFormData, mfo: e.target.value })}
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.status')}</label>
                  <div className="branch-toggle-wrapper">
                    <button
                      type="button"
                      className={branchFormData.holat ? '' : 'branch-active-btn'}
                      onClick={() => setBranchFormData({ ...branchFormData, holat: false })}
                    >
                      {t('branches.inactive')}
                    </button>
                    <button
                      type="button"
                      className={branchFormData.holat ? 'branch-active-btn' : ''}
                      onClick={() => setBranchFormData({ ...branchFormData, holat: true })}
                    >
                      {t('branches.active')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="branch-modal-buttons">
              <button
                className="branch-cancel-btn"
                onClick={() => {
                  setShowBranchModal(false);
                  setEditingBranch(null);
                  resetBranchForm();
                }}
              >
                {t('branches.cancel')}
              </button>
              <button
                className="branch-save-btn"
                onClick={editingBranch ? handleBranchEditSubmit : handleBranchSubmit}
                disabled={createBranchMutation.isPending || updateBranchMutation.isPending}
              >
                {createBranchMutation.isPending || updateBranchMutation.isPending
                  ? t('branches.saving')
                  : t('branches.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmation && (
        <div className="branch-modal-overlay">
          <div className="branch-modal branch-small-modal">
            <h3>{t('branches.confirmDelete')}</h3>

            <div className="branch-modal-buttons">
              <button
                className="branch-cancel-btn"
                onClick={() => setShowDeleteConfirmation(false)}
              >
                {t('branches.cancel')}
              </button>
              <button className="branch-danger-btn" onClick={confirmBranchDeletion}>
                {t('branches.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="branch-filter-panel">
        <button className="branch-add-btn" onClick={() => setShowBranchModal(true)}>
          {t('branches.addNew')}
        </button>

        <button
          className="branch-delete-btn"
          disabled={!selectedBranches.length}
          onClick={() => {
            setDeletionTarget('all');
            setShowDeleteConfirmation(true);
          }}
        >
          {t('branches.delete')}
        </button>

        <input
          placeholder={t('branches.search')}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="branch-search-input"
        />

        <div style={{ position: 'relative' }}>
          <input
            type="text"
            readOnly
            placeholder={t('branches.dateFilter')}
            value={dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : ''}
            onClick={() => setShowDatePicker(true)}
            className="branch-date-input"
          />

          {showDatePicker && (
            <div className="branch-date-picker">
              <input type="date" onChange={(e) => setDateFrom(e.target.value)} />
              <input
                type="date"
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setShowDatePicker(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="branch-table-container">
        <table className="branch-data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selectedBranches.length === filteredBranches.length &&
                    filteredBranches.length > 0
                  }
                  onChange={(e) => toggleAllBranches(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t('branches.name')}</th>
              <th>{t('branches.address')}</th>
              <th>{t('branches.email')}</th>
              <th>{t('branches.accountNumber')}</th>
              <th>{t('branches.index')}</th>
              <th>{t('branches.date')}</th>
              <th>{t('branches.actions')}</th>
            </tr>
          </thead>

          <tbody>
            {filteredBranches?.map((branch) => (
              <tr key={branch.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(branch.id)}
                    onChange={() => toggleSingleBranch(branch.id)}
                  />
                </td>

                <td>{branch.id}</td>
                <td>{branch.name}</td>
                <td>{branch.address}</td>
                <td>{branch.email}</td>
                <td>{branch.account_number}</td>
                <td>{branch.postal_code}</td>
                <td>{branch.created_at.slice(0, 10).replaceAll('-', '.')}</td>

                <td className="branch-action-cell">
                  <button className="branch-edit-icon" onClick={() => openBranchEditModal(branch)}>
                    <i className="fa-solid fa-pen"></i>
                  </button>

                  <button
                    className="branch-delete-icon"
                    onClick={() => {
                      setDeletionTarget(branch.id);
                      setShowDeleteConfirmation(true);
                    }}
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Branches;
