import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { renderAsync } from 'docx-preview';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatDate as formatDisplayDate } from './date';

export interface ContractTemplateData {
  // Shartnoma
  contract_number: string;
  contract_date: string;
  city: string; // Andijon shahri

  // O'quv markazi
  branch_short_name: string; // "ILM PLYUS O'QUV" NTM
  branch_full_name: string; // "ILM PLYUS" o'quv markazi (Asosiy filial)
  branch_name: string;
  branch_legal_name: string;
  branch_address: string; // Filial manzili
  branch_legal_address: string; // Yuridik manzil
  branch_inn: string; // STIR
  branch_oked: string; // IFUT (OKED)
  branch_phone: string;
  branch_email: string;
  bank_name: string; // AITB "IPAK YO'LI BANK" ...
  account_number: string; // H/R
  mfo: string;
  director_name: string;

  // O'quvchi
  student_full_name: string;
  student_last_name: string; // FAMILIYA
  student_first_name: string; // ISM
  student_father_name: string; // SHARIF
  student_first_father_name: string; // ISM SHARIF (birlashtirilgan)
  student_birth_date: string;
  jshshir: string;
  passport_series: string;
  passport_number: string;
  passport_full: string; // AA 0000000 (series + number)
  passport_given_date: string;
  passport_expiry_date: string; // Amal qilish muddati
  passport_given_by: string;
  citizenship_text: string; // "fuqaro" yoki "fuqaroligi bo'lmagan shaxs, chet el fuqarosi"
  phone: string;
  residential_address: string; // Yashash manzili
  registered_address: string; // Ro'yxatga qo'yilgan manzili

  // Kurs
  course_name: string;
  level_name: string;
  group_name: string;
  monthly_price: string;
  monthly_price_text: string; // Oylik to'lov so'z bilan (besh yuz ming)
  half_price: string; // Oylik to'lovning yarmi raqamda
  half_price_text: string; // Oylik to'lovning yarmi so'z bilan
  total_price: string;
  total_price_text: string; // Umumiy to'lov so'z bilan
  lesson_time: string; // Dars vaqti: 10:00 – 12:00
  course_start_date: string;
  course_end_date: string;
  contract_start_date: string; // Legal: org.contract_start_date; Adult: course_start_date
  contract_expiry_date: string; // Legal: org.contract_end_date;   Adult: course_end_date
  language: string;

  // Ko'p studentli jadval uchun loop array (Word template: {#students}...{/students})
  students: Array<{
    s_index: number;
    s_full_name: string;
    s_birth_date: string;
    s_course_name: string;
    s_level_name: string;
    s_monthly_price: string;
    s_total_price: string;
  }>;

  // Vakil (02 minor template) - imzo qismi
  representative_last_name: string;
  representative_first_father_name: string;
  representative_full_name: string; // to'liq ism (04 template)
  representative_birth_date: string; // tug'ilgan sana (04 template)
  representative_short_name: string; // I. Sh. Familiya (04 template imzo)
  representative_residental_address: string; // template typo saqlanadi
  representative_passport_full: string;
  representative_phone: string;
  representative_jshshr: string; // template typo saqlanadi
  representative_ishshr: string; // 04 template alias
  passport: string; // passport_given_by alias (template: {passport})

  // Tashkilot (03/04 legal entity template)
  charter_info: string; // "Nizomi" yoki "DD.MM.YYYY dagi N-sonli Ishonchnomasiga"
  company_name: string; // Tashkilot nomi
  company_director_name: string; // Rahbar F.I.Sh (to'liq)
  company_director_short_name: string; // I. Sh. Familiya (04 template imzo)
  director_short_name: string; // I. Sh. Familiya (04 template imzo, branch direktor)
  course_level: string; // level_name alias (template: {course_level})
  company_legal_address: string; // Tashkilot yuridik manzili
  company_branch_address: string; // Tashkilot filial manzili
  company_phone: string;
  company_inn: string; // Tashkilot STIR
  company_oked: string; // Tashkilot IFUT (OKED)
  company_account_number: string;
  company_bank_name: string;
  company_bank_branch: string; // Bank filiali nomi
  company_mfo: string;
}

// "FAMILIYA ISM SHARIF" → "I. Sh. FAMILIYA" qisqa ko'rinish
export const toShortName = (fullName: string | null | undefined): string => {
  if (!fullName || fullName === '—') return '—';
  const parts = fullName.trim().split(/\s+/);
  const last = parts[0] || '';
  const first = parts[1] || '';
  const father = parts[2] || '';
  const fi = first ? first[0].toUpperCase() + '.' : '';
  const fa = father ? father[0].toUpperCase() + '.' : '';
  return [fi, fa, last].filter(Boolean).join(' ') || '—';
};

