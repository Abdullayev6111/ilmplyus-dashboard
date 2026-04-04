import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "../../api/api";
import { useTranslation } from "react-i18next";
import EmptyState from "../../components/EmptyState";
import "./archive.css";

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

const ArchivedPayments = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [archived, setArchived] = useState<Payment[]>([]);
  useEffect(() => {
    const loadArchived = () => {
      try {
        const stored = localStorage.getItem("archivedPayments");
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("Arxivlangan to'lovlar:", parsed);
          setArchived(parsed);
        }
      } catch (error) {
        console.error("Arxivlarni yuklash xatosi:", error);
      }
    };
    loadArchived();
  }, []);

  const restoreMutation = useMutation({
    mutationFn: async (payment: Payment) => {
      const payload = {
        amount: Number(payment.amount),
        payment_method: payment.payment_method,
        payment_period: payment.payment_period,
        course_id: payment.course_id,
        branch_id: payment.branch_id,
        student_id: payment.student_id,
        group_id: payment.group_id,
      };
      const { data } = await API.post("/payments", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const restorePayment = (payment: Payment) => {
    try {
      const updatedArchived = archived.filter((p) => p.id !== payment.id);
      localStorage.setItem("archivedPayments", JSON.stringify(updatedArchived));
      setArchived(updatedArchived);

      const storedIds = JSON.parse(
        localStorage.getItem("archivedPaymentIds") || "[]",
      );
      const updatedIds = storedIds.filter((id: number) => id !== payment.id);
      localStorage.setItem("archivedPaymentIds", JSON.stringify(updatedIds));

      restoreMutation.mutate(payment);

      console.log("✅ To'lov qayta tiklandi:", payment.id);
    } catch (error) {
      console.error("❌ Restore xatosi:", error);
      alert(t("payments.restoreError"));
    }
  };

  const deleteFromArchive = (id: number) => {
    const updated = archived.filter((p) => p.id !== id);
    localStorage.setItem("archivedPayments", JSON.stringify(updated));
    setArchived(updated);

    console.log("Arxivdan butunlay o'chirildi:", id);
  };

  const formatAmount = (amount: string | number) => {
    return Number(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  return (
    <section className="payments container">
      <h1 className="main-title">{t("payments.archivedTitle")}</h1>

      <div className="payments-table-wrapper">
        <table className="payments-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t("payments.fish")}</th>
              <th>{t("payments.amount")}</th>
              <th>{t("payments.paymentMethod")}</th>
              <th>{t("payments.paymentPeriod")}</th>
              <th>{t("payments.course")}</th>
              <th>{t("payments.cashier")}</th>
              <th>{t("payments.branch")}</th>
              <th>{t("payments.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {archived.length === 0 ? (
              <EmptyState colSpan={10} message={t("payments.noArchived")} />
            ) : (
              archived?.map((u) => (
                <tr key={u.id}>
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
                    <button
                      className="restore-btn"
                      onClick={() => restorePayment(u)}
                      title={t("payments.restore")}
                    >
                      <i className="fa-solid fa-rotate-left"></i>
                    </button>
                    <button
                      className="payment-delete-btn"
                      onClick={() => deleteFromArchive(u.id)}
                      title={t("payments.permanentDelete")}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ArchivedPayments;
