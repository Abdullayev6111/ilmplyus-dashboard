import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { API } from "../../api/api";
import { getLocalized } from "../../utils/getLocalized";
import { getApiErrorMessage } from "../../utils/apiError";
import { Protected } from "../../components/Protected";
import { usePermission } from "../../hooks/usePermission";
import "./payrollDistribution.css";

/* ------------------------------------------------------------------ *
 * Ish haqini taqsimlash (payroll distribution) sahifasi.
 * Contracts jadvalidagi "Oylik taqsimlash" tugmasidan alohida page
 * sifatida ochiladi (modal emas).
 *
 * Rejim (scheme) form API javobidan olinadi:
 *   scheme === "foiz"  -> FOIZLI UI (AVANS / OYLIK tab lari)
 *   aks holda          -> XODIMLAR UI (oklad, tabsiz)
 * Contracts'dan kelgan monthly_salary_type header'ni darhol chizish uchun
 * fallback bo'lib xizmat qiladi.
 *
 * Avtomatik (kulrang) maydonlar client-side ayirma bilan hisoblanadi;
 * formulalar `useMemo` bloklarida bir joyda turadi — backend boshqacha
 * hisoblasa, faqat o'sha joyni tuzatish yetarli.
 * ------------------------------------------------------------------ */

type Scheme = "foiz" | "oklad";
// Backend enum: SalaryDistribution::KIND_ADVANCE / KIND_SALARY.
// UI'da AVANS/OYLIK deb ko'rsatiladi, backendga advance/salary yuboriladi.
type Kind = "advance" | "salary";

interface LocalizedObj {
  name_uz?: string | null;
  name_ru?: string | null;
  name_en?: string | null;
  name?: string | null;
}

/** Backend bo'lim/lavozim/filialni matn sifatida beradi; eski kod obyekt uzatishi mumkin. */
type NameLike = string | LocalizedObj | null | undefined;

interface DistFormResponse {
  scheme?: string;
  kind?: string;
  period?: { year?: number; month?: number };
  period_locked?: boolean;
  employee?: {
    id?: number;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    department?: NameLike;
    position?: NameLike;
    branch?: NameLike;
  };
  branch?: NameLike;
  /** foiz: joriy balans */
  balance?: number | string;
  /** foiz: kelishilgan foiz */
  agreed_percent?: number | string;
  /** oklad: shartnoma bo'yicha oklad (backend shu nom bilan qaytaradi) */
  contract_salary?: number | string;
  /** Kiritilgan tuzatishlar soati (hozircha UI'da ko'rsatilmaydi). */
  adjustment_hours?: number | string;
  /** Maksimal chegaralar: total_cashless — "jami naqdsiz" uchun shift. */
  limits?: { total_cashless?: number; privileged_amount?: number };
  /** maydonlar uchun oldindan hisoblangan default qiymatlar */
  values?: Record<string, number | string | null>;
}

/** Router state — header'ni darhol chizish uchun contracts'dan uzatiladi. */
interface NavState {
  fullName?: string;
  department?: LocalizedObj;
  position?: LocalizedObj;
  branch?: LocalizedObj;
  salaryType?: string; // 'foiz' | 'shtat' | 'soat'
  balance?: number | string;
  agreedPercent?: number | string;
  oklad?: number | string;
}

interface FoizFields {
  comment: string;
  jami_naqdsiz: number | "";
  naqdsiz: number | "";
  imtiyozli: number | "";
  tax_payer: string;
  cash_tax: string;
}

interface OkladFields {
  comment: string;
  jami_oylik_naqdsiz: number | "";
  avans_naqdsiz: number | "";
  avans_naqd: number | "";
  imtiyozli: number | "";
  tax_payer: string;
  cash_tax: string;
}

const emptyFoiz: FoizFields = {
  comment: "",
  jami_naqdsiz: "",
  naqdsiz: "",
  imtiyozli: "",
  tax_payer: "",
  cash_tax: "",
};

