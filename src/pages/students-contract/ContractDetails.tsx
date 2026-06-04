import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import './studentsContracts.css';
import { API } from '@/api/api';

const ContractDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: responseData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['student-contract', id],
    queryFn: () => API.get(`/student-contracts/${id}`).then((res) => res.data),
  });

  const contract = responseData?.contract || responseData?.data || responseData;

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getFullName = (person: any) => {
    if (!person) return '';
    return `${person.last_name || ''} ${person.first_name || ''} ${person.father_name || ''}`.trim();
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'in_progress';
      case 'completed':
        return 'completed';
      case 'canceled':
        return 'canceled';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="container students-contract" style={{ marginTop: 50, marginLeft: 140 }}>
        <div style={{ textAlign: 'center', padding: 40 }}>Yuklanmoqda...</div>
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div className="container students-contract" style={{ marginTop: 50, marginLeft: 140 }}>
        <div style={{ textAlign: 'center', padding: 40, color: 'red' }}>
          Ma'lumot topilmadi yoki xatolik yuz berdi.
        </div>
      </div>
    );
  }

  return (
    <div className="container students-contract" style={{ marginTop: 50, marginLeft: 140 }}>
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate('/students-contract')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#003366',
            cursor: 'pointer',
            fontFamily: 'noto-m',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i className="fa-solid fa-arrow-left"></i> Ortga qaytish
        </button>
      </div>

      <div className="sc-details-page">
        <div className="sc-details-header" style={{ flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="fa-solid fa-file-lines" style={{ color: '#cbd5e1' }}></i>
            <span className="sc-details-title">
              SHARTNOMA MA'LUMOTLARI (#{String(contract.id).padStart(3, '0')})
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <span className={`sc-status-badge ${getStatusType(contract.status)}`}>
              {responseData.status_label || "Holati noma'lum"}
            </span>
            <span className="sc-status-badge purple">
              {responseData.type_label || "Turi noma'lum"}
            </span>
            {contract.language && (
              <span className="sc-status-badge in_progress">
                Shartnoma tili: {contract.language.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {contract.organization && (
          <div className="sc-details-section">
            <div className="sc-details-section-title">
              <i className="fa-solid fa-building"></i> Tashkilot ma'lumotlari
            </div>
            <div className="sc-details-grid">
              <div className="sc-details-item">
                <span className="sc-details-label">Tashkilot nomi</span>
                <span className="sc-details-value">{contract.organization.organization_name}</span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">Tashkilot STIR</span>
                <span className="sc-details-value">{contract.organization.stir}</span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">Shartnoma sanasi</span>
                <span className="sc-details-value">
                  {formatDateTime(contract.contract_date || contract.created_at)}
                </span>
              </div>
              <div className="sc-details-item" style={{ gridColumn: '1 / -1' }}>
                <span className="sc-details-label">Rahbar F.I.SH</span>
                <span className="sc-details-value">
                  {`${contract.organization.director_last_name || ''} ${contract.organization.director_first_name || ''} ${contract.organization.director_father_name || ''}`.trim()}
                </span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">Bank nomi</span>
                <span className="sc-details-value">{contract.organization.bank_name}</span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">Xisob raqam</span>
                <span className="sc-details-value">{contract.organization.bank_account}</span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">MFO</span>
                <span className="sc-details-value">{contract.organization.mfo}</span>
              </div>
            </div>
          </div>
        )}

        {contract.representative && (
          <div className="sc-details-section">
            <div className="sc-details-section-title">
              <i className="fa-solid fa-user"></i> Vakil ma'lumotlari
            </div>
            <div className="sc-details-grid">
              <div className="sc-details-item" style={{ gridColumn: '1 / -1' }}>
                <span className="sc-details-label">Vakil F.I.SH</span>
                <span className="sc-details-value">{getFullName(contract.representative)}</span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">JSHSHIR</span>
                <span className="sc-details-value">{contract.representative.jshshir}</span>
              </div>
              <div className="sc-details-item">
                <span className="sc-details-label">Passport Seriya va Raqam</span>
                <span className="sc-details-value">
                  {contract.representative.passport_series}{' '}
                  {contract.representative.passport_number}
                </span>
              </div>
              <div className="sc-details-item"></div>
              <div className="sc-details-item">
                <span className="sc-details-label">Telefon raqam</span>
                <span className="sc-details-value">{contract.representative.phone}</span>
              </div>
              <div className="sc-details-item" style={{ gridColumn: '2 / -1' }}>
                <span className="sc-details-label">Yashash manzili</span>
                <span className="sc-details-value">
                  {contract.representative.residential_address}
                </span>
              </div>
            </div>
          </div>
        )}

        {(contract.contract_students || []).length > 0 && (
          <div className="sc-details-section">
            <div className="sc-details-section-title">
              <i className="fa-solid fa-graduation-cap"></i> O'quvchi ma'lumotlari
            </div>
            {contract.contract_students.map((student: any, idx: number) => (
              <div key={idx} className="sc-details-student-card" style={{ marginBottom: 16 }}>
                <div className="sc-details-grid">
                  <div className="sc-details-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="sc-details-label">O'quvchi F.I.SH</span>
                    <span className="sc-details-value">{getFullName(student)}</span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">Tug'ilgan sanasi</span>
                    <span className="sc-details-value">{formatDateTime(student.birth_date)}</span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">JSHSHIR</span>
                    <span className="sc-details-value">{student.jshshir || 'Kiritilmagan'}</span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">Voyaga yetganmi</span>
                    <span className="sc-details-value">{student.is_minor ? 'Ha' : "Yo'q"}</span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">Guvohnoma / Passport</span>
                    <span className="sc-details-value">
                      {student.birth_cert_series || student.passport_series}{' '}
                      {student.birth_cert_number || student.passport_number}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">Passport bormi</span>
                    <span className="sc-details-value">{student.has_passport ? 'Ha' : "Yo'q"}</span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">Berilgan sanasi</span>
                    <span className="sc-details-value">
                      {formatDateTime(student.passport_given_date)}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">Amal qilish muddati</span>
                    <span className="sc-details-value">
                      {formatDateTime(student.passport_expiry_date)}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">Telefon raqam</span>
                    <span className="sc-details-value">
                      {student.phone ? `${student.phone}` : 'Kiritilmagan'}
                    </span>
                  </div>
                  <div className="sc-details-item" style={{ gridColumn: '2 / -1' }}>
                    <span className="sc-details-label">Qo'shimcha telefonlar</span>
                    <span className="sc-details-value">
                      {student.extra_phones && student.extra_phones.length > 0
                        ? student.extra_phones.map((p: string) => `${p}`).join(', ')
                        : 'Kiritilmagan'}
                    </span>
                  </div>
                  <div className="sc-details-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="sc-details-label">Ro'yxatdan o'tgan manzil</span>
                    <span className="sc-details-value">
                      {student.registered_address || 'Kiritilmagan'}
                    </span>
                  </div>
                  <div className="sc-details-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="sc-details-label">Yashash manzili</span>
                    <span className="sc-details-value">
                      {student.residential_address || 'Kiritilmagan'}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">O'quv kursi</span>
                    <span className="sc-details-value">
                      {student.course?.name_uz || student.level?.name_uz || 'Kiritilmagan'}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">Guruh</span>
                    <span className="sc-details-value">
                      {student.group?.name || 'Kiritilmagan'}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">Oylik to'lov summasi</span>
                    <span className="sc-details-value">
                      {student.monthly_price
                        ? `${Number(student.monthly_price).toLocaleString()} UZS`
                        : 'Kiritilmagan'}
                    </span>
                  </div>
                  <div className="sc-details-item">
                    <span className="sc-details-label">Umumiy to'lov summasi</span>
                    <span className="sc-details-value">
                      {student.total_price
                        ? `${Number(student.total_price).toLocaleString()} UZS`
                        : 'Kiritilmagan'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {contract.notes && (
          <div className="sc-details-section">
            <div className="sc-details-section-title">
              <i className="fa-solid fa-circle-info"></i> Izohlar
            </div>
            <div className="sc-details-student-card">
              <span className="sc-details-value">{contract.notes}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractDetails;
