import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import { useTranslation } from 'react-i18next';
import './branches.css';
import type { Branch } from './branch.types';
import { emptyBranchForm, buildBranchPayload, branchToForm } from './branch.types';

const BranchForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [branchFormData, setBranchFormData] = useState(emptyBranchForm);

  const { data: branch } = useQuery<Branch>({
    queryKey: ['branch', id],
    enabled: isEditing,
    queryFn: async () => {
      const { data } = await API.get(`/branches/${id}`);
      return data?.data || data;
    },
  });

  useEffect(() => {
    if (branch) setBranchFormData(branchToForm(branch));
  }, [branch]);

  const saveMutation = useMutation({
    mutationFn: async (form: typeof emptyBranchForm) => {
      const payload = buildBranchPayload(form);
      if (isEditing) return API.put(`/branches/${id}`, payload);
      return API.post('/branches', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      navigate('/branches');
    },
  });

  const set = (field: keyof typeof emptyBranchForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBranchFormData((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <section className="brf-page">
      <div className="brf-card">
        <h1 className="brf-heading">
          {isEditing ? t('branches.editBranchTitle') : t('branches.addNewBranchTitle')}
        </h1>

        <div className="brf-body">
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
              {isEditing ? (
                <>
                  <div className="branch-input-group">
                    <label>{t('branches.legalAddress')} (UZ)</label>
                    <input
                      type="text"
                      value={branchFormData.yuridik_manzil_uz}
                      onChange={set('yuridik_manzil_uz')}
                    />
                  </div>
                  <div className="branch-input-group">
                    <label>{t('branches.legalAddress')} (RU)</label>
                    <input
                      type="text"
                      value={branchFormData.yuridik_manzil_ru}
                      onChange={set('yuridik_manzil_ru')}
                    />
                  </div>
                  <div className="branch-input-group">
                    <label>{t('branches.legalAddress')} (EN)</label>
                    <input
                      type="text"
                      value={branchFormData.yuridik_manzil_en}
                      onChange={set('yuridik_manzil_en')}
                    />
                  </div>
                </>
              ) : (
                <div className="branch-input-group">
                  <label>{t('branches.legalAddress')}</label>
                  <input
                    type="text"
                    value={branchFormData.yuridik_manzil_uz}
                    onChange={set('yuridik_manzil_uz')}
                  />
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
        </div>

        <div className="brf-footer">
          <button
            className="branch-save-btn"
            onClick={() => saveMutation.mutate(branchFormData)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? t('branches.saving') : t('branches.save')}
          </button>
          <button className="branch-cancel-btn" onClick={() => navigate('/branches')}>
            {t('branches.cancel')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default BranchForm;