const emptyOklad: OkladFields = {
  comment: "",
  jami_oylik_naqdsiz: "",
  avans_naqdsiz: "",
  avans_naqd: "",
  imtiyozli: "",
  tax_payer: "",
  cash_tax: "",
};

/** Raqamni "4 500 000" ko'rinishida (bo'shliq bilan) formatlaydi. */
const fmt = (n: number | "" | undefined | null): string =>
  n === "" || n === undefined || n === null ? "" : Number(n).toLocaleString("ru-RU");

/** Foydalanuvchi kiritgan matndan faqat raqamlarni ajratib oladi. */
const parseNum = (s: string): number | "" => {
  const digits = s.replace(/\D/g, "");
  return digits === "" ? "" : Number(digits);
};

const num = (v: number | string | undefined | null): number => {
  if (v === "" || v === undefined || v === null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

const toNumOrEmpty = (v: unknown): number | "" =>
  v === null || v === undefined || v === "" ? "" : Number(v);

/** Bo'lim/lavozim/filial matn ham, lokalizatsiya obyekti ham bo'lishi mumkin. */
const resolveName = (v: NameLike, lang: string): string => {
  if (!v) return "-";
  if (typeof v === "string") return v.trim() || "-";
  return getLocalized(v, "name", lang);
};

const PayrollDistribution: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const canView = usePermission("payroll_distributions.view");

  const navState = (location.state as NavState) || {};

  // Davr: URL query orqali override qilinadi, aks holda joriy oy/yil.
  const now = new Date();
  const periodYear = Number(searchParams.get("year")) || now.getFullYear();
  const periodMonth = Number(searchParams.get("month")) || now.getMonth() + 1;

  const [kind, setKind] = useState<Kind>("advance");

  // Har bir tab uchun alohida holat — tab almashganda kiritilganlar saqlanadi.
  const [avans, setAvans] = useState<FoizFields>(emptyFoiz);
  const [oylik, setOylik] = useState<FoizFields>(emptyFoiz);
  const [oklad, setOklad] = useState<OkladFields>(emptyOklad);
  const [showErrors, setShowErrors] = useState(false);

  // Qaysi (rejim/kind) uchun default qiymatlar bir marta seed qilinganini kuzatadi.
  const seeded = useRef<Set<string>>(new Set());

  const {
    data: form,
    isLoading,
    isError,
  } = useQuery<DistFormResponse>({
    queryKey: ["payroll-distribution-form", employeeId, periodYear, periodMonth, kind],
    queryFn: async () => {
      const { data } = await API.get(`/payroll/distributions/form/${employeeId}`, {
        params: { period_year: periodYear, period_month: periodMonth, kind },
      });
      // Javob { data: { ... } } ko'rinishida keladi
      return data?.data ?? data;
    },
    enabled: !!employeeId && canView,
    // A.5: `kind` queryKey ichida — tab almashganda yangi so'rov ketadi. Oldingi
    // javob placeholder bo'lib turmasa `isLoading` butun sahifani (header + tab'lar)
    // "Yuklanmoqda..." bilan almashtiradi va ekran sakraydi. Header qiymatlari
    // (balans, foiz) ikkala tab uchun bir xil, shuning uchun bu xavfsiz.
    placeholderData: (previous) => previous,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Rejim: backend `scheme` ("percent" | "fixed") — haqiqat manbai. navState faqat
  // javob kelgunicha zaxira (contracts'dagi salary_type: percent/staff_schedule/
  // academic_hours). Foizli -> AVANS/OYLIK tabli UI; aks holda -> oklad UI.
  const scheme: Scheme = useMemo(() => {
    const raw = (form?.scheme || navState.salaryType || "").toLowerCase();
    if (raw === "percent" || raw === "foiz") return "foiz";
    return "oklad";
  }, [form?.scheme, navState.salaryType]);

  // Form default qiymatlarini tegishli holatga bir marta seed qilish.
  useEffect(() => {
    if (!form?.values) return;
    const v = form.values;
    if (scheme === "foiz") {
      const key = `foiz:${kind}`;
      if (seeded.current.has(key)) return;
      seeded.current.add(key);
      const seed: FoizFields = {
        comment: (v.comment as string) ?? "",
        jami_naqdsiz: toNumOrEmpty(v.jami_naqdsiz),
        naqdsiz: toNumOrEmpty(v.naqdsiz),
        imtiyozli: toNumOrEmpty(v.imtiyozli),
        tax_payer: (v.tax_payer as string) ?? "",
        cash_tax: (v.cash_tax as string) ?? "",
      };
      (kind === "advance" ? setAvans : setOylik)(seed);
    } else {
      if (seeded.current.has("oklad")) return;
      seeded.current.add("oklad");
      setOklad({
        comment: (v.comment as string) ?? "",
        jami_oylik_naqdsiz: toNumOrEmpty(v.jami_oylik_naqdsiz),
        avans_naqdsiz: toNumOrEmpty(v.avans_naqdsiz),
        avans_naqd: toNumOrEmpty(v.avans_naqd),
        imtiyozli: toNumOrEmpty(v.imtiyozli),
        tax_payer: (v.tax_payer as string) ?? "",
        cash_tax: (v.cash_tax as string) ?? "",
      });
    }
  }, [form, scheme, kind]);

  // ---- Header qiymatlari ----
  const fullName =
    form?.employee?.full_name ||
    [form?.employee?.last_name, form?.employee?.first_name, form?.employee?.middle_name]
      .filter(Boolean)
      .join(" ") ||
    navState.fullName ||
    "-";
  const departmentName = resolveName(
    form?.employee?.department ?? navState.department,
    i18n.language,
  );
  const positionName = resolveName(form?.employee?.position ?? navState.position, i18n.language);
  // Filial backend'da employee ichida matn sifatida keladi
  const branchName = resolveName(
    form?.employee?.branch ?? form?.branch ?? navState.branch,
    i18n.language,
  );
  const balance = form?.balance ?? navState.balance;
  const agreedPercent = form?.agreed_percent ?? navState.agreedPercent;
  // Backend `contract_salary` nomi bilan qaytaradi. navState faqat zaxira —
  // u contracts jadvalidagi `base_salary` (asosiy maosh), shartnoma okladi emas,
  // shuning uchun backend qiymati doim ustun turishi kerak.
  const okladTotal = num(form?.contract_salary ?? navState.oklad);
  const periodLocked = form?.period_locked === true;

  const soum = t("payrollDistribution.soum");

  // ---- Tanlov (select) variantlari ----
  const taxPayerOptions = [
    { value: "employee", label: t("payrollDistribution.taxPayerOptions.employee") },
    { value: "organization", label: t("payrollDistribution.taxPayerOptions.organization") },
  ];
  const yesNoOptions = [
    { value: "yes", label: t("payrollDistribution.yes") },
    { value: "no", label: t("payrollDistribution.no") },
  ];

  // ---- Avtomatik (kulrang) maydonlar: client-side ayirma ----
  const foizState = kind === "advance" ? avans : oylik;
  const setFoizState = kind === "advance" ? setAvans : setOylik;
  // Foiz naqd (avtomatik) = balans − jami naqdsiz.
  // Ilgari `jami_naqdsiz − naqdsiz` edi — bu backend hisobiga zid. Tasdiq:
  // saqlangan yozuvda balance=80000, total_cashless=20000 -> payout_cash=60000
  // (backend o'zi hisoblaydi, frontend bu maydonni yubormaydi). Eski formula
  // 20000-10000=10000 ko'rsatardi, ya'ni ekrandagi son bazadagidan farq qilardi.
  const foizNaqdAuto = Math.max(0, num(balance) - num(foizState.jami_naqdsiz));

  // oklad rejimi avtomatik maydonlari
  const jamiOylikNaqdAuto = Math.max(0, okladTotal - num(oklad.jami_oylik_naqdsiz)); // oklad − jami oylik naqdsiz
  const oylikNaqdsizAuto = Math.max(0, num(oklad.jami_oylik_naqdsiz) - num(oklad.avans_naqdsiz)); // jami oylik naqdsiz − avans naqdsiz
  const oylikNaqdAuto = Math.max(0, jamiOylikNaqdAuto - num(oklad.avans_naqd)); // jami oylik naqd − avans naqd

  // ---- Maksimal chegaralar (spetsifikatsiya "…dan ko'p bo'lmasligi kerak") ----
  // "Jami naqdsiz" shifti backenddan keladi: foizda balans, okladda shartnoma oklad.
  const maxTotalCashless = num(form?.limits?.total_cashless ?? (scheme === "foiz" ? balance : okladTotal));
  const maxPrivilegedApi = num(form?.limits?.privileged_amount ?? maxTotalCashless);

  const limitMsg = (max: number) =>
    t("payrollDistribution.validation.maxExceeded", { max: fmt(max) });

  /** Foizli rejim chegaralari. */
  const foizLimitErrors = useMemo(() => {
    const errors: Partial<Record<keyof FoizFields, string>> = {};
    const jami = num(foizState.jami_naqdsiz);
    // Jami naqdsiz ≤ balans
    if (foizState.jami_naqdsiz !== "" && jami > maxTotalCashless) {
      errors.jami_naqdsiz = limitMsg(maxTotalCashless);
    }
    // Naqdsiz ≤ jami naqdsiz
    if (foizState.naqdsiz !== "" && num(foizState.naqdsiz) > jami) {
      errors.naqdsiz = limitMsg(jami);
    }
    // Imtiyozli qism ≤ jami naqdsiz (va backend shiftidan oshmasin)
    if (foizState.imtiyozli !== "") {
      const maxPrivileged = Math.min(jami, maxPrivilegedApi);
      if (num(foizState.imtiyozli) > maxPrivileged) errors.imtiyozli = limitMsg(maxPrivileged);
    }
    return errors;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foizState, maxTotalCashless, maxPrivilegedApi, i18n.language]);

  /** Oklad rejimi chegaralari. */
  const okladLimitErrors = useMemo(() => {
    const errors: Partial<Record<keyof OkladFields, string>> = {};
    const jamiNaqdsiz = num(oklad.jami_oylik_naqdsiz);
    // Jami oylik naqdsiz ≤ shartnomadagi oylik
    if (oklad.jami_oylik_naqdsiz !== "" && jamiNaqdsiz > maxTotalCashless) {
      errors.jami_oylik_naqdsiz = limitMsg(maxTotalCashless);
    }
    // Avans naqdsiz ≤ jami oylik naqdsiz
    if (oklad.avans_naqdsiz !== "" && num(oklad.avans_naqdsiz) > jamiNaqdsiz) {
      errors.avans_naqdsiz = limitMsg(jamiNaqdsiz);
    }
    // Avans naqd ≤ jami oylik naqd (avtomatik hisoblangan)
    if (oklad.avans_naqd !== "" && num(oklad.avans_naqd) > jamiOylikNaqdAuto) {
      errors.avans_naqd = limitMsg(jamiOylikNaqdAuto);
    }
    // Imtiyozli qism ≤ jami oylik naqdsiz (va backend shiftidan oshmasin)
    if (oklad.imtiyozli !== "") {
      const maxPrivileged = Math.min(jamiNaqdsiz, maxPrivilegedApi);
      if (num(oklad.imtiyozli) > maxPrivileged) errors.imtiyozli = limitMsg(maxPrivileged);
    }
    return errors;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oklad, maxTotalCashless, maxPrivilegedApi, jamiOylikNaqdAuto, i18n.language]);

  // ---- Saqlash mutatsiyasi ----
  const saveMutation = useMutation({
    mutationFn: async () => {
      const base = {
        period_year: periodYear,
        period_month: periodMonth,
      };
      // Backend maydon nomlari (jonli API bilan tasdiqlangan):
      //   Izoh          -> `note`  ("comment" jim e'tiborsiz qoldiriladi!)
      //   percent: kind + total_cashless + payout_cashless
      //   fixed:   total_cashless + advance_cashless + advance_cash (kind yuborilmaydi)
      // Avtomatik maydonlar (payout_cashless/total_cash/payout_cash fixed'da) —
      // backend o'zi hisoblaydi, yuborilmaydi.
      const payload =
        scheme === "foiz"
          ? {
              ...base,
              kind,
              note: foizState.comment,
              total_cashless: num(foizState.jami_naqdsiz),
              payout_cashless: num(foizState.naqdsiz),
              privileged_amount: num(foizState.imtiyozli),
              income_tax_payer: foizState.tax_payer,
              cash_tax: foizState.cash_tax,
            }
          : {
              ...base,
              note: oklad.comment,
              total_cashless: num(oklad.jami_oylik_naqdsiz),
              advance_cashless: num(oklad.avans_naqdsiz),
              advance_cash: num(oklad.avans_naqd),
              privileged_amount: num(oklad.imtiyozli),
              income_tax_payer: oklad.tax_payer,
              cash_tax: oklad.cash_tax,
            };
      const { data } = await API.post(`/payroll/distributions/${employeeId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-distributions"] });
      notifications.show({
        title: t("payrollDistribution.savedTitle"),
        message: t("payrollDistribution.savedMessage"),
        color: "green",
      });
      navigate(-1);
    },
    // A.1: ilgari onError yo'q edi — saqlash muvaffaqiyatsiz bo'lsa foydalanuvchi
    // hech narsa ko'rmasdi va ma'lumot saqlandi deb o'ylardi.
    onError: (error) => {
      notifications.show({
        title: t("payrollDistribution.errorTitle"),
        message: getApiErrorMessage(error, t("payrollDistribution.saveErrorMessage")),
        color: "red",
      });
    },
  });

  // ---- Validatsiya ----
  const isFoizValid =
    foizState.jami_naqdsiz !== "" &&
    foizState.naqdsiz !== "" &&
    foizState.tax_payer !== "" &&
    foizState.cash_tax !== "" &&
    Object.keys(foizLimitErrors).length === 0;
  const isOkladValid =
    oklad.jami_oylik_naqdsiz !== "" &&
    oklad.avans_naqdsiz !== "" &&
    oklad.avans_naqd !== "" &&
    oklad.tax_payer !== "" &&
    oklad.cash_tax !== "" &&
    Object.keys(okladLimitErrors).length === 0;
  const isValid = scheme === "foiz" ? isFoizValid : isOkladValid;

  const handleSave = () => {
    setShowErrors(true);
    if (!isValid || periodLocked) return;
    saveMutation.mutate();
  };

  // Bo'sh majburiy maydon (saqlash bosilgandan keyin) yoki chegara buzilishi —
  // ikkalasi ham qizil ramka bilan belgilanadi.
  const invalid = (empty: boolean, limitError?: string) =>
    (showErrors && empty) || limitError ? "pd-invalid" : "";

  /** Chegara buzilgan bo'lsa maydon ostida izoh chiqaradi. */
  const errorText = (message?: string) =>
    message ? <span className="pd-field-error">{message}</span> : null;

  if (!canView) return null;

  if (isLoading) {
    return (
      <div className="pd-container">
        <div className="pd-loading">{t("payrollDistribution.loading")}</div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="pd-container">
        <div className="pd-error">{t("payrollDistribution.error")}</div>
      </div>
    );
  }

  return (
    <div className="pd-container">
      <div className="pd-card">
        {/* Ma'lumot bandi */}
        <div className={`pd-info ${scheme === "oklad" ? "pd-info--oklad" : ""}`}>
          <div className="pd-info-item">
            <span className="pd-info-label">{t("payrollDistribution.info.fullName")}</span>
            <span className="pd-info-value">{fullName}</span>
          </div>
          <div className="pd-info-item">
            <span className="pd-info-label">{t("payrollDistribution.info.departmentPosition")}</span>
            <span className="pd-info-value">
              {departmentName} / {positionName}
            </span>
          </div>
          <div className="pd-info-item">
            <span className="pd-info-label">{t("payrollDistribution.info.branch")}</span>
            <span className="pd-info-value">{branchName}</span>
          </div>
          {scheme === "foiz" ? (
            <>
              <div className="pd-info-item">
                <span className="pd-info-label">{t("payrollDistribution.info.balance")}</span>
                <span className="pd-info-value">
                  {balance != null && balance !== "" ? `${fmt(Number(balance))} ${soum}` : "-"}
                </span>
              </div>
              <div className="pd-info-item">
                <span className="pd-info-label">{t("payrollDistribution.info.agreedPercent")}</span>
                <span className="pd-info-value">
                  {agreedPercent != null && agreedPercent !== "" ? `${agreedPercent}%` : "-"}
                </span>
              </div>
            </>
          ) : (
            <div className="pd-info-item">
              <span className="pd-info-label">{t("payrollDistribution.info.contractOklad")}</span>
              <span className="pd-info-value">{okladTotal ? `${fmt(okladTotal)} ${soum}` : "-"}</span>
            </div>
          )}
        </div>

        {scheme === "foiz" ? (
          <>
            {/* Tab lar */}
            <div className="pd-tabs">
              <button
                className={`pd-tab ${kind === "advance" ? "active" : ""}`}
                onClick={() => setKind("advance")}
              >
                {t("payrollDistribution.tabs.avans")}
              </button>
              <button
                className={`pd-tab ${kind === "salary" ? "active" : ""}`}
                onClick={() => setKind("salary")}
              >
                {t("payrollDistribution.tabs.oylik")}
              </button>
            </div>

            {/* FOIZLI forma */}
            <div className="pd-form">
              {periodLocked && (
                <div className="pd-locked">⚠️ {t("payrollDistribution.periodLocked")}</div>
              )}

              <div className="pd-row pd-row--1">
                <div className="pd-field">
                  <label>{t("payrollDistribution.fields.comment")}</label>
                  <textarea
                    disabled={periodLocked}
                    value={foizState.comment}
                    onChange={(e) => setFoizState({ ...foizState, comment: e.target.value })}
                  />
                </div>
              </div>

              <div className="pd-row">
                <div className="pd-field">
                  <label>
                    {kind === "advance"
                      ? t("payrollDistribution.fields.jamiAvansNaqdsiz")
                      : t("payrollDistribution.fields.jamiOylikNaqdsiz")}
                    <span className="req">*</span>
                  </label>
                  <input
                    className={invalid(foizState.jami_naqdsiz === "", foizLimitErrors.jami_naqdsiz)}
                    inputMode="numeric"
                    placeholder="0"
                    disabled={periodLocked}
                    value={fmt(foizState.jami_naqdsiz)}
                    onChange={(e) => setFoizState({ ...foizState, jami_naqdsiz: parseNum(e.target.value) })}
                  />
                  {errorText(foizLimitErrors.jami_naqdsiz)}
                </div>
                <div className="pd-field">
                  <label>
                    {kind === "advance"
                      ? t("payrollDistribution.fields.avansNaqdsiz")
                      : t("payrollDistribution.fields.oylikNaqdsiz")}
                    <span className="req">*</span>
                  </label>
                  <input
                    className={invalid(foizState.naqdsiz === "", foizLimitErrors.naqdsiz)}
                    inputMode="numeric"
                    placeholder="0"
                    disabled={periodLocked}
                    value={fmt(foizState.naqdsiz)}
                    onChange={(e) => setFoizState({ ...foizState, naqdsiz: parseNum(e.target.value) })}
                  />
                  {errorText(foizLimitErrors.naqdsiz)}
                </div>
              </div>

              <div className="pd-row">
                <div className="pd-field">
                  <label>
                    {kind === "advance"
                      ? t("payrollDistribution.fields.avansNaqdAuto")
                      : t("payrollDistribution.fields.oylikNaqdAuto")}
                    <span className="req">*</span>
                  </label>
                  <input className="pd-auto" value={fmt(foizNaqdAuto)} readOnly tabIndex={-1} />
                </div>
                <div className="pd-field">
                  <label>{t("payrollDistribution.fields.privilegedPart")}</label>
                  <input
                    className={invalid(false, foizLimitErrors.imtiyozli)}
                    inputMode="numeric"
                    placeholder="0"
                    disabled={periodLocked}
                    value={fmt(foizState.imtiyozli)}
                    onChange={(e) => setFoizState({ ...foizState, imtiyozli: parseNum(e.target.value) })}
                  />
                  {errorText(foizLimitErrors.imtiyozli)}
                </div>
              </div>

              <div className="pd-row">
                <div className="pd-field">
                  <label>
                    {t("payrollDistribution.fields.taxPayer")}
                    <span className="req">*</span>
                  </label>
                  <select
                    className={invalid(foizState.tax_payer === "")}
                    disabled={periodLocked}
                    value={foizState.tax_payer}
                    onChange={(e) => setFoizState({ ...foizState, tax_payer: e.target.value })}
                  >
                    <option value="">{t("payrollDistribution.choose")}</option>
                    {taxPayerOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pd-field">
                  <label>
                    {t("payrollDistribution.fields.cashTax")}
                    <span className="req">*</span>
                  </label>
                  <select
                    className={invalid(foizState.cash_tax === "")}
                    disabled={periodLocked}
                    value={foizState.cash_tax}
                    onChange={(e) => setFoizState({ ...foizState, cash_tax: e.target.value })}
                  >
                    <option value="">{t("payrollDistribution.choose")}</option>
                    {yesNoOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pd-actions">
                <Protected permission="payroll_distributions.create">
                  <button
                    className="pd-btn pd-btn-save"
                    onClick={handleSave}
                    disabled={saveMutation.isPending || periodLocked}
                  >
                    {t("payrollDistribution.save")}
                  </button>
                </Protected>
                <button className="pd-btn pd-btn-cancel" onClick={() => navigate(-1)}>
                  {t("payrollDistribution.back")}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* XODIMLAR (oklad) forma */
          <div className="pd-form">
            {periodLocked && (
              <div className="pd-locked">⚠️ {t("payrollDistribution.periodLocked")}</div>
            )}

            <div className="pd-row pd-row--1">
              <div className="pd-field">
                <label>{t("payrollDistribution.fields.comment")}</label>
                <textarea
                  disabled={periodLocked}
                  value={oklad.comment}
                  onChange={(e) => setOklad({ ...oklad, comment: e.target.value })}
                />
              </div>
            </div>

            <div className="pd-row">
              <div className="pd-field">
                <label>
                  {t("payrollDistribution.fields.jamiOylikNaqdsiz")}
                  <span className="req">*</span>
                </label>
                <input
                  className={invalid(
                    oklad.jami_oylik_naqdsiz === "",
                    okladLimitErrors.jami_oylik_naqdsiz,
                  )}
                  inputMode="numeric"
                  placeholder="0"
                  disabled={periodLocked}
                  value={fmt(oklad.jami_oylik_naqdsiz)}
                  onChange={(e) => setOklad({ ...oklad, jami_oylik_naqdsiz: parseNum(e.target.value) })}
                />
                {errorText(okladLimitErrors.jami_oylik_naqdsiz)}
              </div>
              <div className="pd-field">
                <label>
                  {t("payrollDistribution.fields.jamiOylikNaqd")}
                  <span className="req">*</span>
                </label>
                <input className="pd-auto" value={fmt(jamiOylikNaqdAuto)} readOnly tabIndex={-1} />
              </div>
            </div>

            <div className="pd-row">
              <div className="pd-field">
                <label>
                  {t("payrollDistribution.fields.avansNaqdsiz")}
                  <span className="req">*</span>
                </label>
                <input
                  className={invalid(oklad.avans_naqdsiz === "", okladLimitErrors.avans_naqdsiz)}
                  inputMode="numeric"
                  placeholder="0"
                  disabled={periodLocked}
                  value={fmt(oklad.avans_naqdsiz)}
                  onChange={(e) => setOklad({ ...oklad, avans_naqdsiz: parseNum(e.target.value) })}
                />
                {errorText(okladLimitErrors.avans_naqdsiz)}
              </div>
              <div className="pd-field">
                <label>
                  {t("payrollDistribution.fields.avansNaqd")}
                  <span className="req">*</span>
                </label>
                <input
                  className={invalid(oklad.avans_naqd === "", okladLimitErrors.avans_naqd)}
                  inputMode="numeric"
                  placeholder="0"
                  disabled={periodLocked}
                  value={fmt(oklad.avans_naqd)}
                  onChange={(e) => setOklad({ ...oklad, avans_naqd: parseNum(e.target.value) })}
                />
                {errorText(okladLimitErrors.avans_naqd)}
              </div>
            </div>

            <div className="pd-row">
              <div className="pd-field">
                <label>
                  {t("payrollDistribution.fields.oylikNaqdsizAuto")}
                  <span className="req">*</span>
                </label>
                <input className="pd-auto" value={fmt(oylikNaqdsizAuto)} readOnly tabIndex={-1} />
              </div>
              <div className="pd-field">
                <label>{t("payrollDistribution.fields.oylikNaqd")}</label>
                <input className="pd-auto" value={fmt(oylikNaqdAuto)} readOnly tabIndex={-1} />
              </div>
            </div>

            <div className="pd-row">
              <div className="pd-field">
                <label>{t("payrollDistribution.fields.privilegedPart")}</label>
                <input
                  className={invalid(false, okladLimitErrors.imtiyozli)}
                  inputMode="numeric"
                  placeholder="0"
                  disabled={periodLocked}
                  value={fmt(oklad.imtiyozli)}
                  onChange={(e) => setOklad({ ...oklad, imtiyozli: parseNum(e.target.value) })}
                />
                {errorText(okladLimitErrors.imtiyozli)}
              </div>
              <div className="pd-field">
                <label>
                  {t("payrollDistribution.fields.taxPayer")}
                  <span className="req">*</span>
                </label>
                <select
                  className={invalid(oklad.tax_payer === "")}
                  disabled={periodLocked}
                  value={oklad.tax_payer}
                  onChange={(e) => setOklad({ ...oklad, tax_payer: e.target.value })}
                >
                  <option value="">{t("payrollDistribution.choose")}</option>
                  {taxPayerOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pd-row">
              <div className="pd-field">
                <label>
                  {t("payrollDistribution.fields.cashTax")}
                  <span className="req">*</span>
                </label>
                <select
                  className={invalid(oklad.cash_tax === "")}
                  disabled={periodLocked}
                  value={oklad.cash_tax}
                  onChange={(e) => setOklad({ ...oklad, cash_tax: e.target.value })}
                >
                  <option value="">{t("payrollDistribution.choose")}</option>
                  {yesNoOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pd-field" />
            </div>

            <div className="pd-actions">
                <Protected permission="payroll_distributions.create">
                  <button
                    className="pd-btn pd-btn-save"
                    onClick={handleSave}
                    disabled={saveMutation.isPending || periodLocked}
                  >
                    {t("payrollDistribution.save")}
                  </button>
                </Protected>
              <button className="pd-btn pd-btn-cancel" onClick={() => navigate(-1)}>
                {t("payrollDistribution.back")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollDistribution;