const formatDate = (dateStr: string | null | undefined): string =>
  formatDisplayDate(dateStr, '___________');

const formatMoney = (val: string | number | null | undefined): string => {
  if (!val) return '0';
  return Number(val).toLocaleString('uz-UZ');
};

export const numberToWordsUz = (n: number): string => {
  if (n === 0) return 'nol';
  if (n < 0) return 'minus ' + numberToWordsUz(-n);

  const ones = ['', 'bir', 'ikki', 'uch', "to'rt", 'besh', 'olti', 'yetti', 'sakkiz', "to'qqiz"];
  const tens = [
    '',
    "o'n",
    'yigirma',
    "o'ttiz",
    'qirq',
    'ellik',
    'oltmish',
    'yetmish',
    'sakson',
    "to'qson",
  ];

  const threeDigits = (num: number): string => {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    const parts: string[] = [];
    if (h > 0) parts.push(h === 1 ? 'yuz' : ones[h] + ' yuz');
    if (t > 0) parts.push(tens[t]);
    if (o > 0) parts.push(ones[o]);
    return parts.join(' ');
  };

  const parts: string[] = [];
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;

  if (billions > 0) parts.push(threeDigits(billions) + ' milliard');
  if (millions > 0) parts.push(threeDigits(millions) + ' million');
  if (thousands > 0) parts.push(threeDigits(thousands) + ' ming');
  if (remainder > 0) parts.push(threeDigits(remainder));

  return parts.join(' ');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildTemplateData = (contract: any): ContractTemplateData => {
  const student = contract.contract_students?.[0];
  const branch = contract.branch;
  const org = contract.organization;
  const rep = contract.representative;
  const isMinorContract = contract.contract_type === 'minor';

  // Minor shartnomada kirish qismidagi shaxs — vakil; adult — student
  const subjectLastName = isMinorContract ? rep?.last_name || '' : student?.last_name || '';
  const subjectFirstName = isMinorContract ? rep?.first_name || '' : student?.first_name || '';
  const subjectFatherName = isMinorContract ? rep?.father_name || '' : student?.father_name || '';
  const subjectPassSeries = isMinorContract
    ? rep?.passport_series || ''
    : student?.passport_series || '';
  const subjectPassNumber = isMinorContract
    ? rep?.passport_number || ''
    : student?.passport_number || '';
  const subjectPassGivenDate = isMinorContract
    ? formatDate(rep?.passport_given_date)
    : formatDate(student?.passport_given_date);
  const subjectPassExpiryDate = isMinorContract
    ? formatDate(rep?.passport_expiry_date)
    : formatDate(student?.passport_expiry_date);
  const subjectPassGivenBy = isMinorContract
    ? rep?.passport_given_by || '—'
    : student?.passport_given_by || '—';
  const subjectBirthDate = isMinorContract
    ? formatDate(rep?.birth_date)
    : formatDate(student?.birth_date);
  const subjectCitizenship = isMinorContract ? rep?.citizenship : student?.citizenship;
  const citizenshipText =
    subjectCitizenship === 'foreign' ? "fuqaroligi bo'lmagan shaxs, chet el fuqarosi" : 'fuqaro';

  const allStudents = contract.contract_students || [];

  // Barcha studentlar umumiy narxi va oylik yig'indisi
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPriceAllNum = allStudents.reduce(
    (sum: number, s: any) => sum + (Number(s.total_price) || 0),
    0,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monthlyPriceAllNum = allStudents.reduce(
    (sum: number, s: any) => sum + (Number(s.monthly_price) || 0),
    0,
  );
  const monthlyPriceNum = monthlyPriceAllNum || Number(student?.monthly_price) || 0;
  const halfPriceNum = Math.floor(monthlyPriceNum / 2);

  // Ko'p studentli jadval uchun loop array ({#students}...{/students})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studentsListData = allStudents.map((s: any, i: number) => ({
    s_index: i + 1,
    s_full_name: `${s.last_name || ''} ${s.first_name || ''} ${s.father_name || ''}`.trim() || '—',
    s_birth_date: formatDate(s.birth_date),
    s_course_name: s.course?.name_uz || '—',
    s_level_name: s.level?.name_uz || '—',
    s_monthly_price: formatMoney(s.monthly_price),
    s_total_price: formatMoney(s.total_price),
  }));

  // Vakil imzo maydonlari (minor template uchun)
  const repPassFull = `${rep?.passport_series || ''} ${rep?.passport_number || ''}`.trim() || '—';
  const repPhone =
    [rep?.phone]
      .concat(rep?.extra_phones || [])
      .filter(Boolean)
      .join(', ') || '—';

  // Legal entity fields
  const charterInfo = org?.has_power_of_attorney
    ? `${formatDate(org?.power_of_attorney_date)}dagi ${org?.power_of_attorney_number || ''}-sonli Ishonchnomasiga`
    : 'Nizomi';

  const companyDirectorName =
    [org?.director_last_name, org?.director_first_name, org?.director_father_name]
      .filter(Boolean)
      .join(' ') || '—';

  const isLegalContract =
    contract.contract_type === 'legal_bilateral' ||
    contract.contract_type === 'legal_trilateral';
  const contractStartDate = isLegalContract
    ? formatDate(org?.contract_start_date || student?.course_start_date)
    : formatDate(student?.course_start_date);
  const contractExpiryDate = isLegalContract
    ? formatDate(org?.contract_end_date || student?.course_end_date)
    : formatDate(student?.course_end_date);

  // Extra phones (adult/student)
  const studentPhones = [student?.phone]
    .concat(student?.extra_phones || [])
    .filter(Boolean)
    .join(', ');

  return {
    // Shartnoma
    contract_number: contract.contract_number || '—',
    contract_date: formatDate(contract.contract_date),
    city: branch?.city || '—',

    // O'quv markazi
    branch_short_name: branch?.name_uz || '—',
    branch_full_name:
      `${branch?.name_uz || ''} (${branch?.city || ''})`.trim().replace(/^\(|\)$/g, '') || '—',
    branch_name: branch?.name_uz || branch?.legal_name || '—',
    branch_legal_name: branch?.legal_name || '—',
    branch_address: branch?.address_uz || '—',
    branch_legal_address: branch?.legal_address_uz || '—',
    branch_inn: branch?.inn || '—',
    branch_oked: branch?.oked || '—',
    branch_phone: branch?.phone || '—',
    branch_email: branch?.email || '—',
    bank_name: branch?.bank_name || '—',
    account_number: branch?.account_number || '—',
    mfo: branch?.mfo || '—',
    director_name: branch?.director_name || '—',

    // Kirish qismi shaxs ma'lumotlari (minor → vakil, adult → student)
    student_full_name: `${subjectLastName} ${subjectFirstName} ${subjectFatherName}`.trim() || '—',
    student_last_name: subjectLastName || '—',
    student_first_name: subjectFirstName || '—',
    student_father_name: subjectFatherName || '—',
    student_first_father_name: `${subjectFirstName} ${subjectFatherName}`.trim() || '—',
    student_birth_date: subjectBirthDate,
    jshshir: (isMinorContract ? rep?.jshshir : student?.jshshir) || '—',
    passport_series: subjectPassSeries,
    passport_number: subjectPassNumber,
    passport_full: `${subjectPassSeries} ${subjectPassNumber}`.trim() || '—',
    passport_given_date: subjectPassGivenDate,
    passport_expiry_date: subjectPassExpiryDate,
    passport_given_by: subjectPassGivenBy,
    passport: subjectPassGivenBy, // {passport} alias (02 template)
    citizenship_text: citizenshipText,
    phone: (isMinorContract ? repPhone : studentPhones) || '—',
    residential_address:
      (isMinorContract ? rep?.residential_address : student?.residential_address) || '—',
    registered_address:
      (isMinorContract ? rep?.registered_address : student?.registered_address) || '—',

    // Kurs (birinchi student asosida)
    course_name: student?.course?.name_uz || '—',
    level_name: student?.level?.name_uz || '—',
    group_name: student?.group?.name || '—',
    lesson_time:
      student?.group?.start_time && student?.group?.end_time
        ? `${student.group.start_time.slice(0, 5)} – ${student.group.end_time.slice(0, 5)}`
        : '—',
    monthly_price: formatMoney(monthlyPriceNum),
    monthly_price_text: numberToWordsUz(monthlyPriceNum),
    half_price: formatMoney(halfPriceNum),
    half_price_text: numberToWordsUz(halfPriceNum),
    total_price: formatMoney(totalPriceAllNum || student?.total_price),
    total_price_text: numberToWordsUz(totalPriceAllNum || Number(student?.total_price) || 0),
    course_start_date: formatDate(student?.course_start_date),
    course_end_date: formatDate(student?.course_end_date),
    contract_start_date: contractStartDate,
    contract_expiry_date: contractExpiryDate,
    language: contract.language || 'uz',

    // Vakil imzo maydonlari (02/04 template)
    representative_last_name: rep?.last_name || '—',
    representative_first_father_name:
      `${rep?.first_name || ''} ${rep?.father_name || ''}`.trim() || '—',
    representative_full_name:
      `${rep?.last_name || ''} ${rep?.first_name || ''} ${rep?.father_name || ''}`.trim() || '—',
    representative_birth_date: formatDate(rep?.birth_date),
    representative_short_name: toShortName(
      `${rep?.last_name || ''} ${rep?.first_name || ''} ${rep?.father_name || ''}`.trim(),
    ),
    representative_residental_address: rep?.residential_address || '—',
    representative_passport_full: repPassFull,
    representative_phone: repPhone,
    representative_jshshr: rep?.jshshir || '—',
    representative_ishshr: rep?.jshshir || '—',

    // Tashkilot (03/04 legal entity template)
    charter_info: charterInfo,
    company_name: org?.organization_name || '—',
    company_director_name: companyDirectorName,
    company_director_short_name: toShortName(companyDirectorName),
    director_short_name: toShortName(branch?.director_name),
    course_level: student?.level?.name_uz || '—',
    company_legal_address: org?.legal_address || org?.org_branch_address || '—',
    company_branch_address: org?.org_branch_address || '—',
    company_phone: org?.phone || '—',
    company_inn: org?.stir || '—',
    company_oked: org?.ifut_oked || '—',
    company_account_number: org?.bank_account || '—',
    company_bank_name: org?.bank_name || '—',
    company_bank_branch: org?.bank_branch_name || '—',
    company_mfo: org?.mfo || '—',

    // Ko'p studentli jadval ({#students}...{/students})
    students: studentsListData,
  };
};

