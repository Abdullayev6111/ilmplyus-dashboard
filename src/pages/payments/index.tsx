import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import './payments.css';
import Loading from '../../components/Loading';
import { useTranslation } from 'react-i18next';

interface Branch {
  id: number;
  name: string;
  address: string;
  city: string;
}

interface Employee {
  id: number;
  full_name: string;
}

interface Course {
  id: number;
  name: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
}

interface Group {
  id: number;
  name: string;
}

interface Payment {
  id: number;
  amount: string;
  payment_method: string;
  payment_period: string;
  created_at: string;
  updated_at: string;
  student_id: number;
  group_id: number;
  course_id: number;
  branch_id: number;
  user_id: number;
  branch?: Branch;
  cashier?: Employee;
  student?: Student;
  group?: Group;
  course?: Course;
  teacher?: Employee;
}

interface PaymentPayload {
  full_name: string;
  amount: number;
  payment_method: string;
  payment_period: string;
  course: string;
  group: string;
  teacher: string;
  course_id: number;
  branch_id: number;
  user_id: number;
  teacher_id?: number;
  group_id?: number;
  payment_date: string;
  student_id?: number;
}

const Payments = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | 'all' | null>(null);
  const [search, setSearch] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showRange, setShowRange] = useState(false);

  const [formData, setFormData] = useState({
    familiya: '',
    ism: '',
    sharif: '',
    amount: '',
    payment_type: '',
    payment_period: '',
    course_id: '',
    teacher_id: '',
    cashier_id: '',
    branch_id: '',
    payment_date: '',
    group_id: '',
  });

  const { data: apiData, isLoading } = useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data } = await API.get('/payments');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const { data: branchesData } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await API.get('/branches');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const { data: employeesData } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await API.get('/employees');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const { data: coursesData } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data } = await API.get('/courses');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const { data: groupsData } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data } = await API.get('/groups');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: PaymentPayload) => {
      const { data } = await API.post('/payments', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: PaymentPayload }) => {
      const { data } = await API.put(`/payments/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const closeModal = () => {
    setShowAddModal(false);
    setEditingPayment(null);
    setFormData({
      familiya: '',
      ism: '',
      sharif: '',
      amount: '',
      payment_type: '',
      payment_period: '',
      course_id: '',
      teacher_id: '',
      cashier_id: '',
      branch_id: '',
      payment_date: '',
      group_id: '',
    });
  };

  const openEditModal = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      familiya: payment.student?.last_name || '',
      ism: payment.student?.first_name || '',
      sharif: '',
      amount: payment.amount?.toString() || '',
      payment_type: payment.payment_method || '',
      payment_period: payment.payment_period || '',
      course_id: payment.course_id?.toString() || '',
      teacher_id: '',
      cashier_id: payment.user_id?.toString() || '',
      branch_id: payment.branch_id?.toString() || '',
      payment_date: payment.created_at?.split('T')[0] || '',
      group_id: payment.group_id?.toString() || '',
    });
    setShowAddModal(true);
  };

  const handleFormSubmit = () => {
    if (!formData.familiya || !formData.ism) {
      alert("Familiya va Ism to'ldirilishi shart!");
      return;
    }

    if (!formData.amount || !formData.payment_type || !formData.payment_period) {
      alert("Barcha to'lov maydonlarini to'ldiring!");
      return;
    }

    if (!formData.course_id || !formData.branch_id || !formData.cashier_id) {
      alert('Kurs, Filial va Kassir tanlanishi shart!');
      return;
    }

    const selectedCourse = coursesData?.find((c) => c.id === Number(formData.course_id));
    const selectedTeacher = employeesData?.find((e) => e.id === Number(formData.teacher_id));
    const selectedGroup = groupsData?.find((g) => g.id === Number(formData.group_id));

    const payload: PaymentPayload = {
      full_name: `${formData.familiya} ${formData.ism} ${formData.sharif}`.trim(),
      amount: Number(formData.amount),
      payment_method: formData.payment_type,
      payment_period: formData.payment_period,
      course: selectedCourse?.name || '',
      group: selectedGroup?.name || '',
      teacher: selectedTeacher?.full_name || '',
      course_id: Number(formData.course_id),
      branch_id: Number(formData.branch_id),
      user_id: Number(formData.cashier_id),
      teacher_id: formData.teacher_id ? Number(formData.teacher_id) : undefined,
      group_id: formData.group_id ? Number(formData.group_id) : undefined,
      payment_date: formData.payment_date || new Date().toISOString().split('T')[0],
      ...(editingPayment && {
        student_id: editingPayment.student_id,
      }),
    };

    console.log('📤 Yuborilayotgan payload:', payload);

    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment.id, updates: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const [archivedIds, setArchivedIds] = useState<number[]>(() => {
    const stored = localStorage.getItem('archivedPaymentIds');
    return stored ? JSON.parse(stored) : [];
  });

  const filtered = useMemo(() => {
    const payments = apiData || [];
    return payments
      .filter((u) => {
        if (archivedIds.includes(u.id)) return false;

        const fullName =
          `${u.student?.last_name ?? ''} ${u.student?.first_name ?? ''}`.toLowerCase();
        const matchSearch = fullName.includes(search.toLowerCase());
        const matchPaymentType = paymentTypeFilter ? u.payment_method === paymentTypeFilter : true;

        const paymentDate = new Date(u.created_at).getTime();
        const start = fromDate ? new Date(fromDate).getTime() : null;
        const end = toDate ? new Date(toDate).getTime() : null;

        let matchDate = true;
        if (start && end) {
          matchDate = paymentDate >= start && paymentDate <= end;
        } else if (start) {
          matchDate = paymentDate >= start;
        } else if (end) {
          matchDate = paymentDate <= end;
        }

        return matchSearch && matchPaymentType && matchDate;
      })
      .sort((a, b) => b.id - a.id);
  }, [apiData, search, paymentTypeFilter, fromDate, toDate, archivedIds]);

  const toggleAll = (checked: boolean) => setSelected(checked ? filtered?.map((u) => u.id) : []);

  const toggleOne = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const confirmDelete = () => {
    if (deleteTarget === 'all') {
      selected.forEach((id) => deleteMutation.mutate(id));
      setSelected([]);
    } else if (typeof deleteTarget === 'number') {
      deleteMutation.mutate(deleteTarget);
      setSelected((p) => p.filter((x) => x !== deleteTarget));
    }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  if (isLoading) return <Loading />;

  const archivePayment = (u: Payment) => {
    try {
      const newArchivedIds = [...archivedIds, u.id];
      setArchivedIds(newArchivedIds);

      localStorage.setItem('archivedPaymentIds', JSON.stringify(newArchivedIds));

      const allArchived = JSON.parse(localStorage.getItem('archivedPayments') || '[]');
      const newArchived = [...allArchived, u];
      localStorage.setItem('archivedPayments', JSON.stringify(newArchived));
    } catch (error) {
      console.error('❌ Arxivlash xatosi:', error);
      alert('Arxivlashda xatolik yuz berdi!');
    }
  };

  const formatAmount = (amount: string | number) => {
    return Number(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  return (
    <section className="payments container">
      <h1 className="main-title">{t('payments.mainTitle')}</h1>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal add-payment-modal large">
            <h3 className="modal-title">
              {editingPayment ? t('payments.editPaymentTitle') : t('payments.addNewPaymentTitle')}
            </h3>

            <div className="add-payment-form two-column">
              <div className="form-left">
                <div className="form-group">
                  <label>{t('payments.lastName')}</label>
                  <input
                    value={formData.familiya}
                    onChange={(e) => setFormData({ ...formData, familiya: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{t('payments.firstName')}</label>
                  <input
                    value={formData.ism}
                    onChange={(e) => setFormData({ ...formData, ism: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{t('payments.familyName')}</label>
                  <input
                    value={formData.sharif}
                    onChange={(e) => setFormData({ ...formData, sharif: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{t('payments.amount')}</label>
                  <input
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{t('payments.paymentMethod')}</label>
                  <select
                    value={formData.payment_type}
                    onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                  >
                    <option value="">{t('payments.choose')}</option>
                    <option value="Naqt">{t('payments.inCash')}</option>
                    <option value="Karta">{t('payments.byCard')}</option>
                    <option value="Bank">{t('payments.bank')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('payments.paymentPeriod')}</label>
                  <select
                    value={formData.payment_period}
                    onChange={(e) => setFormData({ ...formData, payment_period: e.target.value })}
                  >
                    <option value="">{t('payments.choose')}</option>
                    <option value="Yanvar">{t('payments.january')}</option>
                    <option value="Fevral">{t('payments.february')}</option>
                    <option value="Mart">{t('payments.march')}</option>
                    <option value="Aprel">{t('payments.april')}</option>
                    <option value="May">{t('payments.may')}</option>
                    <option value="Iyun">{t('payments.june')}</option>
                    <option value="Iyul">{t('payments.july')}</option>
                    <option value="Avgust">{t('payments.august')}</option>
                    <option value="Sentyabr">{t('payments.september')}</option>
                    <option value="Oktabr">{t('payments.october')}</option>
                    <option value="Noyabr">{t('payments.november')}</option>
                    <option value="Dekabr">{t('payments.december')}</option>
                  </select>
                </div>
              </div>

              <div className="form-right">
                <div className="form-group">
                  <label>Filial</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  >
                    <option value="">{t('payments.choose')}</option>
                    {branchesData?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.address}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('payments.course')}</label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  >
                    <option value="">{t('payments.choose')}</option>
                    {coursesData?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('payments.group')}</label>
                  <select
                    value={formData.group_id}
                    onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                  >
                    <option value="">{t('payments.choose')}</option>
                    {groupsData?.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('payments.teacher')}</label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  >
                    <option value="">{t('payments.choose')}</option>
                    {employeesData?.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('payments.cashier')}</label>
                  <select
                    value={formData.cashier_id}
                    onChange={(e) => setFormData({ ...formData, cashier_id: e.target.value })}
                  >
                    <option value="">{t('payments.choose')}</option>
                    {employeesData?.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('payments.paymentDate')}</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions center">
              <button
                className="cancel"
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({
                    familiya: '',
                    ism: '',
                    sharif: '',
                    amount: '',
                    payment_type: '',
                    payment_period: '',
                    course_id: '',
                    teacher_id: '',
                    cashier_id: '',
                    branch_id: '',
                    payment_date: '',
                    group_id: '',
                  });
                }}
              >
                {t('payments.cancel')}
              </button>
              <button className="primary" onClick={handleFormSubmit}>
                {t('payments.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>O'chirishni tasdiqlaysizmi?</h3>
            <div className="modal-actions">
              <button className="cancel" onClick={() => setShowDeleteModal(false)}>
                {t('payments.cancel')}
              </button>
              <button className="danger" onClick={confirmDelete}>
                {t('payments.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="payments-filters">
        <button className="add-new-payment" onClick={() => setShowAddModal(true)}>
          {t('payments.addPayment')}
        </button>
        <button
          className="delete-all"
          disabled={!selected.length}
          onClick={() => {
            setDeleteTarget('all');
            setShowDeleteModal(true);
          }}
        >
          {t('payments.delete')}
        </button>
        <select
          className="payment-type-select"
          value={paymentTypeFilter}
          onChange={(e) => setPaymentTypeFilter(e.target.value)}
        >
          <option value="">{t('payments.paymentMethod')}</option>
          <option value="Naqt">{t('payments.inCash')}</option>
          <option value="Karta">{t('payments.byCard')}</option>
          <option value="Bank">{t('payments.bank')}</option>
        </select>

        <div className="date-range-wrapper">
          <input
            type="text"
            readOnly
            className="date-range-input"
            placeholder="1.02.2026-30.02.2026"
            value={
              fromDate && toDate
                ? `${fromDate.replaceAll('-', '.')}-${toDate.replaceAll('-', '.')}`
                : ''
            }
            onClick={() => setShowRange(true)}
          />
          <i className="fa-solid fa-calendar-days calendar-icon"></i>

          {showRange && (
            <div className="range-box">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setShowRange(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="search-box">
          <input placeholder={t('payments.search')} onChange={(e) => setSearch(e.target.value)} />
          <i className="fa-solid fa-magnifying-glass"></i>
        </div>
      </div>

      <div className="payments-table-wrapper">
        <table className="payments-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>{t('payments.fish')}</th>
              <th>{t('payments.amount')}</th>
              <th>{t('payments.paymentMethod')}</th>
              <th>{t('payments.paymentPeriod')}</th>
              <th>{t('payments.course')}</th>
              <th>{t('payments.cashier')}</th>
              <th>{t('payments.branch')}</th>
              <th>{t('payments.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((u) => (
              <tr key={u.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    onChange={() => toggleOne(u.id)}
                  />
                </td>

                <td>{u.id}</td>
                <td>
                  {u.student?.last_name} {u.student?.first_name}
                </td>
                <td>{formatAmount(u.amount)}</td>
                <td>{u.payment_method}</td>
                <td>{u.payment_period}</td>
                <td>{u.course?.name}</td>
                <td>{u.cashier?.full_name}</td>
                <td>{u.branch?.address}</td>
                <td className="actions">
                  <button className="user-archive-btn" onClick={() => archivePayment(u)}>
                    <i className="fa-solid fa-box-archive"></i>
                  </button>
                  <button className="payment-edit-btn" onClick={() => openEditModal(u)}>
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button
                    className="payment-delete-btn"
                    onClick={() => {
                      setDeleteTarget(u.id);
                      setShowDeleteModal(true);
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

export default Payments;
