import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/api/api';
import { buildTemplateData, printFromDocxTemplate } from '@/utils/contractPdf';
import { formatDate as formatDisplayDate } from '@/utils/date';
import './contractPrint.css';

import adultTemplate from '@/assets/documents/01. ILM Шартнома умумий (ўқувчи).docx?url';
import minorTemplate from '@/assets/documents/02_ILM_Шартнома_икки_томонлама_вакил+ўқувчи.docx?url';
import legalBilateralTemplate from '@/assets/documents/03_ILM_Шартнома_икки_томонлама_юридик_шахс+ўқувчи.docx?url';
import legalTrilateralTemplate from '@/assets/documents/04_ILM_Шартнома_уч_томонлама_юридик_шахс+вакил+ўқувчи.docx?url';

const getTemplateUrl = (contractType: string): string => {
  switch (contractType) {
    case 'minor': return minorTemplate;
    case 'legal_bilateral': return legalBilateralTemplate;
    case 'legal_trilateral': return legalTrilateralTemplate;
    default: return adultTemplate;
  }
};

const formatDate = (dateStr: string | null | undefined) => formatDisplayDate(dateStr, '—');

const formatMoney = (val: string | number | null | undefined) => {
  if (!val) return '—';
  return `${Number(val).toLocaleString('uz-UZ')} so'm`;
};

interface ContractPrintModalProps {
  contractId: number;
  onClose: () => void;
}

