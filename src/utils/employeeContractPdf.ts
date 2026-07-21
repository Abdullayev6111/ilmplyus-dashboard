import { numberToWordsUz, toShortName } from './contractPdf';
import { formatDate as formatDisplayDate } from './date';

/**
 * Mehnat shartnomasi (xodim) Word shabloni maydonlari.
 * Shablon: `ILM_PLYUS_Mehnat_shartnomasi_TEMPLATE.docx` — barcha `{...}` placeholderlar.
 *
 * PDF/print `printFromDocxTemplate` orqali amalga oshiriladi, ya'ni o'quvchi
 * shartnomalari bilan bir xil parametrlardan foydalanadi.
 */
export interface EmployeeContractTemplateData {
  contract_number: string;
  contract_date: string;
  city: string;

  company_name: string;
  company_short_name: string;
  company_type: string;
  company_director: string;
  company_director_short_name: string;
  company_address: string;
  company_phone: string;
  company_stir: string;
  company_bank: string;
  company_bank_account: string;
  company_mfo: string;

  last_name: string;
  first_name: string;
  middle_name: string;
  full_name: string;
  citizenship: string;
  pinfl: string;
  birth_date: string;

  passport_series: string;
  passport_number: string;
  passport_issue_date: string;
  passport_issued_by: string;

  registered_address: string;
  current_address: string;
  phone: string;

  branch_name: string;
  department_name: string;
  position_name: string;

  employment_type: string;
  employment_start_date: string;

  contract_type: string;
  contract_start_date: string;
  contract_end_date: string;
  probation_period: string;

  vacation_days: string;
  vacation_days_text: string;

  salary_type: string;
  monthly_work_hours: string;
  monthly_salary: string;
  hourly_salary: string;
  additional_salary: string;
  total_salary: string;
  salary_period_start: string;
  salary_period_end: string;

  additional_tasks: string;

  director_signature: string;
  employee_signature: string;
  company_stamp: string;
}

const formatDate = (dateStr: string | null | undefined): string =>
  formatDisplayDate(dateStr, '___________');

const formatMoney = (val: string | number | null | undefined): string => {
  if (!val) return '0';
  return Number(val).toLocaleString('uz-UZ');
};

/** 1.2-band: "Ushbu «SHARTNOMA» {employment_type} hisoblanadi." */
const EMPLOYMENT_TYPE_UZ: Record<string, string> = {
  asosiy: 'Asosiy ish bo‘yicha',
  orindoshlik: 'O‘rindoshlik bo‘yicha',
  boshqa: 'Mehnat to‘g‘risidagi qonunchilik hujjatlariga muvofiq boshqa shartnoma',
};

/** 1.4-band: "«SHARTNOMA» {contract_type} tuzilgan hisoblanadi." */
const CONTRACT_TERM_UZ: Record<string, string> = {
  nomuayyan: 'Nomuayyan muddatga',
  muayyan3: '3 yildan ortiq bo‘lmagan muayyan muddatga',
  vaqtinchalik: 'Vaqtinchalik (ikki oygacha) ishlarni bajarish muddatiga',
  mavsumiy: 'Mavsumiy ishlarni bajarish muddatiga',
};

/**
 * 6.1-band: "...ish haqi {salary_type} muvofiq belgilanadi."
 * Shablon jumlasida "muvofiq" allaqachon bor, shuning uchun bu yerda
 * label'ning faqat o'zagi ishlatiladi (aks holda "muvofiq muvofiq" bo'lib qoladi).
 */
const SALARY_TYPE_UZ: Record<string, string> = {
  shtat: 'Shtat jadvaliga',
  foiz: 'Foiz asosida',
  soat: 'O‘quv soatlariga',
};

/** Ma'lumot yetishmasa Word'dagi asl chiziqcha ko'rinishi saqlanadi. */
const SIGNATURE_LINE = '_______________';

const COMPANY_TYPE = 'nodavlat ta’lim muassasasi';

/**
 * `legal_name` odatda huquqiy shakli bilan birga keladi:
 *   «ILM PLYUS O‘QUV» nodavlat ta’lim muassasasi
 * Shablonda esa {company_name} dan keyin {company_type} alohida turadi
 * ("...{company_name} {company_type} nomidan..."), shuningdek rekvizitlarda
 * qo'shtirnoq «{company_name}» ko'rinishida yozilgan. Shuning uchun bu yerda
 * huquqiy shakl va qo'shtirnoqlar olib tashlanadi — aks holda hujjatda
 * "nodavlat ta’lim muassasasi" ikki marta takrorlanadi.
 */
