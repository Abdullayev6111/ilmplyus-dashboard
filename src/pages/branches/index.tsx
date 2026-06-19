import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import './branches.css';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '../../utils/getLocalized';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { Protected } from '../../components/Protected';

interface Branch {
  id: number;
  name: string;
  branch_code?: string;
  city: string;
  has_contract: number;
  director_name: string;
  address: string;
  legal_address_uz?: string;
  legal_address_ru?: string;
  legal_address_en?: string;
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

const emptyForm = {
  filial_nomi: '',
  branch_code: '',
  yuridik_nomi: '',
  tashkilot_inn: '',
  yuridik_manzil_uz: '',
  yuridik_manzil_ru: '',
  yuridik_manzil_en: '',
  pochta_indeksi: '',
  direktor_fio: '',
  bank_nomi: '',
  ishchi_raqami: '',
  mfo: '',
  oked: '',
  manzil: '',
  telefon_nomer: '',
  holat: true,
  arxivga_olinsin: false,
};

const Branches = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletionTarget, setDeletionTarget] = useState<number | 'all' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [branchFormData, setBranchFormData] = useState(emptyForm);

  const { data: branchesApiData, isLoading } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await API.get('/branches');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const buildPayload = (form: typeof emptyForm) => ({
    name: form.filial_nomi,
    branch_code: form.branch_code,
    legal_name: form.yuridik_nomi,
    inn: form.tashkilot_inn,
    legal_address_uz: form.yuridik_manzil_uz,
    legal_address_ru: form.yuridik_manzil_ru,
    legal_address_en: form.yuridik_manzil_en,
    postal_code: form.pochta_indeksi,
    director_name: form.direktor_fio,
    bank_name: form.bank_nomi,
    account_number: form.ishchi_raqami,
    mfo: form.mfo,
    oked: form.oked,
    address: form.manzil,
    phone: form.telefon_nomer,
    is_active: form.holat ? 1 : 0,
  });

  const createBranchMutation = useMutation({
    mutationFn: async (form: typeof emptyForm) => {
      const { data } = await API.post('/branches', buildPayload(form));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setShowBranchModal(false);
      setBranchFormData(emptyForm);
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: async ({ id, form }: { id: number; form: typeof emptyForm }) => {
      const { data } = await API.put(`/branches/${id}`, buildPayload(form));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setShowBranchModal(false);
      setEditingBranch(null);
      setBranchFormData(emptyForm);
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

  const openBranchEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchFormData({
      filial_nomi: branch.name || '',
      branch_code: branch.branch_code || '',
      yuridik_nomi: branch.legal_name || '',
      tashkilot_inn: branch.inn || '',
      yuridik_manzil_uz: branch.legal_address_uz || '',
      yuridik_manzil_ru: branch.legal_address_ru || '',
      yuridik_manzil_en: branch.legal_address_en || '',
      pochta_indeksi: branch.postal_code || '',
      direktor_fio: branch.director_name || '',
      bank_nomi: branch.bank_name || '',
      ishchi_raqami: branch.account_number || '',
      mfo: branch.mfo || '',
      oked: branch.oked || '',
      manzil: branch.address || '',
      telefon_nomer: branch.phone || '',
      holat: branch.is_active === 1,
      arxivga_olinsin: false,
    });
    setShowBranchModal(true);
  };

  const handleSubmit = () => {
    if (editingBranch) {
      updateBranchMutation.mutate({ id: editingBranch.id, form: branchFormData });
    } else {
      createBranchMutation.mutate(branchFormData);
    }
  };

  const filteredBranches = useMemo(() => {
    const branches = branchesApiData || [];
    return branches
      .filter((branch) =>
        getLocalized(branch, 'name', i18n.language)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      )
      .sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id);
  }, [branchesApiData, searchTerm, i18n.language, sortAsc]);

  const toggleAllBranches = (checked: boolean) =>
    setSelectedBranches(checked ? filteredBranches.map((b) => b.id) : []);

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

  const closeModal = () => {
    setShowBranchModal(false);
    setEditingBranch(null);
    setBranchFormData(emptyForm);
  };

  const isPending = createBranchMutation.isPending || updateBranchMutation.isPending;

  const set = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBranchFormData((prev) => ({ ...prev, [field]: e.target.value }));

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
              {/* Chap tomon: yuridik ma'lumotlar */}
              <div className="branch-form-left">
                <div className="branch-input-group">
                  <label>{t('branches.legalName')}</label>
                  <input
                    type="text"
                    value={branchFormData.yuridik_nomi}
                    onChange={set('yuridik_nomi')}
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.organizationInn')}</label>
                  <input
                    type="text"
                    value={branchFormData.tashkilot_inn}
                    onChange={set('tashkilot_inn')}
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.index')}</label>
                  <input
                    type="text"
                    value={branchFormData.pochta_indeksi}
                    onChange={set('pochta_indeksi')}
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.director')}</label>
                  <input
                    type="text"
                    value={branchFormData.direktor_fio}
                    onChange={set('direktor_fio')}
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.bankName')}</label>
                  <input type="text" value={branchFormData.bank_nomi} onChange={set('bank_nomi')} />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.accountNumber')}</label>
                  <input
                    type="text"
                    value={branchFormData.ishchi_raqami}
                    onChange={set('ishchi_raqami')}
                  />
                </div>

                <div className="branch-input-group">
                  <label>MFO</label>
                  <input type="text" value={branchFormData.mfo} onChange={set('mfo')} />
                </div>

                <div className="branch-input-group">
                  <label>OKED</label>
                  <input type="text" value={branchFormData.oked} onChange={set('oked')} />
                </div>
              </div>

              {/* O'ng tomon: asosiy ma'lumotlar */}
              <div className="branch-form-right">
                {editingBranch ? (
                  <>
                    <div className="branch-input-group">
                      <label>{t('branches.legalAddress')} (UZ)</label>
                      <input type="text" value={branchFormData.yuridik_manzil_uz} onChange={set('yuridik_manzil_uz')} />
                    </div>
                    <div className="branch-input-group">
                      <label>{t('branches.legalAddress')} (RU)</label>
                      <input type="text" value={branchFormData.yuridik_manzil_ru} onChange={set('yuridik_manzil_ru')} />
                    </div>
                    <div className="branch-input-group">
                      <label>{t('branches.legalAddress')} (EN)</label>
                      <input type="text" value={branchFormData.yuridik_manzil_en} onChange={set('yuridik_manzil_en')} />
                    </div>
                  </>
                ) : (
                  <div className="branch-input-group">
                    <label>{t('branches.legalAddress')}</label>
                    <input type="text" value={branchFormData.yuridik_manzil_uz} onChange={set('yuridik_manzil_uz')} />
                  </div>
                )}

                <div className="branch-input-group">
                  <label>{t('branches.branchName')}</label>
                  <div className="branch-name-row">
                    <input
                      type="text"
                      placeholder={t('branches.branchName')}
                      value={branchFormData.filial_nomi}
                      onChange={set('filial_nomi')}
                    />
                    <input
                      type="text"
                      maxLength={4}
                      placeholder={t('branches.branchCode')}
                      value={branchFormData.branch_code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setBranchFormData((prev) => ({ ...prev, branch_code: val }));
                      }}
                      className="branch-code-input"
                    />
                  </div>
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.address')}</label>
                  <input type="text" value={branchFormData.manzil} onChange={set('manzil')} />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.phoneNumber')}</label>
                  <input
                    type="text"
                    value={branchFormData.telefon_nomer}
                    onChange={set('telefon_nomer')}
                  />
                </div>

                <div className="branch-input-group">
                  <label>{t('branches.status')}</label>
                  <div className="branch-toggle-wrapper">
                    <button
                      type="button"
                      className={branchFormData.holat ? '' : 'branch-active-btn'}
                      onClick={() =>
                        setBranchFormData((prev) => ({
                          ...prev,
                          holat: false,
                          arxivga_olinsin: false,
                        }))
                      }
                    >
                      {t('branches.inactive')}
                    </button>
                    <button
                      type="button"
                      className={branchFormData.holat ? 'branch-active-btn' : ''}
                      onClick={() =>
                        setBranchFormData((prev) => ({
                          ...prev,
                          holat: true,
                          arxivga_olinsin: false,
                        }))
                      }
                    >
                      {t('branches.active')}
                    </button>
                  </div>
                </div>

                {!branchFormData.holat && (
                  <div className="branch-input-group">
                    <label className="branch-archive-label">{t('branches.archiveQuestion')}</label>
                    <div className="branch-archive-options">
                      <label className="branch-archive-option">
                        <input
                          type="radio"
                          name="arxivga_olinsin"
                          checked={branchFormData.arxivga_olinsin === true}
                          onChange={() =>
                            setBranchFormData((prev) => ({ ...prev, arxivga_olinsin: true }))
                          }
                        />
                        {t('branches.yes')}
                      </label>
                      <label className="branch-archive-option">
                        <input
                          type="radio"
                          name="arxivga_olinsin"
                          checked={branchFormData.arxivga_olinsin === false}
                          onChange={() =>
                            setBranchFormData((prev) => ({ ...prev, arxivga_olinsin: false }))
                          }
                        />
                        {t('branches.no')}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="branch-modal-buttons">
              <button className="branch-save-btn" onClick={handleSubmit} disabled={isPending}>
                {isPending ? t('branches.saving') : t('branches.save')}
              </button>
              <button className="branch-cancel-btn" onClick={closeModal}>
                {t('branches.cancel')}
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
              <button className="branch-danger-btn" onClick={confirmBranchDeletion}>
                {t('branches.confirm')}
              </button>
              <button
                className="branch-cancel-btn"
                onClick={() => setShowDeleteConfirmation(false)}
              >
                {t('branches.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="branch-filter-panel">
        <Protected permission="branches.create">
          <button className="branch-add-btn" onClick={() => setShowBranchModal(true)}>
            {t('branches.addNew')}
          </button>
        </Protected>

        <Protected permission="branches.delete">
          <button
            className="branch-delete-btn"
            disabled={selectedBranches.length === 0}
            onClick={() => {
              setDeletionTarget('all');
              setShowDeleteConfirmation(true);
            }}
          >
            {t('branches.delete')}
          </button>
        </Protected>

        <input
          placeholder={t('branches.search')}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="branch-search-input"
        />
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
              <th className="th-sortable" onClick={() => setSortAsc(p => !p)}>ID {sortAsc ? '↑' : '↓'}</th>
              <th>{t('branches.name')}</th>
              <th>{t('branches.branchCode')}</th>
              <th>{t('branches.address')}</th>
              <th>{t('branches.accountNumber')}</th>
              <th>{t('branches.index')}</th>
              <th>{t('branches.date')}</th>
              <th>{t('branches.actions')}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={9} />
            ) : filteredBranches.length > 0 ? (
              filteredBranches.map((branch) => (
                <tr key={branch.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedBranches.includes(branch.id)}
                      onChange={() => toggleSingleBranch(branch.id)}
                    />
                  </td>
                  <td>{branch.id}</td>
                  <td>{getLocalized(branch, 'name', i18n.language)}</td>
                  <td>{branch.branch_code || '-'}</td>
                  <td>{getLocalized(branch, 'address', i18n.language)}</td>
                  <td>{branch.account_number}</td>
                  <td>{branch.postal_code}</td>
                  <td>{branch.created_at.slice(0, 10).replaceAll('-', '.')}</td>
                  <td className="branch-action-cell">
                    <Protected permission="branches.edit">
                      <button
                        className="branch-edit-icon"
                        onClick={() => openBranchEditModal(branch)}
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                    </Protected>
                    <Protected permission="branches.delete">
                      <button
                        className="branch-delete-icon"
                        onClick={() => {
                          setDeletionTarget(branch.id);
                          setShowDeleteConfirmation(true);
                        }}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </Protected>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyState colSpan={9} message={t('branches.notFound')} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Branches;