const ContractPrintModal = ({ contractId, onClose }: ContractPrintModalProps) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const { data: responseData, isLoading } = useQuery({
    queryKey: ['student-contract-print', contractId],
    queryFn: () => API.get(`/student-contracts/${contractId}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const contract = responseData?.contract || responseData?.data || responseData;

  const handleDownloadPdf = async () => {
    if (!contract) return;
    setPdfLoading(true);
    try {
      const templateUrl = getTemplateUrl(contract.contract_type || 'adult');
      const data = buildTemplateData(contract);
      await printFromDocxTemplate(templateUrl, data, contract.contract_number || String(contractId), 'pdf');
    } catch (err) {
      console.error('PDF xatosi:', err);
      alert('PDF yaratishda xatolik yuz berdi.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!contract) return;
    setPrintLoading(true);
    try {
      const templateUrl = getTemplateUrl(contract.contract_type || 'adult');
      const data = buildTemplateData(contract);
      await printFromDocxTemplate(templateUrl, data, contract.contract_number || String(contractId), 'print');
    } catch (err) {
      console.error('Print xatosi:', err);
      alert('Chop etishda xatolik yuz berdi.');
    } finally {
      setPrintLoading(false);
    }
  };


  return (
    <div className="cp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cp-modal-wrapper">
        {/* Action bar */}
        <div className="cp-modal-header">
          <div className="cp-modal-title">
            <i className="fa-solid fa-file-contract"></i>
            {isLoading ? 'Yuklanmoqda...' : `Shartnoma ${contract?.contract_number || ''}`}
          </div>
          <div className="cp-modal-actions">
            <button
              className="cp-btn cp-btn-pdf"
              onClick={handleDownloadPdf}
              disabled={isLoading || pdfLoading || printLoading}
            >
              {pdfLoading ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-file-pdf"></i>
              )}
              PDF yuklash
            </button>
            <button
              className="cp-btn cp-btn-print"
              onClick={handlePrint}
              disabled={isLoading || pdfLoading || printLoading}
            >
              {printLoading ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-print"></i>
              )}
              Chop etish
            </button>
            <button className="cp-btn cp-btn-close" onClick={onClose}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* A4 preview */}
        <div className="cp-scroll-area">
          {isLoading ? (
            <div className="cp-loading">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Shartnoma yuklanmoqda...</span>
            </div>
          ) : !contract ? (
            <div className="cp-loading">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>Ma'lumot topilmadi</span>
            </div>
          ) : (
            <ContractA4 contract={contract} />
          )}
        </div>
      </div>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ContractA4 = ({ contract }: { contract: any }) => {
  const student = contract.contract_students?.[0];
  const branch = contract.branch;
  const d = buildTemplateData(contract);

  return (
    <div className="cp-a4">
      {/* Header */}
      <div className="cp-header">
        <div className="cp-header-org">
          <div className="cp-org-name">{d.branch_legal_name}</div>
          <div className="cp-org-details">
            {d.branch_address && <span>{d.branch_address}</span>}
            {branch?.phone && <span>Tel: {branch.phone}</span>}
            {branch?.email && <span>{branch.email}</span>}
          </div>
        </div>
        <div className="cp-header-right">
          <div className="cp-contract-label">SHARTNOMA</div>
          <div className="cp-contract-number">№ {d.contract_number}</div>
          <div className="cp-contract-date">{d.contract_date}</div>
          <div className="cp-contract-city">{branch?.city || ''}</div>
        </div>
      </div>

      <div className="cp-divider"></div>

      {/* Title */}
      <div className="cp-title">
        TA'LIM XIZMATLARI KO'RSATISH TO'G'RISIDA SHARTNOMA
      </div>

      {/* Parties */}
      <div className="cp-section">
        <p className="cp-para">
          Ushbu shartnoma bir tomondan <strong>{d.branch_legal_name}</strong> (keyingi
          o'rinlarda <strong>"O'quv markazi"</strong> deb yuritiladi), direktor{' '}
          <strong>{d.director_name}</strong> tomonidan, ikkinchi tomondan{' '}
          <strong>{d.student_full_name}</strong> (keyingi o'rinlarda{' '}
          <strong>"O'quvchi"</strong> deb yuritiladi) o'rtasida tuzildi.
        </p>
      </div>

      {/* Student info */}
      <div className="cp-section">
        <div className="cp-section-title">1. O'QUVCHI MA'LUMOTLARI</div>
        <table className="cp-table">
          <tbody>
            <tr>
              <td>F.I.Sh:</td>
              <td><strong>{d.student_full_name}</strong></td>
              <td>Tug'ilgan sana:</td>
              <td><strong>{d.student_birth_date}</strong></td>
            </tr>
            <tr>
              <td>JSHSHIR:</td>
              <td><strong>{d.jshshir}</strong></td>
              <td>Passport:</td>
              <td><strong>{d.passport_series} {d.passport_number}</strong></td>
            </tr>
            <tr>
              <td>Berilgan sana:</td>
              <td><strong>{d.passport_given_date}</strong></td>
              <td>Telefon:</td>
              <td><strong>{d.phone}</strong></td>
            </tr>
            <tr>
              <td>Yashash manzili:</td>
              <td colSpan={3}><strong>{d.residential_address}</strong></td>
            </tr>
            {student?.registered_address && student.registered_address !== student.residential_address && (
              <tr>
                <td>Ro'yxatdan o'tgan:</td>
                <td colSpan={3}><strong>{d.registered_address}</strong></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Course info */}
      <div className="cp-section">
        <div className="cp-section-title">2. TA'LIM MA'LUMOTLARI</div>
        <table className="cp-table">
          <tbody>
            <tr>
              <td>Kurs:</td>
              <td><strong>{d.course_name}</strong></td>
              <td>Daraja:</td>
              <td><strong>{d.level_name}</strong></td>
            </tr>
            <tr>
              <td>Guruh:</td>
              <td><strong>{d.group_name}</strong></td>
              <td>Dars vaqti:</td>
              <td>
                <strong>
                  {student?.group?.start_time
                    ? `${student.group.start_time} – ${student.group.end_time}`
                    : '—'}
                </strong>
              </td>
            </tr>
            <tr>
              <td>Boshlanish sanasi:</td>
              <td><strong>{d.course_start_date}</strong></td>
              <td>Tugash sanasi:</td>
              <td><strong>{d.course_end_date}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment info */}
      <div className="cp-section">
        <div className="cp-section-title">3. TO'LOV SHARTLARI</div>
        <table className="cp-table">
          <tbody>
            <tr>
              <td>Oylik to'lov:</td>
              <td><strong>{formatMoney(student?.monthly_price)}</strong></td>
              <td>Umumiy to'lov:</td>
              <td><strong>{formatMoney(student?.total_price)}</strong></td>
            </tr>
          </tbody>
        </table>
        <p className="cp-note">
          To'lov har oy belgilangan sanada amalga oshiriladi. Kechiktirilgan
          to'lovlar uchun belgilangan tartibda jarimalar qo'llanilishi mumkin.
        </p>
      </div>

      {/* Branch bank info */}
      <div className="cp-section">
        <div className="cp-section-title">4. O'QUV MARKAZI REKVIZITLARI</div>
        <table className="cp-table">
          <tbody>
            <tr>
              <td>Tashkilot nomi:</td>
              <td colSpan={3}><strong>{d.branch_legal_name}</strong></td>
            </tr>
            <tr>
              <td>INN (STIR):</td>
              <td><strong>{d.branch_inn}</strong></td>
              <td>MFO:</td>
              <td><strong>{d.mfo}</strong></td>
            </tr>
            <tr>
              <td>Bank nomi:</td>
              <td colSpan={3}><strong>{d.bank_name}</strong></td>
            </tr>
            <tr>
              <td>Hisob raqam:</td>
              <td colSpan={3}><strong>{d.account_number}</strong></td>
            </tr>
            <tr>
              <td>Yuridik manzil:</td>
              <td colSpan={3}><strong>{d.branch_legal_address}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div className="cp-signatures">
        <div className="cp-sig-block">
          <div className="cp-sig-title">O'QUV MARKAZI</div>
          <div className="cp-sig-name">{d.branch_legal_name}</div>
          <div className="cp-sig-person">Direktor: {d.director_name}</div>
          <div className="cp-sig-line">
            <span>Imzo:</span>
            <span className="cp-sig-underline"></span>
          </div>
          <div className="cp-sig-line">
            <span>M.O'.</span>
            <span className="cp-sig-seal"></span>
          </div>
        </div>
        <div className="cp-sig-block">
          <div className="cp-sig-title">O'QUVCHI</div>
          <div className="cp-sig-name">{d.student_full_name}</div>
          <div className="cp-sig-person">
            Passport: {d.passport_series} {d.passport_number}
          </div>
          <div className="cp-sig-line">
            <span>Imzo:</span>
            <span className="cp-sig-underline"></span>
          </div>
          <div className="cp-sig-line">
            <span>Sana:</span>
            <span className="cp-sig-underline"></span>
          </div>
        </div>
      </div>

      <div className="cp-footer">
        <span>Shartnoma tuzilgan sana: {formatDate(contract.contract_date)}</span>
        <span>Shartnoma raqami: {d.contract_number}</span>
      </div>
    </div>
  );
};

export default ContractPrintModal;