const bareCompanyName = (
  legalName: string | null | undefined,
  fallback: string | null | undefined,
): string => {
  const raw = (legalName || fallback || '').trim();
  if (!raw) return '—';
  const stripped = raw
    .replace(new RegExp(`${COMPANY_TYPE}\\s*$`, 'i'), '')
    .trim() // huquqiy shakl olib tashlangach qolgan bo'sh joy — «...» ni anchor bilan kesish uchun
    .replace(/^[«"']+|[»"']+$/g, '')
    .trim();
  return stripped || raw;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildEmployeeContractData = (contract: any): EmployeeContractTemplateData => {
  const emp = contract?.employee ?? {};
  const branch = contract?.branch ?? {};

  const fullName =
    emp.full_name ||
    [emp.last_name, emp.first_name, emp.middle_name].filter(Boolean).join(' ') ||
    '—';

  const directorName = branch.director_name || '—';

  const vacationDaysNum = Number(contract?.vacation_days) || 0;

  // Qo'shimcha vazifalar uchun to'lov: total − base
  const additionalSalaryNum =
    (Number(contract?.total_monthly_salary) || 0) - (Number(contract?.base_salary) || 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const additionalTasks: any[] = contract?.additional_tasks ?? [];

  return {
    // Shartnoma
    contract_number: String(contract?.contract_number ?? '—'),
    contract_date: formatDate(contract?.contract_date),
    city: branch.city || '—',

    // NTM (kompaniya) rekvizitlari — o'quvchi shartnomasi bilan bir xil manba
    company_name: bareCompanyName(branch.legal_name, branch.name_uz),
    company_short_name: bareCompanyName(branch.legal_name, branch.name_uz),
    company_type: COMPANY_TYPE,
    company_director: directorName,
    company_director_short_name: toShortName(directorName),
    company_address: branch.legal_address_uz || branch.address_uz || '—',
    company_phone: branch.phone || '—',
    company_stir: branch.inn || '—',
    company_bank: branch.bank_name || '—',
    company_bank_account: branch.account_number || '—',
    company_mfo: branch.mfo || '—',

    // Xodim
    last_name: emp.last_name || '—',
    first_name: emp.first_name || '—',
    middle_name: emp.middle_name || '—',
    full_name: fullName,
    citizenship: emp.citizenship || '—',
    pinfl: emp.pinfl || '—',
    birth_date: formatDate(emp.birth_date),

    // Pasport
    passport_series: emp.passport_series || '—',
    passport_number: emp.passport_number || '—',
    passport_issue_date: formatDate(emp.passport_given_date),
    passport_issued_by: emp.passport_given_by || '—',

    // Manzil / aloqa
    registered_address: emp.address_registration || '—',
    current_address: emp.address_living || '—',
    phone: emp.phone || '—',

    // Tashkiliy
    branch_name: branch.name_uz || branch.legal_name || '—',
    department_name: contract?.department?.name_uz || '—',
    position_name: contract?.position?.name_uz || '—',

    // Ish
    employment_type:
      EMPLOYMENT_TYPE_UZ[contract?.contract_type] || contract?.contract_type || '—',
    employment_start_date: formatDate(contract?.work_start_date),

    // Shartnoma muddati
    contract_type:
      CONTRACT_TERM_UZ[contract?.contract_duration_months] ||
      contract?.contract_duration_months ||
      '—',
    contract_start_date: formatDate(contract?.contract_start_date),
    contract_end_date: formatDate(contract?.contract_end_date),
    // 2.1-band: "...dastlabki {probation_period} belgilanadi."
    probation_period: contract?.probation_period || '—',

    // Ta'til
    vacation_days: vacationDaysNum ? String(vacationDaysNum) : '—',
    vacation_days_text: vacationDaysNum ? numberToWordsUz(vacationDaysNum) : '—',

    // Ish haqi
    salary_type: SALARY_TYPE_UZ[contract?.monthly_salary_type] || contract?.monthly_salary_type || '—',
    monthly_work_hours: contract?.working_hours_monthly
      ? String(contract.working_hours_monthly)
      : '—',
    monthly_salary: formatMoney(contract?.base_salary),
    hourly_salary: formatMoney(contract?.hourly_rate),
    additional_salary: formatMoney(additionalSalaryNum > 0 ? additionalSalaryNum : 0),
    total_salary: formatMoney(contract?.total_monthly_salary),
    salary_period_start: formatDate(contract?.salary_start_date),
    salary_period_end: formatDate(contract?.salary_end_date),

    additional_tasks:
      additionalTasks
        .map((task) => task?.name_uz || task?.task?.name_uz || task?.comment)
        .filter(Boolean)
        .join(', ') || '—',

    // Imzo / muhr — qiymat bo'lmasa Word'dagi asl ko'rinish saqlanadi
    director_signature: SIGNATURE_LINE,
    employee_signature: SIGNATURE_LINE,
    company_stamp: 'M.O‘.',
  };
};