export const downloadDocx = async (
  templatePath: string,
  data: ContractTemplateData,
  filename: string,
): Promise<void> => {
  const response = await fetch(templatePath);
  if (!response.ok) throw new Error('Word shablon topilmadi');

  const arrayBuffer = await response.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.setData(data as unknown as Record<string, unknown>);
  doc.render();

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Har qanday docx shablon uchun to'ldirish ma'lumoti.
 * O'quvchi (`ContractTemplateData`) va xodim (`EmployeeContractTemplateData`)
 * shartnomalari ayni shu funksiyadan o'tadi — shuning uchun PDF/print
 * parametrlari ikkalasida bir xil bo'lishi kafolatlanadi.
 */
export type DocxTemplateData = object;

// Word template → docx-preview (Word ko'rinishini saqlab) → print window
export const printFromDocxTemplate = async (
  templatePath: string,
  data: DocxTemplateData,
  contractNumber: string,
  mode: 'pdf' | 'print' = 'pdf',
): Promise<void> => {
  // 1. Word shablonini yuklab, to'ldirish
  const response = await fetch(templatePath);
  if (!response.ok) throw new Error('Word shablon topilmadi');
  const arrayBuffer = await response.arrayBuffer();

  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.setData(data as unknown as Record<string, unknown>);
  doc.render();

  const filledBlob = doc.getZip().generate({ type: 'blob' });

  // 2. docx-preview: to'ldirilgan docx → joriy sahifada yashirin div ga render
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;';
  document.body.appendChild(container);

  await renderAsync(filledBlob as Blob, container, undefined, {
    className: 'docx',
    inWrapper: true,
    ignoreWidth: false,
    ignoreHeight: false,
    ignoreFonts: false,
    breakPages: true,
    useBase64URL: true,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    hideWrapperOnPrint: true,
  });

  // 3. docx-preview tomonidan qo'shilgan barcha style larni yig'ish
  const docxStyles = Array.from(document.querySelectorAll('style'))
    .filter((s) => s.textContent?.includes('.docx'))
    .map((s) => s.textContent || '')
    .join('\n');

  const renderedHTML = container.innerHTML;
  document.body.removeChild(container);

  // 4. Print oynasida asl Word ko'rinishi bilan ko'rsatish
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Pop-up bloklangan. Brauzer sozlamalarini tekshiring.');

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Shartnoma ${contractNumber}</title>
    <style>
      ${docxStyles}
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #f0f0f0; }

      /* Ekran: oxirgi sahifa pastida ortiqcha bo'shliq yo'q */
      .docx-wrapper > section.docx:last-child {
        margin-bottom: 0 !important;
      }

      @media print {
        @page { size: A4 portrait; margin: 2cm 1.5cm 2cm 3cm; }

        html, body {
          background: #fff !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .docx-wrapper {
          background: #fff !important;
          padding: 0 !important;
          margin: 0 !important;
          display: block !important;
        }

          .docx-wrapper > section.docx {
    padding: 0 !important;
    margin: 0 !important;

    width: auto !important;
    min-height: auto !important;

    box-shadow: none !important;
  }

  .docx-wrapper > section.docx > article {
    padding: 0 !important;
    margin: 0 !important;
  }
      }
    </style>
  </head>
  <body>${renderedHTML}</body>
</html>`);
  printWindow.document.close();

  const triggerPrint = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      if (mode === 'print') setTimeout(() => printWindow.close(), 1000);
    }, 800);
  };

  // load eventi miss bo'lmasligi uchun readyState ni ham tekshiramiz
  if (printWindow.document.readyState === 'complete') {
    triggerPrint();
  } else {
    printWindow.addEventListener('load', triggerPrint, { once: true });
  }
};

/**
 * Word shablon → docx-preview (Word ko'rinishi) → jsPDF → avtomatik .pdf yuklab olish.
 * Print oynasi ochilmaydi, brauzer dialogi ko'rsatilmaydi.
 *
 * docx-preview butun hujjatni bitta <section> qilib beradi (Word da aniq page-break yo'q,
 * sahifalarni brauzer print paytida oqim bo'yicha bo'ladi). Shuning uchun bu yerda
 * sahifalash printdagi @page bilan bir xil parametrlarda qo'lda bajariladi:
 * A4, margin 2cm (yuqori) 1.5cm (o'ng) 2cm (past) 3cm (chap).
 * Bloklar (paragraf/jadval) butunligicha ko'chiriladi — matn qator o'rtasidan kesilmaydi.
 */
const MM_PER_PX = 25.4 / 96; // CSS px → mm (96 dpi)

export const downloadPdfFromDocxTemplate = async (
  templatePath: string,
  data: DocxTemplateData,
  contractNumber: string,
): Promise<void> => {
  const response = await fetch(templatePath);
  if (!response.ok) throw new Error('Word shablon topilmadi');
  const arrayBuffer = await response.arrayBuffer();

  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.setData(data as unknown as Record<string, unknown>);
  doc.render();

  const filledBlob = doc.getZip().generate({ type: 'blob' });

  // Print bilan bir xil sahifa parametrlari
  const pageWidth = 210;
  const pageHeight = 297;
  const marginTop = 20; // 2cm
  const marginRight = 15; // 1.5cm
  const marginBottom = 20; // 2cm
  const marginLeft = 30; // 3cm

  const contentWidthMm = pageWidth - marginLeft - marginRight;
  const contentHeightMm = pageHeight - marginTop - marginBottom;
  const contentWidthPx = Math.round(contentWidthMm / MM_PER_PX);
  const contentHeightPx = Math.round(contentHeightMm / MM_PER_PX);

  // html2canvas o'lchov olishi uchun elementlar DOM da bo'lishi shart — ekrandan tashqarida
  const stage = document.createElement('div');
  stage.style.cssText = `position:fixed;left:-10000px;top:0;width:${contentWidthPx}px;background:#fff;z-index:-1;`;
  document.body.appendChild(stage);

  const source = document.createElement('div');
  source.style.cssText = `width:${contentWidthPx}px;background:#fff;`;
  stage.appendChild(source);

  try {
    await renderAsync(filledBlob as Blob, source, undefined, {
      className: 'docx',
      inWrapper: true,
      // Word sahifa o'lchamlari e'tiborga olinmaydi — kontent print dagidek erkin oqadi
      ignoreWidth: true,
      ignoreHeight: true,
      ignoreFonts: false,
      breakPages: true,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
    });

    // Sahifalanadigan bloklar: har bir section (yoki article) ning bevosita bolalari
    const blocks: HTMLElement[] = [];
    const sections = Array.from(source.querySelectorAll<HTMLElement>('section'));

    let sectionTemplate: HTMLElement | null = null;
    let articleTemplate: HTMLElement | null = null;

    for (const section of sections) {
      const article = section.querySelector<HTMLElement>('article');
      const holder = article ?? section;

      if (!sectionTemplate) {
        sectionTemplate = section;
        articleTemplate = article;
      }

      blocks.push(...(Array.from(holder.children) as HTMLElement[]));
    }

    if (!blocks.length) {
      blocks.push(...(Array.from(source.children) as HTMLElement[]));
    }

    // Sahifa konteyneri asl <section class="docx"> nusxasi bo'lishi shart:
    // docx-preview stillari `.docx ...` selektorlariga bog'langan, ajdod yo'qolsa
    // paragraf/jadval oraliqlari brauzer defaultiga tushib, matn "sochilib" ketadi.
    const buildPageShell = (): { page: HTMLElement; holder: HTMLElement } => {
      const page = (
        sectionTemplate ? sectionTemplate.cloneNode(false) : document.createElement('div')
      ) as HTMLElement;

      page.style.width = `${contentWidthPx}px`;
      page.style.minWidth = '0';
      page.style.height = 'auto';
      page.style.minHeight = '0';
      page.style.maxHeight = 'none';
      page.style.padding = '0';
      page.style.margin = '0';
      page.style.boxShadow = 'none';
      page.style.background = '#fff';

      let holder = page;

      if (articleTemplate) {
        const article = articleTemplate.cloneNode(false) as HTMLElement;
        article.style.padding = '0';
        article.style.margin = '0';
        page.appendChild(article);
        holder = article;
      }

      stage.appendChild(page);
      return { page, holder };
    };

    // Bloklarni sahifalarga taqsimlash — blok hech qachon ikkiga bo'linmaydi
    const pageEls: HTMLElement[] = [];

    let current = buildPageShell();
    pageEls.push(current.page);

    for (const block of blocks) {
      current.holder.appendChild(block.cloneNode(true));

      // Sig'masa — blokni butunligicha keyingi sahifaga ko'chiramiz
      if (current.page.scrollHeight > contentHeightPx && current.holder.childElementCount > 1) {
        current.holder.removeChild(current.holder.lastElementChild!);

        current = buildPageShell();
        pageEls.push(current.page);
        current.holder.appendChild(block.cloneNode(true));
      }
    }

    source.remove();

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    for (let i = 0; i < pageEls.length; i++) {
      const canvas = await html2canvas(pageEls[i], {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
      });

      const imgWidth = contentWidthMm;
      const imgHeight = Math.min((canvas.height / canvas.width) * imgWidth, contentHeightMm);

      if (i > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        marginLeft,
        marginTop,
        imgWidth,
        imgHeight,
      );
    }

    pdf.save(`Shartnoma_${contractNumber}.pdf`);
  } finally {
    document.body.removeChild(stage);
  }
};

export const downloadPdfFromElement = async (
  element: HTMLElement,
  filename: string,
): Promise<void> => {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false, // false — tainted canvas toDataURL xatosini oldini oladi
    backgroundColor: '#ffffff',
    windowWidth: 794,
    logging: false,
    imageTimeout: 0, // rasmlarni kutmaydi (muvaffaqiyatsiz rasmlarni o'tkazib yuboradi)
    onclone: (_doc, el) => {
      // Cross-origin img elementlarini olib tashlash
      el.querySelectorAll('img').forEach((img) => {
        try {
          if (!img.src.startsWith(window.location.origin) && !img.src.startsWith('data:')) {
            img.remove();
          }
        } catch {
          img.remove();
        }
      });
    },
  });

  // JPEG formatida — "wrong PNG signature" xatosini hal qiladi
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pxToMm = 0.2645833333;
  const pageWidth = 210;
  const pageHeight = 297;

  const imgWidthMm = (canvas.width / 2) * pxToMm;
  const imgHeightMm = (canvas.height / 2) * pxToMm;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  if (imgHeightMm <= pageHeight) {
    const x = (pageWidth - imgWidthMm) / 2;
    pdf.addImage(imgData, 'JPEG', x, 0, imgWidthMm, imgHeightMm);
  } else {
    let yOffset = 0;
    let pageIndex = 0;
    while (yOffset < imgHeightMm) {
      if (pageIndex > 0) pdf.addPage();
      const srcY = (yOffset / pxToMm) * 2;
      const srcH = Math.min((pageHeight / pxToMm) * 2, canvas.height - srcY);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = srcH;
      const ctx = tempCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
      const sliceData = tempCanvas.toDataURL('image/jpeg', 0.95);
      const sliceHeight = (srcH / 2) * pxToMm;
      pdf.addImage(sliceData, 'JPEG', 0, 0, pageWidth, sliceHeight);
      yOffset += pageHeight;
      pageIndex++;
    }
  }

  pdf.save(filename);
};
