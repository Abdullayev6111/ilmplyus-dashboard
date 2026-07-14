export interface Branch {
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

export const emptyBranchForm = {
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

export type BranchForm = typeof emptyBranchForm;

export const buildBranchPayload = (form: BranchForm) => ({
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

export const branchToForm = (branch: Branch): BranchForm => ({
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
