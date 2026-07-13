import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "./studentsContracts.css";
import {
  emptyMinorStudent,
  emptyRepresentative,
} from "@/types/studentContract.types";
import type {
  MinorStudentFormData,
  RepresentativeFormData,
} from "@/types/studentContract.types";
import type { Lid } from "@/types/lid.types";
import type { Group } from "@/types/group.types";
import { notifications } from "@mantine/notifications";
import { API } from "@/api/api";
import { useOptions, optionLabel, type Option } from "@/api/options";
import useRequiredFields from "@/hooks/useRequiredFields";
import DateInput from '@/components/DateInput';

// Minimal shape of a /users record used for representative auto-fill
interface UserMatch {
  id: number;
  full_name: string | null;
  pinfl: string | null;
  phone: string | null;
}

// Helper: convert ISO date string to YYYY-MM-DD for date inputs
const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // ISO format: extract date part
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const MinorStudentCard = ({
  student,
  index,
  onChange,
  onRemove,
  showRemove,
  allLids,
  allGroups,
  allCourses,
}: {
  student: MinorStudentFormData;
  index: number;
  onChange: (
    index: number,
    field: keyof MinorStudentFormData,
    value: string,
  ) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
  allLids: Lid[];
  allGroups: Group[];
  allCourses: Option[];
}) => {
  const { t, i18n } = useTranslation();
  const [lidSearchTerm, setLidSearchTerm] = useState(student.lid_id || "");
  const [showLidDropdown, setShowLidDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    if (!lidSearchTerm) return [];
    const term = lidSearchTerm.toLowerCase();
    return (allLids || [])
      .filter((lid: Lid) => {
        const fullName =
          `${lid.first_name || ""} ${lid.last_name || ""}`.toLowerCase();
        const idStr = String(lid.id);
        return idStr === term || fullName.includes(term);
      })
      .slice(0, 10);
  }, [allLids, lidSearchTerm]);

  const handleLidSelect = (lid: Lid) => {
    const addressStr = [
      lid.region?.name_uz || lid.region?.name_uz,
      lid.district?.name_uz || lid.district?.name_uz,
    ]
      .filter(Boolean)
      .join(", ");

    onChange(index, "lid_id", String(lid.id));
    onChange(index, "first_name", lid.first_name || student.first_name);
    onChange(index, "last_name", lid.last_name || student.last_name);
    onChange(index, "father_name", lid.father_name || student.father_name);
    onChange(index, "birth_date", lid.birth_date || student.birth_date);
    onChange(
      index,
      "phone",
      lid.phone ? lid.phone.replace("+", "") : student.phone,
    );
    onChange(
      index,
      "course_id",
      lid.course_id ? String(lid.course_id) : student.course_id,
    );
    onChange(
      index,
      "group_id",
      lid.group_id ? String(lid.group_id) : student.group_id,
    );
    onChange(
      index,
      "level_id",
      lid.level_id ? String(lid.level_id) : student.level_id,
    );
    onChange(
      index,
      "residential_address",
      addressStr || student.residential_address,
    );
    onChange(
      index,
      "monthly_price",
      lid.course_price?.new_price
        ? String(lid.course_price.new_price)
        : student.monthly_price || "",
    );

    setLidSearchTerm(String(lid.id));
    setShowLidDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowLidDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className="sc-student-card"
      style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "12px",
        marginBottom: "20px",
        position: "relative",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ flex: 1, display: "flex", gap: "20px" }}>
          <div
            className="sc-form-col"
            style={{ position: "relative", flex: 1 }}
            ref={dropdownRef}
          >
            <label className="sc-form-label">
              {t('studentsContract.form.lidId')} <span>*</span>
            </label>
            <input
              type="text"
              className="sc-form-input"
              style={{
                borderColor: "#003366",
                borderRadius: "10px",
                padding: "12px 16px",
              }}
              placeholder={t('studentsContract.form.lidSearchPlaceholder')}
              value={lidSearchTerm || student.lid_id}
              onChange={(e) => {
                setLidSearchTerm(e.target.value);
                onChange(index, "lid_id", e.target.value);
                setShowLidDropdown(true);
              }}
              onFocus={() => setShowLidDropdown(true)}
            />
            {showLidDropdown && lidSearchTerm.length > 0 && (
              <div
                className="sc-lid-dropdown"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  marginTop: "4px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                {searchResults.length > 0 ? (
                  <>
                    <div
                      className="sc-lid-dropdown-header"
                      style={{
                        display: "flex",
                        background: "#f8fafc",
                        padding: "8px 12px",
                        borderBottom: "1px solid #e2e8f0",
                        fontSize: "12px",
                        color: "#64748b",
                        fontWeight: "500",
                      }}
                    >
                      <div style={{ width: "60px" }}>{t('studentsContract.form.dropdownId')}</div>
                      <div style={{ flex: 2 }}>{t('studentsContract.form.dropdownName')}</div>
                      <div style={{ flex: 2 }}>{t('studentsContract.form.dropdownPhone')}</div>
                    </div>
                    {searchResults.map((lid: Lid) => (
                      <div
                        key={lid.id}
                        className="sc-lid-dropdown-item"
                        style={{
                          display: "flex",
                          padding: "10px 12px",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          fontSize: "14px",
                          transition: "background 0.2s",
                        }}
                        onClick={() => handleLidSelect(lid)}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f1f5f9")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <div style={{ width: "60px" }}>{lid.id}</div>
                        <div style={{ flex: 2 }}>
                          {lid.first_name} {lid.last_name}
                        </div>
                        <div style={{ flex: 2 }}>{lid.phone}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    {t('studentsContract.form.notFound')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {showRemove && (
          <button
            className="sc-remove-student-btn"
            style={{
              background: "#ffefef",
              color: "#ff4d4f",
              border: "none",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              marginLeft: "20px",
            }}
            onClick={() => onRemove(index)}
          >
            {t('studentsContract.minor.removeStudent')}
          </button>
        )}
      </div>

      <div className="sc-form-row">
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.language')} <span>*</span>
          </label>
          <select
            className="sc-form-select"
            value={student.language}
            onChange={(e) => onChange(index, "language", e.target.value)}
          >
            <option value="uz">UZ</option>
            <option value="ru">RU</option>
            <option value="en">EN</option>
          </select>
        </div>
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.citizenship')} <span>*</span>
          </label>
          <select
            className="sc-form-select"
            value={student.citizenship}
            onChange={(e) => onChange(index, "citizenship", e.target.value)}
          >
            <option value="citizen">{t('studentsContract.form.citizenUz')}</option>
            <option value="foreign">{t('studentsContract.form.citizenForeign')}</option>
          </select>
        </div>
      </div>

      <div className="sc-form-row">
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.passport')} <span>*</span>
          </label>
          <div
            className="sc-passport-group"
            style={{ display: "flex", gap: "8px" }}
          >
            <input
              type="text"
              className="sc-passport-series"
              style={{
                width: "80px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                textTransform: "uppercase",
              }}
              placeholder="A-AA"
              maxLength={4}
              value={student.birth_cert_series}
              onChange={(e) =>
                onChange(
                  index,
                  "birth_cert_series",
                  e.target.value.toUpperCase(),
                )
              }
            />
            <input
              type="text"
              className="sc-passport-number"
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
              placeholder="Raqam"
              maxLength={7}
              value={student.birth_cert_number}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 7) onChange(index, "birth_cert_number", val);
              }}
            />
          </div>
        </div>
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.passportGivenDate')} <span>*</span>
          </label>
          <DateInput
            className="sc-form-input"
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
            value={student.birth_cert_given_date}
            onChange={(e) =>
              onChange(index, "birth_cert_given_date", e.target.value)
            }
          />
        </div>
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.birthPlace')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
            placeholder="Kiriting"
            value={student.birth_place}
            onChange={(e) => onChange(index, "birth_place", e.target.value)}
          />
        </div>
      </div>

      <div className="sc-form-row">
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.lastName')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            placeholder="Kiriting"
            value={student.last_name}
            onChange={(e) => onChange(index, "last_name", e.target.value)}
          />
        </div>
      </div>

      <div className="sc-form-row">
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.firstName')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            placeholder="Kiriting"
            value={student.first_name}
            onChange={(e) => onChange(index, "first_name", e.target.value)}
          />
        </div>
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.fatherName')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            placeholder="Kiriting"
            value={student.father_name}
            onChange={(e) => onChange(index, "father_name", e.target.value)}
          />
        </div>
      </div>

      <div className="sc-form-row">
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.birthDate')} <span>*</span>
          </label>
          <DateInput
            className="sc-form-input"
            value={student.birth_date}
            onChange={(e) => onChange(index, "birth_date", e.target.value)}
          />
        </div>
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.group')} <span>*</span>
          </label>
          <select
            className="sc-form-select"
            value={student.group_id}
            onChange={(e) => onChange(index, "group_id", e.target.value)}
          >
            <option value="">{t('studentsContract.form.select')}</option>
            {(allGroups || []).map((g: Group) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.course')} <span>*</span>
          </label>
          <select
            className="sc-form-select"
            value={student.course_id}
            onChange={(e) => {
              onChange(index, "course_id", e.target.value);
              onChange(index, "level_id", ""); // Reset level when course changes
            }}
          >
            <option value="">{t('studentsContract.form.select')}</option>
            {(allCourses || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.level')} <span>*</span>
          </label>
          <select
            className="sc-form-select"
            value={student.level_id}
            onChange={(e) => onChange(index, "level_id", e.target.value)}
          >
            <option value="">{t('studentsContract.form.select')}</option>
            {(
              (allCourses || []).find((c) => String(c.id) === student.course_id)?.levels || []
            ).map((l) => (
              <option key={l.id} value={l.id}>
                {optionLabel(l, i18n.language)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="sc-form-row">
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.monthlyPrice')} <span>*</span>
          </label>
          <input
            type="number"
            className="sc-form-input"
            placeholder="500000"
            value={student.monthly_price}
            onChange={(e) => onChange(index, "monthly_price", e.target.value)}
          />
        </div>
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.totalPrice')} <span>*</span>
          </label>
          <input
            type="number"
            className="sc-form-input"
            placeholder="3000000"
            value={student.total_price}
            onChange={(e) => onChange(index, "total_price", e.target.value)}
          />
        </div>
      </div>

      <div className="sc-form-row">
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.courseStartDate')} <span>*</span>
          </label>
          <DateInput
            className="sc-form-input"
            value={student.course_start_date}
            onChange={(e) =>
              onChange(index, "course_start_date", e.target.value)
            }
          />
        </div>
        <div className="sc-form-col">
          <label className="sc-form-label">
            {t('studentsContract.form.courseEndDate')} <span>*</span>
          </label>
          <DateInput
            className="sc-form-input"
            value={student.course_end_date}
            onChange={(e) => onChange(index, "course_end_date", e.target.value)}
          />
        </div>
      </div>

      <div className="sc-form-row">
        <div className="sc-form-col" style={{ flex: "0 0 50%" }}>
          <label className="sc-form-label">
            {t('studentsContract.form.phone')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            placeholder="+998"
            value={student.phone}
            onChange={(e) => onChange(index, "phone", e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.residentialAddress')} <span>*</span>
          </label>
          <textarea
            className="sc-form-textarea"
            style={{
              minHeight: "80px",
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "14px",
            }}
            placeholder="Kiriting"
            value={student.residential_address}
            onChange={(e) =>
              onChange(index, "residential_address", e.target.value)
            }
          />
        </div>
      </div>
    </div>
  );
};

const UnderAge = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { t } = useTranslation();
  const { formRef, validate, arm } = useRequiredFields();
  const [step, setStep] = useState(1);
  const [representative, setRepresentative] = useState<RepresentativeFormData>({
    ...emptyRepresentative,
    phones: ["+998"],
  });
  const [students, setStudents] = useState<MinorStudentFormData[]>([
    { ...emptyMinorStudent, phone: "+998" },
  ]);

  const { data: contractToEdit, isLoading: isFetchingContract } = useQuery({
    queryKey: ["student-contract", id],
    queryFn: () => API.get(`/student-contracts/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (contractToEdit && id) {
      const contract =
        contractToEdit.contract || contractToEdit.data || contractToEdit;
      if (contract.representative) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRepresentative({
          representative_type:
            contract.representative.representative_type || "Ota",
          first_name: contract.representative.first_name || "",
          last_name: contract.representative.last_name || "",
          father_name: contract.representative.father_name || "",
          jshshir: contract.representative.jshshir || "",
          citizenship: contract.representative.citizenship || "citizen",
          phones: [contract.representative.phone || "+998"],
          passport_series: contract.representative.passport_series || "",
          passport_number: contract.representative.passport_number || "",
          birth_date: formatDateForInput(contract.representative.birth_date),
          passport_given_date: formatDateForInput(
            contract.representative.passport_given_date,
          ),
          passport_expiry_date: formatDateForInput(
            contract.representative.passport_expiry_date,
          ),
          registered_address: contract.representative.registered_address || "",
          residential_address:
            contract.representative.residential_address || "",
          language: contract.language || "uz",
          passport_given_by: contract.representative.passport_given_by || "",
        });
      }

      if (contract.contract_students && contract.contract_students.length > 0) {
        setStudents(
          contract.contract_students.map((s: Record<string, unknown>) => ({
            lid_id: String(s.lid_id),
            first_name: s.first_name || "",
            last_name: s.last_name || "",
            father_name: s.father_name || "",
            birth_date: formatDateForInput(s.birth_date as string | null | undefined),
            birth_cert_series: s.birth_cert_series || "",
            birth_cert_number: s.birth_cert_number || "",
            birth_cert_given_date: formatDateForInput(s.birth_cert_given_date as string | null | undefined),
            birth_cert_expiry_date: formatDateForInput(
              s.birth_cert_expiry_date as string | null | undefined,
            ),
            birth_place: s.birth_place || "",
            phone: s.phone ? (s.phone as string).replace("+", "") : "998",
            course_id: String(s.course_id || ""),
            level_id: String(s.level_id || ""),
            group_id: String(s.group_id || ""),
            residential_address: s.residential_address || "",
            jshshir: s.jshshir || "",
            language: contract.language || "uz",
            citizenship: s.citizenship || "citizen",
          })) as MinorStudentFormData[],
        );
      }
    }
  }, [contractToEdit, id]);

  const { data: allLids } = useQuery({
    queryKey: ["lids-all"],
    queryFn: () =>
      API.get("/lids", { params: { per_page: 1000 } }).then((res) =>
        Array.isArray(res.data) ? res.data : res.data?.data || [],
      ),
  });

  // Guruh tanlanganda shartnoma sanalari `start_date` / `end_date` dan olinadi —
  // /options/groups bularni bermaydi.
  const { data: allGroups } = useQuery({
    queryKey: ["groups-all"],
    queryFn: () =>
      API.get("/groups", { params: { per_page: 1000 } }).then((res) =>
        Array.isArray(res.data) ? res.data : res.data?.data || [],
      ),
  });

  const { data: allCourses } = useOptions("courses");

  // JSHSHIR (pinfl) bo'yicha foydalanuvchi avtomatik topiladi — /options/users `pinfl` ni bermaydi.
  const { data: allUsers } = useQuery<UserMatch[]>({
    queryKey: ["users-all"],
    queryFn: () =>
      API.get("/users", { params: { per_page: 1000 } }).then((res) =>
        Array.isArray(res.data) ? res.data : res.data?.data || [],
      ),
  });

  const handleRepChange = (
    field: keyof RepresentativeFormData,
    value: string,
  ) => {
    let finalValue = value;
    if (field === "passport_series") finalValue = value.toUpperCase();
    if (field === "passport_number" || field === "jshshir") {
      finalValue = value.replace(/\D/g, "");
      if (field === "passport_number" && finalValue.length > 7) return;
      if (field === "jshshir" && finalValue.length > 14) return;
    }

    // Auto-fill representative info when a 14-digit JSHSHR matches a /users PINFL
    if (field === "jshshir" && finalValue.length === 14 && allUsers) {
      const matchedUser = allUsers.find((u) => u.pinfl === finalValue);
      if (matchedUser) {
        const nameParts = (matchedUser.full_name || "").trim().split(/\s+/);
        setRepresentative((prev) => ({
          ...prev,
          jshshir: finalValue,
          last_name: nameParts[0] || prev.last_name,
          first_name: nameParts[1] || prev.first_name,
          father_name: nameParts[2] || prev.father_name,
          phones: matchedUser.phone ? [matchedUser.phone] : prev.phones,
        }));
        return;
      }
    }

    setRepresentative((prev) => ({ ...prev, [field]: finalValue }));
  };

  const handleRepPhoneChange = (pIdx: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    let finalValue = "";
    if (!digits.startsWith("998")) finalValue = "+998" + digits;
    else finalValue = "+" + digits;

    if (finalValue.length > 13) return;

    setRepresentative((prev) => {
      const newPhones = [...prev.phones];
      newPhones[pIdx] = finalValue;
      return { ...prev, phones: newPhones };
    });
  };

  const addRepPhone = () => {
    setRepresentative((prev) => ({
      ...prev,
      phones: [...prev.phones, "+998"],
    }));
  };

  const removeRepPhone = (pIdx: number) => {
    setRepresentative((prev) => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== pIdx),
    }));
  };

  const handleStudentChange = (
    index: number,
    field: keyof MinorStudentFormData,
    value: string,
  ) => {
    let finalValue = value;
    if (field === "phone") {
      const digits = value.replace(/\D/g, "");
      if (!digits.startsWith("998")) {
        finalValue = "+998" + digits;
      } else {
        finalValue = "+" + digits;
      }
      if (finalValue.length < 4) finalValue = "+998";
      if (finalValue.length > 13) return;
    }
    setStudents((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const updated = { ...s, [field]: finalValue };

        // Auto-fill dates when group is selected
        if (field === "group_id" && value && allGroups) {
          const group = allGroups.find((g: Group) => String(g.id) === value);
          if (group) {
            updated.course_start_date = formatDateForInput(group.start_date);
            updated.course_end_date = formatDateForInput(group.end_date);
          }
        }

        // Auto-calculate total price
        if (
          (field === "monthly_price" ||
            field === "group_id" ||
            field === "course_start_date" ||
            field === "course_end_date") &&
          updated.monthly_price &&
          updated.course_start_date &&
          updated.course_end_date
        ) {
          const start = new Date(updated.course_start_date);
          const end = new Date(updated.course_end_date);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const months =
              (end.getFullYear() - start.getFullYear()) * 12 +
              (end.getMonth() - start.getMonth());
            updated.total_price = String(
              Number(updated.monthly_price) * Math.max(months, 1),
            );
          }
        }

        return updated;
      }),
    );
  };

  const addStudent = () => {
    setStudents((prev) => [...prev, { ...emptyMinorStudent, phone: "+998" }]);
  };

  const removeStudent = (index: number) => {
    if (students.length > 1) {
      setStudents((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const isStep1Valid = () => {
    const r = representative;
    return Boolean(
      r.first_name &&
        r.last_name &&
        r.father_name &&
        r.jshshir &&
        r.phones.every((p) => p.length > 4) &&
        r.passport_series &&
        r.passport_number &&
        r.birth_date &&
        r.passport_given_date &&
        r.passport_expiry_date &&
        r.registered_address &&
        r.residential_address,
    );
  };

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      API.post("/student-contracts", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-contracts"] });
      navigate("/students-contract");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      API.put(`/student-contracts/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-contracts"] });
      navigate("/students-contract");
    },
  });

  const goToStep2 = () => {
    if (!validate()) {
      notifications.show({
        title: t('studentsContract.minor.errorTitle'),
        message: t('studentsContract.minor.errorRepMsg'),
        color: "red",
      });
      return;
    }
    setStep(2);
  };

  const handleSubmit = () => {
    // 1-bosqich DOM'da yo'q, shuning uchun avval holat bo'yicha tekshiriladi;
    // qaytganda `arm()` o'sha yerdagi bo'sh maydonlarni qizil qiladi.
    if (!isStep1Valid()) {
      arm();
      setStep(1);
      notifications.show({
        title: t('studentsContract.minor.errorTitle'),
        message: t('studentsContract.minor.errorRepMsg'),
        color: "red",
      });
      return;
    }
    if (!validate()) return;

    const payload = {
      contract_type: "minor",
      language: representative.language,
      branch_id: 1,
      representative: {
        representative_type: representative.representative_type,
        first_name: representative.first_name,
        last_name: representative.last_name,
        father_name: representative.father_name,
        jshshir: representative.jshshir,
        citizenship: representative.citizenship,
        phone: representative.phones[0],
        passport_series: representative.passport_series,
        passport_number: representative.passport_number,
        birth_date: representative.birth_date,
        passport_given_date: representative.passport_given_date,
        passport_expiry_date: representative.passport_expiry_date,
        registered_address: representative.registered_address,
        residential_address: representative.residential_address,
      },
      students: students.map((s, idx) => {
        const studentPayload: Record<string, unknown> = {
          lid_id: Number(s.lid_id),
          is_minor: true,
          jshshir: s.jshshir,
          first_name: s.first_name,
          last_name: s.last_name,
          father_name: s.father_name,
          birth_date: s.birth_date,
          birth_cert_series: s.birth_cert_series,
          birth_cert_number: s.birth_cert_number,
          birth_cert_given_date: s.birth_cert_given_date,
          birth_cert_expiry_date: s.birth_cert_expiry_date,
          birth_place: s.birth_place,
          phone: s.phone,
          course_id: Number(s.course_id),
          level_id: Number(s.level_id),
          group_id: Number(s.group_id),
          residential_address: s.residential_address,
          monthly_price: Number(s.monthly_price) || 0,
          total_price: Number(s.total_price) || 0,
          course_start_date: s.course_start_date,
          course_end_date: s.course_end_date,
        };
        // Include student id for update
        if (id && contractToEdit) {
          const contract =
            contractToEdit.contract || contractToEdit.data || contractToEdit;
          const existingStudent = contract.contract_students?.[idx];
          if (existingStudent?.id) studentPayload.id = existingStudent.id;
        }
        return studentPayload;
      }),
    };

    if (id) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (id && isFetchingContract) {
    return (
      <div
        className="students-contract container"
        style={{ marginTop: 50, marginLeft: 140 }}
      >
        <div style={{ textAlign: "center", padding: 40 }}>{t('studentsContract.details.loading')}</div>
      </div>
    );
  }

  return (
    <div
      className="students-contract container"
      style={{ marginTop: 50, marginLeft: 140 }}
      ref={formRef}
    >
      <div
        className="sc-page-top"
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          className="sc-page-top-icon"
          style={{
            background: "#FFEFDB",
            color: "#FE9100",
            padding: "10px 24px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
          }}
        >
          <i className="fa-solid fa-user"></i>
        </div>
        <span
          className="sc-page-top-title"
          style={{
            textTransform: "uppercase",
            fontFamily: "noto-sb",
            fontSize: "16px",
            color: "#000",
          }}
        >
          {t('studentsContract.minor.title')}
        </span>
      </div>

      <div
        className="sc-step-bar"
        style={{
          display: "flex",
          background: "#003366",
          borderRadius: "40px",
          margin: "16px 0",
          padding: "0",
          overflow: "hidden",
        }}
      >
        <div
          className={`sc-step-item ${step === 1 ? "active" : ""}`}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "14px",
            cursor: "pointer",
            background: "#003366",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "14px",
            textTransform: "uppercase",
            borderRight: "1px solid rgba(255,255,255,0.1)",
          }}
          onClick={() => setStep(1)}
        >
          {t('studentsContract.minor.step1')}
        </div>
        <div
          className={`sc-step-item ${step === 2 ? "active" : ""}`}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "14px",
            cursor: "pointer",
            background: step === 2 ? "#003366" : "#5d7ca4",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "14px",
            textTransform: "uppercase",
          }}
          onClick={goToStep2}
        >
          {t('studentsContract.minor.step2')}
        </div>
      </div>

      {step === 1 && (
        <>
          <div
            className="sc-form-card"
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              marginBottom: "20px",
            }}
          >
            <div className="sc-form-row">
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.form.jshshir')} <span>*</span>
                </label>
                <input
                  type="text"
                  className="sc-form-input"
                  placeholder="00000000000000"
                  maxLength={14}
                  value={representative.jshshir}
                  onChange={(e) => handleRepChange("jshshir", e.target.value)}
                />
              </div>
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.form.citizenship')} <span>*</span>
                </label>
                <select
                  className="sc-form-select"
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                  }}
                  value={representative.citizenship}
                  onChange={(e) =>
                    handleRepChange("citizenship", e.target.value)
                  }
                >
                  <option value="citizen">{t('studentsContract.form.citizenUz')}</option>
                  <option value="foreign">{t('studentsContract.form.citizenForeign')}</option>
                </select>
              </div>
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.minor.representative')} <span>*</span>
                </label>
                <select
                  className="sc-form-select"
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                  }}
                  value={representative.representative_type}
                  onChange={(e) =>
                    handleRepChange("representative_type", e.target.value)
                  }
                >
                  <option value="Ota">{t('studentsContract.minor.repTypeFather')}</option>
                  <option value="Ona">{t('studentsContract.minor.repTypeMother')}</option>
                  <option value="Vasiy">{t('studentsContract.minor.repTypeGuardian')}</option>
                  <option value="Boshqa">{t('studentsContract.minor.repTypeOther')}</option>
                </select>
              </div>
            </div>

            <div className="sc-form-row">
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.form.language')} <span>*</span>
                </label>
                <select
                  className="sc-form-select"
                  value={representative.language}
                  onChange={(e) => handleRepChange("language", e.target.value)}
                >
                  <option value="uz">UZ</option>
                  <option value="ru">RU</option>
                  <option value="en">EN</option>
                </select>
              </div>
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.form.birthDate')} <span>*</span>
                </label>
                <DateInput
                  className="sc-form-input"
                  value={representative.birth_date}
                  onChange={(e) =>
                    handleRepChange("birth_date", e.target.value)
                  }
                />
              </div>
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.form.passport')} <span>*</span>
                </label>
                <div
                  className="sc-passport-group"
                  style={{ display: "flex", gap: "8px" }}
                >
                  <input
                    type="text"
                    className="sc-passport-series"
                    style={{
                      width: "80px",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      textTransform: "uppercase",
                    }}
                    placeholder="AA"
                    maxLength={2}
                    value={representative.passport_series}
                    onChange={(e) =>
                      handleRepChange("passport_series", e.target.value)
                    }
                  />
                  <input
                    type="text"
                    className="sc-passport-number"
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                    placeholder="1234567"
                    maxLength={7}
                    value={representative.passport_number}
                    onChange={(e) =>
                      handleRepChange("passport_number", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="sc-form-row">
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.form.passportGivenDate')} <span>*</span>
                </label>
                <DateInput
                  className="sc-form-input"
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                  value={representative.passport_given_date}
                  onChange={(e) =>
                    handleRepChange("passport_given_date", e.target.value)
                  }
                />
              </div>
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.minor.passportExpiry')} <span>*</span>
                </label>
                <DateInput
                  className="sc-form-input"
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                  value={representative.passport_expiry_date}
                  onChange={(e) =>
                    handleRepChange("passport_expiry_date", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="sc-form-row">
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.form.lastName')} <span>*</span>
                </label>
                <input
                  type="text"
                  className="sc-form-input"
                  placeholder="Kiriting"
                  value={representative.last_name}
                  onChange={(e) => handleRepChange("last_name", e.target.value)}
                />
              </div>
            </div>

            <div className="sc-form-row">
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.form.firstName')} <span>*</span>
                </label>
                <input
                  type="text"
                  className="sc-form-input"
                  placeholder="Kiriting"
                  value={representative.first_name}
                  onChange={(e) =>
                    handleRepChange("first_name", e.target.value)
                  }
                />
              </div>
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.form.fatherName')} <span>*</span>
                </label>
                <input
                  type="text"
                  className="sc-form-input"
                  placeholder="Kiriting"
                  value={representative.father_name}
                  onChange={(e) =>
                    handleRepChange("father_name", e.target.value)
                  }
                />
              </div>
            </div>

            {representative.phones.map((phone, pIdx) => (
              <div
                key={pIdx}
                className="sc-form-row"
                style={{
                  display: "flex",
                  gap: "18px",
                  marginTop: pIdx > 0 ? "18px" : "0",
                }}
              >
                <div className="sc-form-col" style={{ flex: "0 0 32%" }}>
                  <label className="sc-form-label">
                    {t('studentsContract.minor.phoneLabel', { num: pIdx + 1 })} <span>*</span>
                  </label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <input
                      type="text"
                      className="sc-form-input"
                      placeholder="+998"
                      value={phone}
                      onChange={(e) =>
                        handleRepPhoneChange(pIdx, e.target.value)
                      }
                    />
                    {pIdx === representative.phones.length - 1 ? (
                      <div
                        onClick={addRepPhone}
                        style={{
                          background: "#003366",
                          color: "#fff",
                          height: "42px",
                          width: "42px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "10px",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <i className="fa-solid fa-plus"></i>
                      </div>
                    ) : (
                      <div
                        onClick={() => removeRepPhone(pIdx)}
                        style={{
                          background: "#fee2e2",
                          color: "#ef4444",
                          height: "42px",
                          width: "42px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "10px",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="sc-form-row">
              <div className="sc-form-col">
                <label className="sc-form-label">
                  {t('studentsContract.minor.registeredAddress')} <span>*</span>
                </label>
                <input
                  type="text"
                  className="sc-form-input"
                  placeholder="Kiriting"
                  value={representative.registered_address}
                  onChange={(e) =>
                    handleRepChange("registered_address", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="sc-form-row">
              <div className="sc-form-col" style={{ flex: 1 }}>
                <label className="sc-form-label">
                  {t('studentsContract.minor.realAddress')} <span>*</span>
                </label>
                <textarea
                  className="sc-form-textarea"
                  style={{
                    minHeight: "100px",
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    padding: "12px",
                  }}
                  placeholder="Kiriting"
                  value={representative.residential_address}
                  onChange={(e) =>
                    handleRepChange("residential_address", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div
            className="sc-form-actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "20px",
            }}
          >
            <button
              className="sc-form-cancel-btn"
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#64748b",
                cursor: "pointer",
                fontWeight: "500",
              }}
              onClick={() => navigate("/students-contract")}
            >
              {t('studentsContract.form.cancel')}
            </button>
            <button
              className="sc-form-next-btn"
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background: "#FE9100",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "500",
              }}
              onClick={goToStep2}
            >
              {t('studentsContract.minor.next')}
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          {students.map((student, index) => (
            <MinorStudentCard
              key={index}
              student={student}
              index={index}
              onChange={handleStudentChange}
              onRemove={removeStudent}
              showRemove={students.length > 1}
              allLids={allLids || []}
              allGroups={allGroups || []}
              allCourses={allCourses || []}
            />
          ))}

          <button
            className="sc-add-student-btn"
            style={{
              width: "100%",
              padding: "12px",
              border: "1px dashed #FE9100",
              borderRadius: "8px",
              background: "#fff",
              color: "#FE9100",
              cursor: "pointer",
              fontWeight: "500",
              marginBottom: "20px",
            }}
            onClick={addStudent}
          >
            {t('studentsContract.minor.addStudent')}
          </button>

          <div
            className="sc-form-actions"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "20px",
            }}
          >
            <button
              className="sc-form-cancel-btn"
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#64748b",
                cursor: "pointer",
                fontWeight: "500",
              }}
              onClick={() => navigate("/students-contract")}
            >
              {t('studentsContract.form.cancel')}
            </button>
            <button
              className="sc-form-prev-btn"
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "1px solid #FE9100",
                background: "#fff",
                color: "#FE9100",
                cursor: "pointer",
                fontWeight: "500",
              }}
              onClick={() => setStep(1)}
            >
              {t('studentsContract.minor.prev')}
            </button>
            <button
              className="sc-form-save-btn"
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background: "#FE9100",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "500",
              }}
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? t('studentsContract.form.saving')
                : t('studentsContract.form.save')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UnderAge;
