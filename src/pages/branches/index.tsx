import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import './branches.css';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '../../utils/getLocalized';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { Protected } from '../../components/Protected';
import type { Branch } from './branch.types';

const Branches = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletionTarget, setDeletionTarget] = useState<number | 'all' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  const { data: branchesApiData, isLoading } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await API.get('/branches');
      return Array.isArray(data) ? data : data?.data || [];
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

  const filteredBranches = useMemo(() => {
    const branches = branchesApiData || [];
    return branches
      .filter((branch) =>
        getLocalized(branch, 'name', i18n.language)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      )
      .sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id));
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

  return (
    <section className="branch-container container">
      <h1 className="branch-page-title">{t('branches.listTitle')}</h1>

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
          <button className="branch-add-btn" onClick={() => navigate('/branches/add')}>
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
              <th className="th-sortable" onClick={() => setSortAsc((p) => !p)}>
                ID {sortAsc ? '↑' : '↓'}
              </th>
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
                        onClick={() => navigate(`/branches/${branch.id}/edit`)}
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
