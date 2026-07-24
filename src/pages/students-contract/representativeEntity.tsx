import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import {
  type OrganizationFormData,
  emptyOrganization,
  type OrganizationStudentFormData,
  emptyOrganizationStudent,
  type RepresentativeFormData,
  emptyRepresentative,
} from "@/types/studentContract.types";
import type { Lid } from "@/types/lid.types";
import "./studentsContracts.css";
import { API } from "@/api/api";
import { useOptions, optionLabel, type Option } from "@/api/options";
import useRequiredFields from "@/hooks/useRequiredFields";
import DateInput from '@/components/DateInput';

const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ToggleButton = ({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}) => (
  <div
    style={{
      display: "flex",
      background: "#fff",
      border: "1px solid #cbd5e1",
      borderRadius: "10px",
      padding: "2px",
      width: "fit-content",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}
  >
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        style={{
          padding: "8px 24px",
          borderRadius: "8px",
          border: "none",
          fontSize: "14px",
          fontWeight: "500",
          cursor: "pointer",
          transition: "all 0.2s ease",
          background: value === opt.value ? "#003366" : "transparent",
          color: value === opt.value ? "#fff" : "#64748b",
        }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const OrganizationStudentCard = ({
  student,
  index,
  onChange,
  onRemove,
  showRemove,
  allLids,
  allGroups,
  allCourses,
  onLidSelect,
}: {
  student: OrganizationStudentFormData;
  index: number;
  onChange: (
    index: number,
    field: keyof OrganizationStudentFormData,
    value: string | boolean,
  ) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
  allLids: Lid[];
  allGroups: Option[];
  allCourses: Option[];
  onLidSelect: (lid: Lid) => void;
}) => {
  const { t, i18n } = useTranslation();
  const matchingGroups = useMemo(
    () =>
      allGroups.filter(
        (group) =>
          String(group.course_id) === student.course_id && String(group.level_id) === student.level_id,
      ),
    [allGroups, student.course_id, student.level_id],
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLids = allLids.filter((lid) => {
    const term = searchTerm.toLowerCase();
    return (
      String(lid.id).includes(term) ||
      (lid.first_name || "").toLowerCase().includes(term) ||
      (lid.last_name || "").toLowerCase().includes(term) ||
      (lid.phone || "").includes(term)
    );
  });

  const handleLidSelect = (lid: Lid) => {
    onLidSelect(lid);
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
    const addressStr = [
      lid.region?.name_uz || lid.region?.name_uz,
      lid.district?.name_uz || lid.district?.name_uz,
    ]
      .filter(Boolean)
      .join(", ");

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
      "registered_address",
      addressStr || student.registered_address,
    );
    onChange(
      index,
      "monthly_price",
      lid.course_price?.new_price
        ? String(lid.course_price.new_price)
        : student.monthly_price || "",
    );

    setShowDropdown(false);
    setSearchTerm("");
  };

  return (
    <div
      className="sc-form-card"
      style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "12px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        marginBottom: "20px",
        position: "relative",
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
        <h3 style={{ margin: 0, fontSize: "18px", color: "#003366" }}>
          {t('studentsContract.legal.studentNum', { num: index + 1 })}
        </h3>
        {showRemove && (
          <button
            onClick={() => onRemove(index)}
            style={{
              background: "#fff5f5",
              color: "#e53e3e",
              border: "1px solid #feb2b2",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            <i
              className="fa-solid fa-trash-can"
              style={{ marginRight: "6px" }}
            ></i>{" "}
            {t('studentsContract.legal.remove')}
          </button>
        )}
      </div>

      <div className="sc-form-row">
        <div className="sc-form-col" style={{ flex: 1, marginBottom: "10px" }}>
          <label className="sc-form-label">
            {t('studentsContract.legal.thisPerson')} <span>*</span>
          </label>
          <ToggleButton
            options={[
              { label: t('studentsContract.legal.adultPerson'), value: "false" },
              { label: t('studentsContract.legal.minorPerson'), value: "true" },
            ]}
            value={String(student.is_minor)}
            onChange={(val) => onChange(index, "is_minor", val === "true")}
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
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
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            placeholder={t('studentsContract.form.lidSearchPlaceholder')}
            value={student.lid_id || searchTerm}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => {
              const value = e.target.value;
              setSearchTerm(value);
              setShowDropdown(true);
              if (!value) onChange(index, "lid_id", "");
              const exactLid = allLids.find((lid) => String(lid.id) === value);
              if (exactLid) handleLidSelect(exactLid);
            }}
          />
          {showDropdown && (
            <div
              className="sc-lid-dropdown"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                zIndex: 100,
                maxHeight: "250px",
                overflowY: "auto",
                marginTop: "4px",
              }}
            >
              {filteredLids.length > 0 ? (
                filteredLids.map((lid) => (
                  <div
                    key={lid.id}
                    className="sc-lid-option"
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                    onClick={() => handleLidSelect(lid)}
                  >
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                      ID: {lid.id} - {lid.first_name} {lid.last_name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {lid.phone} | {lid.course?.name_uz || t('studentsContract.legal.noCourse')}
                    </div>
                  </div>
                ))
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
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.jshshir')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            placeholder="00000000000000"
            maxLength={14}
            value={student.jshshir}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length <= 14) onChange(index, "jshshir", val);
            }}
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        {student.is_minor ? (
          <>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.birthCertSeriesNum')} <span>*</span>
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  className="sc-passport-series"
                  style={{
                    width: "80px",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    textTransform: "uppercase",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    background: "#f8faff",
                  }}
                  placeholder="AA"
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
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    background: "#f8faff",
                  }}
                  placeholder="Raqam"
                  maxLength={7}
                  value={student.birth_cert_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 7)
                      onChange(index, "birth_cert_number", val);
                  }}
                />
              </div>
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.form.passportGivenDate')} <span>*</span>
              </label>
              <DateInput
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                value={student.birth_cert_given_date}
                onChange={(e) =>
                  onChange(index, "birth_cert_given_date", e.target.value)
                }
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.form.birthPlace')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                placeholder="Kiriting"
                value={student.birth_place}
                onChange={(e) => onChange(index, "birth_place", e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.passportSeriesNum')} <span>*</span>
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  className="sc-passport-series"
                  style={{
                    width: "80px",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    textTransform: "uppercase",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    background: "#f8faff",
                  }}
                  placeholder="AA"
                  maxLength={2}
                  value={student.passport_series}
                  onChange={(e) =>
                    onChange(
                      index,
                      "passport_series",
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
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    background: "#f8faff",
                  }}
                  placeholder="Raqam"
                  maxLength={7}
                  value={student.passport_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 7)
                      onChange(index, "passport_number", val);
                  }}
                />
              </div>
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.form.passportGivenDate')} <span>*</span>
              </label>
              <DateInput
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                value={student.passport_given_date}
                onChange={(e) =>
                  onChange(index, "passport_given_date", e.target.value)
                }
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.passportExpiry')} <span>*</span>
              </label>
              <DateInput
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                value={student.passport_expiry_date}
                onChange={(e) =>
                  onChange(index, "passport_expiry_date", e.target.value)
                }
              />
            </div>
          </>
        )}
      </div>

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.lastName')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            placeholder="Kiriting"
            value={student.last_name}
            onChange={(e) => onChange(index, "last_name", e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.firstName')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            placeholder="Kiriting"
            value={student.first_name}
            onChange={(e) => onChange(index, "first_name", e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.fatherName')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            placeholder="Kiriting"
            value={student.father_name}
            onChange={(e) => onChange(index, "father_name", e.target.value)}
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.birthDate')} <span>*</span>
          </label>
          <DateInput
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            value={student.birth_date}
            onChange={(e) => onChange(index, "birth_date", e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.course')} <span>*</span>
          </label>
          <select
            className="sc-form-select"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            value={student.course_id}
              onChange={(e) => {
                onChange(index, "course_id", e.target.value);
                onChange(index, "level_id", "");
                onChange(index, "group_id", "");
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
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.level')} <span>*</span>
          </label>
          <select
            className="sc-form-select"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            value={student.level_id}
            onChange={(e) => {
              onChange(index, "level_id", e.target.value);
              onChange(index, "group_id", "");
            }}
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

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
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
        <div className="sc-form-col" style={{ flex: 1 }}>
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
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.group')} <span>*</span>
          </label>
          <select
            className="sc-form-select"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            value={student.group_id}
            disabled={!student.course_id || !student.level_id || matchingGroups.length === 0}
            onChange={(e) => onChange(index, "group_id", e.target.value)}
          >
            <option value="">
              {student.course_id && student.level_id && matchingGroups.length === 0
                ? t('studentsContract.form.noMatchingGroups')
                : t('studentsContract.form.select')}
            </option>
            {matchingGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
              ))}
          </select>
        </div>
      </div>

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
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
        <div className="sc-form-col" style={{ flex: 1 }}>
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

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        <div className="sc-form-col" style={{ flex: "0 0 32%" }}>
          <label className="sc-form-label">
            {t('studentsContract.form.phone')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            value={student.phone}
            onChange={(e) => onChange(index, "phone", e.target.value)}
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.legal.residentialAddress')} <span>*</span>
          </label>
          <textarea
            className="sc-form-textarea"
            style={{
              minHeight: "80px",
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              background: "#f8faff",
            }}
            placeholder="Kiriting"
            value={student.residential_address}
            onChange={(e) =>
              onChange(index, "residential_address", e.target.value)
            }
          />
        </div>
        {!student.is_minor && (
          <div className="sc-form-col" style={{ flex: 1 }}>
            <label className="sc-form-label">
              {t('studentsContract.legal.registeredAddress')} <span>*</span>
            </label>
            <textarea
              className="sc-form-textarea"
              style={{
                minHeight: "80px",
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1.5px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                background: "#f8faff",
              }}
              placeholder="Kiriting"
              value={student.registered_address}
              onChange={(e) =>
                onChange(index, "registered_address", e.target.value)
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

const RepresentativeCard = ({
  representative,
  index,
  onChange,
  onRemove,
  showRemove,
}: {
  representative: RepresentativeFormData;
  index: number;
  onChange: (
    index: number,
    field: keyof RepresentativeFormData,
    value: string | string[],
  ) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="sc-form-card"
      style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "12px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        marginBottom: "20px",
        position: "relative",
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              background: "#FFEFDB",
              color: "#FE9100",
              padding: "8px",
              borderRadius: "8px",
            }}
          >
            <i className="fa-solid fa-user"></i>
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              color: "#1e293b",
              textTransform: "uppercase",
            }}
          >
            {t('studentsContract.rep.repInfo')}
          </h3>
        </div>
        {showRemove && (
          <button
            onClick={() => onRemove(index)}
            style={{
              background: "#fff5f5",
              color: "#e53e3e",
              border: "1px solid #feb2b2",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            <i
              className="fa-solid fa-trash-can"
              style={{ marginRight: "6px" }}
            ></i>{" "}
            {t('studentsContract.legal.remove')}
          </button>
        )}
      </div>

      <div className="sc-form-row">
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.jshshir')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)", maxWidth: "50%" }}
            placeholder="00000000000000"
            maxLength={14}
            value={representative.jshshir}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val.length <= 14) onChange(index, "jshshir", val);
            }}
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.citizenship')} <span>*</span>
          </label>
          <select
            className="sc-form-select"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            value={representative.citizenship}
            onChange={(e) => onChange(index, "citizenship", e.target.value)}
          >
            <option value="citizen">{t('studentsContract.form.citizenUz')}</option>
            <option value="foreign">{t('studentsContract.form.citizenForeign')}</option>
          </select>
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.minor.representative')} <span>*</span>
          </label>
          <select
            className="sc-form-select"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            value={representative.representative_type}
            onChange={(e) =>
              onChange(index, "representative_type", e.target.value)
            }
          >
            <option value="Ota">{t('studentsContract.rep.repTypeFather')}</option>
            <option value="Ona">{t('studentsContract.rep.repTypeMother')}</option>
            <option value="Boshqa">{t('studentsContract.rep.repTypeOther')}</option>
          </select>
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.birthDate')} <span>*</span>
          </label>
          <DateInput
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            value={representative.birth_date}
            onChange={(e) => onChange(index, "birth_date", e.target.value)}
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.legal.passportSeriesNum')} <span>*</span>
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              className="sc-passport-series"
              style={{
                width: "80px",
                padding: "10px",
                borderRadius: "10px",
                border: "1.5px solid #e2e8f0",
                textTransform: "uppercase",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                background: "#f8faff",
              }}
              placeholder="AA"
              maxLength={2}
              value={representative.passport_series}
              onChange={(e) =>
                onChange(index, "passport_series", e.target.value.toUpperCase())
              }
            />
            <input
              type="text"
              className="sc-passport-number"
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "1.5px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                background: "#f8faff",
              }}
              placeholder="1234567"
              maxLength={7}
              value={representative.passport_number}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 7) onChange(index, "passport_number", val);
              }}
            />
          </div>
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.passportGivenDate')} <span>*</span>
          </label>
          <DateInput
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            value={representative.passport_given_date}
            onChange={(e) =>
              onChange(index, "passport_given_date", e.target.value)
            }
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.rep.passportExpiry')} <span>*</span>
          </label>
          <DateInput
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            value={representative.passport_expiry_date}
            onChange={(e) =>
              onChange(index, "passport_expiry_date", e.target.value)
            }
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        <div className="sc-form-col" style={{ flex: "0 0 32%" }}>
          <label className="sc-form-label">
            {t('studentsContract.rep.givenBy')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            placeholder="Kiriting"
            value={representative.passport_given_by}
            onChange={(e) =>
              onChange(index, "passport_given_by", e.target.value)
            }
          />
        </div>
      </div>

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.lastName')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            placeholder="Kiriting"
            value={representative.last_name}
            onChange={(e) => onChange(index, "last_name", e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.firstName')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            placeholder="Kiriting"
            value={representative.first_name}
            onChange={(e) => onChange(index, "first_name", e.target.value)}
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.form.fatherName')} <span>*</span>
          </label>
          <input
            type="text"
            className="sc-form-input"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            placeholder="Kiriting"
            value={representative.father_name}
            onChange={(e) => onChange(index, "father_name", e.target.value)}
          />
        </div>
      </div>

      {representative.phones.map((phone, pIdx) => (
        <div
          key={pIdx}
          className="sc-form-row"
          style={{ display: "flex", gap: "18px" }}
        >
          <div className="sc-form-col" style={{ flex: "0 0 32%" }}>
            <label className="sc-form-label">
              {t('studentsContract.legal.phoneLabel', { num: pIdx + 1 })} <span>*</span>
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  const digits = val.replace(/\D/g, "");
                  let finalValue = "";
                  if (!digits.startsWith("998")) finalValue = "+998" + digits;
                  else finalValue = "+" + digits;
                  if (finalValue.length < 4) finalValue = "+998";
                  if (finalValue.length > 13) return;

                  const newPhones = [...representative.phones];
                  newPhones[pIdx] = finalValue;
                  onChange(index, "phones", newPhones);
                }}
              />
              {pIdx === representative.phones.length - 1 ? (
                <div
                  onClick={() =>
                    onChange(index, "phones", [
                      ...representative.phones,
                      "+998",
                    ])
                  }
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
                  onClick={() => {
                    const newPhones = representative.phones.filter(
                      (_, i) => i !== pIdx,
                    );
                    onChange(index, "phones", newPhones);
                  }}
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

      <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.legal.registeredAddress')} <span>*</span>
          </label>
          <textarea
            className="sc-form-textarea"
            style={{
              minHeight: "80px",
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              background: "#f8faff",
            }}
            placeholder="Kiriting"
            value={representative.registered_address}
            onChange={(e) =>
              onChange(index, "registered_address", e.target.value)
            }
          />
        </div>
        <div className="sc-form-col" style={{ flex: 1 }}>
          <label className="sc-form-label">
            {t('studentsContract.legal.residentialAddress')} <span>*</span>
          </label>
          <textarea
            className="sc-form-textarea"
            style={{
              minHeight: "80px",
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              background: "#f8faff",
            }}
            placeholder="Kiriting"
            value={representative.residential_address}
            onChange={(e) =>
              onChange(index, "residential_address", e.target.value)
            }
          />
        </div>
      </div>
    </div>
  );
};

const RepresentativeEntity = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { formRef, validate, arm } = useRequiredFields();
  const [step, setStep] = useState(1);
  const [organization, setOrganization] = useState<OrganizationFormData>({
    ...emptyOrganization,
  });
  const [students, setStudents] = useState<OrganizationStudentFormData[]>([
    { ...emptyOrganizationStudent },
  ]);
  const [representatives, setRepresentatives] = useState<
    RepresentativeFormData[]
  >([{ ...emptyRepresentative }]);

  const { data: contractToEdit, isLoading: isFetchingContract } = useQuery({
    queryKey: ["student-contract", id],
    queryFn: () => API.get(`/student-contracts/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (contractToEdit && id) {
      const contract =
        contractToEdit.contract || contractToEdit.data || contractToEdit;
      if (contract.organization) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrganization({
          inn: contract.organization.stir || "",
          language: contract.language || "uz",
          branch_id: String(contract.branch_id || ""),
          city: contract.branch?.city || "",
          contract_date: formatDateForInput(contract.contract_date),
          has_trustee: contract.organization.has_trustee || "Ishonchnomasiz",
          trustee_date: formatDateForInput(contract.organization.trustee_date),
          trustee_number: contract.organization.trustee_number || "",
          organization_name: contract.organization.organization_name || "",
          organization_branch:
            contract.organization.organization_branch || "yo'q",
          branch_name: contract.organization.branch_name || "",
          branch_address: contract.organization.branch_address || "",
          director_last_name: contract.organization.director_last_name || "",
          director_first_name: contract.organization.director_first_name || "",
          director_father_name:
            contract.organization.director_father_name || "",
          contract_start_date: formatDateForInput(
            contract.organization.contract_start_date,
          ),
          contract_end_date: formatDateForInput(
            contract.organization.contract_end_date,
          ),
          phones: [contract.organization.phone || "+998"],
          ifut: contract.organization.ifut || "",
          account_number: contract.organization.bank_account || "",
          bank_name: contract.organization.bank_name || "",
          mfo: contract.organization.mfo || "",
        });
      }

      if (contract.representatives && contract.representatives.length > 0) {
        setRepresentatives(
          contract.representatives.map((r: Record<string, unknown>) => ({
            representative_type: r.representative_type || "Ota",
            first_name: r.first_name || "",
            last_name: r.last_name || "",
            father_name: r.father_name || "",
            jshshir: r.jshshir || "",
            citizenship: r.citizenship || "citizen",
            phones: [r.phone || "+998"],
            passport_series: r.passport_series || "",
            passport_number: r.passport_number || "",
            birth_date: formatDateForInput(r.birth_date as string | null | undefined),
            passport_given_date: formatDateForInput(r.passport_given_date as string | null | undefined),
            passport_expiry_date: formatDateForInput(r.passport_expiry_date as string | null | undefined),
            registered_address: r.registered_address || "",
            residential_address: r.residential_address || "",
            language: contract.language || "uz",
            passport_given_by: r.passport_given_by || "",
            monthly_price: r.monthly_price || 0,
            total_price: r.total_price || 0,
          })),
        );
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
            is_minor: !!s.is_minor,
            passport_series: s.passport_series || "",
            passport_number: s.passport_number || "",
            passport_given_date: formatDateForInput(s.passport_given_date as string | null | undefined),
            passport_expiry_date: formatDateForInput(s.passport_expiry_date as string | null | undefined),
            registered_address: s.registered_address || "",
          })) as OrganizationStudentFormData[],
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
  const { data: allGroups } = useOptions("groups");

  const { data: allCourses } = useOptions("courses");

  const { data: branchesData } = useOptions("branches");
  const branches = branchesData ?? [];

  const handleOrgChange = (
    field: keyof OrganizationFormData,
    value: string,
  ) => {
    let finalValue = value;
    if (
      field === "inn" ||
      field === "mfo" ||
      field === "account_number" ||
      field === "trustee_number" ||
      field === "ifut"
    ) {
      finalValue = value.replace(/\D/g, "");
    }
    setOrganization((prev) => ({ ...prev, [field]: finalValue }));
  };

  const handlePhoneChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    let finalValue = "";
    if (!digits.startsWith("998")) finalValue = "+998" + digits;
    else finalValue = "+" + digits;
    if (finalValue.length < 4) finalValue = "+998";
    if (finalValue.length > 13) return;

    const newPhones = [...organization.phones];
    newPhones[index] = finalValue;
    setOrganization((prev) => ({ ...prev, phones: newPhones }));
  };

  const addPhone = () => {
    setOrganization((prev) => ({ ...prev, phones: [...prev.phones, "+998"] }));
  };

  const removePhone = (index: number) => {
    if (organization.phones.length > 1) {
      const newPhones = organization.phones.filter((_, i) => i !== index);
      setOrganization((prev) => ({ ...prev, phones: newPhones }));
    }
  };

  const handleStudentChange = (
    index: number,
    field: keyof OrganizationStudentFormData,
    value: string | boolean,
  ) => {
    let finalValue = value;
    if (field === "phone" && typeof value === "string") {
      const digits = value.replace(/\D/g, "");
      if (!digits.startsWith("998")) finalValue = "+998" + digits;
      else finalValue = "+" + digits;
      if (finalValue.length < 4) finalValue = "+998";
      if (finalValue.length > 13) return;
    }
    setStudents((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const updated = { ...s, [field]: finalValue };

        // Auto-fill dates when group is selected
        if (field === "group_id" && value && allGroups) {
          const group = allGroups.find((g) => String(g.id) === value);
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

  const addStudent = () =>
    setStudents((prev) => [...prev, { ...emptyOrganizationStudent }]);
  const removeStudent = (index: number) => {
    if (students.length > 1)
      setStudents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRepresentativeChange = (
    index: number,
    field: keyof RepresentativeFormData,
    value: string | string[],
  ) => {
    setRepresentatives((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  };

  const addRepresentative = () =>
    setRepresentatives((prev) => [...prev, { ...emptyRepresentative }]);

  const removeRepresentative = (index: number) => {
    if (representatives.length > 1)
      setRepresentatives((prev) => prev.filter((_, i) => i !== index));
  };

  const isStep1Valid = () => {
    const o = organization;
    const branchFilled =
      o.organization_branch !== "bor" || Boolean(o.branch_name && o.branch_address);
    return Boolean(
      o.inn &&
        o.language &&
        o.branch_id &&
        o.contract_date &&
        o.has_trustee &&
        o.trustee_date &&
        o.trustee_number &&
        o.organization_name &&
        o.organization_branch &&
        branchFilled &&
        o.director_last_name &&
        o.director_first_name &&
        o.director_father_name &&
        o.contract_start_date &&
        o.contract_end_date &&
        o.phones.every((p) => p.length > 4) &&
        o.ifut &&
        o.account_number &&
        o.bank_name &&
        o.mfo,
    );
  };

  const isStep2Valid = () =>
    representatives.every((r) =>
      Boolean(
        r.jshshir &&
          r.citizenship &&
          r.representative_type &&
          r.birth_date &&
          r.passport_series &&
          r.passport_number &&
          r.passport_given_date &&
          r.passport_expiry_date &&
          r.passport_given_by &&
          r.last_name &&
          r.first_name &&
          r.father_name &&
          r.registered_address &&
          r.residential_address &&
          r.phones.every((p) => p.length > 4),
      ),
    );

  const showStepError = (message: string) =>
    notifications.show({
      title: t('studentsContract.legal.errorTitle'),
      message,
      color: "red",
    });

  /** Oldingi bosqichlar to'liqmi — bo'lmasa o'sha bosqichga qaytarib, xatolarni belgilaydi. */
  const stepsBefore = (target: 2 | 3) => {
    if (!isStep1Valid()) {
      arm();
      setStep(1);
      showStepError(t('studentsContract.legal.errorOrgMsg'));
      return false;
    }
    if (target === 3 && !isStep2Valid()) {
      arm();
      setStep(2);
      showStepError(t('studentsContract.legal.errorOrgMsg'));
      return false;
    }
    return true;
  };

  /** Bosqich paneli — orqaga qaytishni bloklamaslik uchun faqat oldingilar tekshiriladi. */
  const jumpToStep = (target: 2 | 3) => {
    if (!stepsBefore(target)) return;
    setStep(target);
  };

  /** "Keyingi" tugmasi — joriy bosqich DOM'da, u ham to'liq bo'lishi kerak. */
  const nextStep = (target: 2 | 3) => {
    if (!validate()) {
      showStepError(t('studentsContract.legal.errorOrgMsg'));
      return;
    }
    if (!stepsBefore(target)) return;
    setStep(target);
  };

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      API.post("/student-contracts", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-contracts"] });
      notifications.show({
        title: t('studentsContract.legal.successTitle'),
        message: t('studentsContract.legal.contractCreated'),
        color: "green",
      });
      navigate("/students-contract");
    },
    onError: () =>
      notifications.show({
        title: t('studentsContract.legal.errorTitle'),
        message: t('studentsContract.legal.createError'),
        color: "red",
      }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      API.put(`/student-contracts/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-contracts"] });
      notifications.show({
        title: t('studentsContract.legal.successTitle'),
        message: t('studentsContract.legal.contractUpdated'),
        color: "green",
      });
      navigate("/students-contract");
    },
    onError: () =>
      notifications.show({
        title: t('studentsContract.legal.errorTitle'),
        message: t('studentsContract.legal.updateError'),
        color: "red",
      }),
  });

  const handleSubmit = () => {
    if (!validate()) return;
    if (!stepsBefore(3)) return;

    const payload = {
      contract_type: "legal_trilateral",
      contract_date: organization.contract_date || null,
      representatives: representatives.map((r) => ({
        ...r,
        phone: r.phones[0],
      })),
      organization: { ...organization, phone: organization.phones[0] },
      students: students.map((s, idx) => {
        const studentPayload: Record<string, unknown> = {
          ...s,
          lid_id: Number(s.lid_id),
          course_id: Number(s.course_id),
          level_id: Number(s.level_id),
          group_id: Number(s.group_id),
          monthly_price: Number(s.monthly_price) || 0,
          total_price: Number(s.total_price) || 0,
          course_start_date: s.course_start_date,
          course_end_date: s.course_end_date,
        };
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
          style={{
            textTransform: "uppercase",
            fontFamily: "noto-sb",
            fontSize: "16px",
            color: "#000",
          }}
        >
          {t('studentsContract.legal.title')}
        </span>
      </div>

      <div
        className="sc-step-bar"
        style={{
          display: "flex",
          background: "#003366",
          borderRadius: "40px",
          margin: "16px 0",
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
          {t('studentsContract.legal.step1')}
        </div>
        <div
          className={`sc-step-item ${step >= 2 ? "active" : ""}`}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "14px",
            cursor: "pointer",
            background: step >= 2 ? "#003366" : "#5d7ca4",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "14px",
            textTransform: "uppercase",
            borderRight: "1px solid rgba(255,255,255,0.1)",
          }}
          onClick={() => jumpToStep(2)}
        >
          {t('studentsContract.rep.step2')}
        </div>
        <div
          className={`sc-step-item ${step === 3 ? "active" : ""}`}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "14px",
            cursor: "pointer",
            background: step === 3 ? "#003366" : "#5d7ca4",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "14px",
            textTransform: "uppercase",
          }}
          onClick={() => jumpToStep(3)}
        >
          {t('studentsContract.rep.step3')}
        </div>
      </div>

      {step === 1 && (
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
          <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
            <div className="sc-form-col" style={{ flex: 2 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.orgStir')} <span>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="sc-form-input"
                  style={{
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    paddingRight: "140px",
                  }}
                  placeholder="00000000000000"
                  value={organization.inn}
                  onChange={(e) => handleOrgChange("inn", e.target.value)}
                />
                <a
                  href="https://fo.birdarcha.uz/pub/search"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#003366",
                    fontSize: "14px",
                    textDecoration: "none",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {t('studentsContract.legal.checkReestor')}
                  <i
                    className="fa-solid fa-arrow-up-right-from-square"
                    style={{ fontSize: "12px" }}
                  ></i>
                </a>
              </div>
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.form.language')} <span>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  className="sc-form-select"
                  style={{
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    appearance: "none",
                  }}
                  value={organization.language}
                  onChange={(e) => handleOrgChange("language", e.target.value)}
                >
                  <option value="uz">UZ</option>
                  <option value="ru">RU</option>
                  <option value="en">EN</option>
                </select>
                <i
                  className="fa-solid fa-caret-down"
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#003366",
                    pointerEvents: "none",
                  }}
                ></i>
              </div>
            </div>
          </div>

          <div
            className="sc-form-row"
            style={{ display: "flex", gap: "18px", marginTop: "18px" }}
          >
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.branch')} <span>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <select
                  className="sc-form-select"
                  style={{
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    appearance: "none",
                  }}
                  value={organization.branch_id}
                  onChange={(e) => {
                    const branchId = e.target.value;
                    const selectedBranch = branches.find(
                      (b) => String(b.id) === branchId,
                    );
                    if (selectedBranch) {
                      setOrganization((prev) => ({
                        ...prev,
                        branch_id: branchId,
                        city: selectedBranch.city || "",
                      }));
                    } else {
                      handleOrgChange("branch_id", branchId);
                    }
                  }}
                >
                  <option value="">{t('studentsContract.form.select')}</option>
                  {branches?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
                <i
                  className="fa-solid fa-caret-down"
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#003366",
                    pointerEvents: "none",
                  }}
                ></i>
              </div>
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">{t('studentsContract.form.city')}</label>
              <input
                type="text"
                className="sc-form-input"
                style={{ background: "#e2e8f0", border: "none" }}
                placeholder={t('studentsContract.legal.autoFill')}
                value={organization.city}
                readOnly
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.form.contractDate')} <span>*</span>
              </label>
              <DateInput
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                value={organization.contract_date}
                onChange={(e) =>
                  handleOrgChange("contract_date", e.target.value)
                }
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: "20px 0",
            }}
          >
            <div
              style={{
                background: "#FFEFDB",
                color: "#FE9100",
                padding: "8px",
                borderRadius: "8px",
              }}
            >
              <i className="fa-solid fa-building"></i>
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b" }}>
              {t('studentsContract.legal.orgInfoTitle')}
            </h3>
          </div>

          <div className="sc-form-row" style={{ display: "flex", gap: "18px" }}>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.trustee')} <span>*</span>
              </label>
              <ToggleButton
                options={[
                  { label: t('studentsContract.legal.noTrustee'), value: "Ishonchnomasiz" },
                  { label: t('studentsContract.legal.hasTrustee'), value: "Ishonchnoma bilan" },
                ]}
                value={organization.has_trustee}
                onChange={(val) => handleOrgChange("has_trustee", val)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.trusteeDate')} <span>*</span>
              </label>
              <DateInput
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                value={organization.trustee_date}
                onChange={(e) =>
                  handleOrgChange("trustee_date", e.target.value)
                }
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.trusteeNum')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                placeholder="kiriting"
                value={organization.trustee_number}
                onChange={(e) =>
                  handleOrgChange("trustee_number", e.target.value)
                }
              />
            </div>
          </div>

          <div
            className="sc-form-row"
            style={{ display: "flex", gap: "18px", marginTop: "18px" }}
          >
            <div className="sc-form-col" style={{ flex: 2 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.orgName')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                placeholder="Kiriting"
                value={organization.organization_name}
                onChange={(e) =>
                  handleOrgChange("organization_name", e.target.value)
                }
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.orgBranch')} <span>*</span>
              </label>
              <ToggleButton
                options={[
                  { label: t('studentsContract.legal.noOrgBranch'), value: "yo'q" },
                  { label: t('studentsContract.legal.hasOrgBranch'), value: "bor" },
                ]}
                value={organization.organization_branch}
                onChange={(val) => handleOrgChange("organization_branch", val)}
              />
            </div>
          </div>

          {organization.organization_branch === "bor" && (
            <>
              <div className="sc-form-row" style={{ marginTop: "18px" }}>
                <div className="sc-form-col">
                  <label className="sc-form-label">
                    {t('studentsContract.legal.branchName')} <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="sc-form-input"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                    placeholder="Kiriting"
                    value={organization.branch_name}
                    onChange={(e) =>
                      handleOrgChange("branch_name", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="sc-form-row" style={{ marginTop: "18px" }}>
                <div className="sc-form-col">
                  <label className="sc-form-label">
                    {t('studentsContract.legal.branchAddress')} <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="sc-form-input"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                    placeholder="Kiriting"
                    value={organization.branch_address}
                    onChange={(e) =>
                      handleOrgChange("branch_address", e.target.value)
                    }
                  />
                </div>
              </div>
            </>
          )}

          <div
            className="sc-form-row"
            style={{ display: "flex", gap: "18px", marginTop: "18px" }}
          >
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.directorLastName')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                placeholder="Kiriting"
                value={organization.director_last_name}
                onChange={(e) =>
                  handleOrgChange("director_last_name", e.target.value)
                }
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.directorFirstName')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                placeholder="Kiriting"
                value={organization.director_first_name}
                onChange={(e) =>
                  handleOrgChange("director_first_name", e.target.value)
                }
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.directorFatherName')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                placeholder="Kiriting"
                value={organization.director_father_name}
                onChange={(e) =>
                  handleOrgChange("director_father_name", e.target.value)
                }
              />
            </div>
          </div>

          <div
            className="sc-form-row"
            style={{ display: "flex", gap: "18px", marginTop: "18px" }}
          >
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.contractStartDate')} <span>*</span>
              </label>
              <DateInput
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                value={organization.contract_start_date}
                onChange={(e) =>
                  handleOrgChange("contract_start_date", e.target.value)
                }
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.contractEndDate')} <span>*</span>
              </label>
              <DateInput
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                value={organization.contract_end_date}
                onChange={(e) =>
                  handleOrgChange("contract_end_date", e.target.value)
                }
              />
            </div>
          </div>

          {organization.phones.map((phone, idx) => (
            <div
              key={idx}
              className="sc-form-row"
              style={{ display: "flex", gap: "18px", marginTop: "18px" }}
            >
              <div className="sc-form-col" style={{ flex: 1 }}>
                <label className="sc-form-label">
                  {t('studentsContract.legal.phoneLabel', { num: idx + 1 })} <span>*</span>
                </label>
                <div style={{ display: "flex", gap: "12px" }}>
                  <input
                    type="text"
                    className="sc-form-input"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                    value={phone}
                    onChange={(e) => handlePhoneChange(idx, e.target.value)}
                  />
                  {idx === organization.phones.length - 1 ? (
                    <div
                      onClick={addPhone}
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
                      onClick={() => removePhone(idx)}
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

          <div
            className="sc-form-row"
            style={{ display: "flex", gap: "18px", marginTop: "18px" }}
          >
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.ifut')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                placeholder="Kiriting"
                value={organization.ifut}
                onChange={(e) => handleOrgChange("ifut", e.target.value)}
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.accountNum')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                placeholder="Kiriting"
                value={organization.account_number}
                onChange={(e) =>
                  handleOrgChange("account_number", e.target.value)
                }
              />
            </div>
            <div className="sc-form-col" style={{ flex: 1 }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.bankName')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                placeholder="Kiriting"
                value={organization.bank_name}
                onChange={(e) => handleOrgChange("bank_name", e.target.value)}
              />
            </div>
          </div>

          <div
            className="sc-form-row"
            style={{ display: "flex", gap: "18px", marginTop: "18px" }}
          >
            <div className="sc-form-col" style={{ flex: "0 0 32%" }}>
              <label className="sc-form-label">
                {t('studentsContract.legal.mfo')} <span>*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                placeholder="Kiriting"
                value={organization.mfo}
                onChange={(e) => handleOrgChange("mfo", e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "30px",
            }}
          >
            <button
              className="sc-form-cancel-btn"
              style={{
                padding: "12px 32px",
                borderRadius: "10px",
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                color: "#64748b",
                cursor: "pointer",
                fontFamily: "noto-m",
              }}
              onClick={() => navigate("/students-contract")}
            >
              {t('studentsContract.form.cancel')}
            </button>
            <button
              className="sc-form-next-btn"
              style={{
                padding: "12px 32px",
                borderRadius: "10px",
                border: "none",
                background: "#FE9100",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(254, 145, 0, 0.2)",
              }}
              onClick={() => nextStep(2)}
            >
              {t('studentsContract.minor.next')}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          {representatives.map((r, idx) => (
            <RepresentativeCard
              key={idx}
              index={idx}
              representative={r}
              onChange={handleRepresentativeChange}
              onRemove={removeRepresentative}
              showRemove={representatives.length > 1}
            />
          ))}
          <button
            style={{
              width: "100%",
              padding: "14px",
              border: "2px dashed #FE9100",
              borderRadius: "12px",
              background: "#fff",
              color: "#FE9100",
              cursor: "pointer",
              marginBottom: "20px",
              fontWeight: "600",
              fontSize: "15px",
            }}
            onClick={addRepresentative}
          >
            {t('studentsContract.rep.addRep')}
          </button>
          <div
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
                padding: "12px 32px",
                borderRadius: "10px",
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                color: "#64748b",
                cursor: "pointer",
                fontFamily: "noto-m",
              }}
              onClick={() => navigate("/students-contract")}
            >
              {t('studentsContract.form.cancel')}
            </button>
            <button
              className="sc-form-prev-btn"
              style={{
                padding: "12px 32px",
                borderRadius: "10px",
                border: "1.5px solid #FE9100",
                background: "#fff",
                color: "#FE9100",
                cursor: "pointer",
                fontFamily: "noto-m",
              }}
              onClick={() => setStep(1)}
            >
              {t('studentsContract.minor.prev')}
            </button>
            <button
              className="sc-form-next-btn"
              style={{
                padding: "12px 32px",
                borderRadius: "10px",
                border: "none",
                background: "#FE9100",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(254, 145, 0, 0.2)",
              }}
              onClick={() => nextStep(3)}
            >
              {t('studentsContract.minor.next')}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          {students.map((s, idx) => (
            <OrganizationStudentCard
              key={idx}
              index={idx}
              student={s}
              onChange={handleStudentChange}
              onRemove={removeStudent}
              showRemove={students.length > 1}
              allLids={allLids || []}
              allGroups={allGroups || []}
              allCourses={allCourses || []}
              onLidSelect={(lid) => {
                if (!lid.branch) return;
                setOrganization((prev) => ({
                  ...prev,
                  branch_id: String(lid.branch_id ?? lid.branch?.id ?? prev.branch_id),
                  city: lid.branch?.city || prev.city,
                }));
              }}
            />
          ))}
          <button
            style={{
              width: "100%",
              padding: "14px",
              border: "2px dashed #FE9100",
              borderRadius: "12px",
              background: "#fff",
              color: "#FE9100",
              cursor: "pointer",
              marginBottom: "20px",
              fontWeight: "600",
              fontSize: "15px",
            }}
            onClick={addStudent}
          >
            {t('studentsContract.legal.addStudent')}
          </button>
          <div
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
                padding: "12px 32px",
                borderRadius: "10px",
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                color: "#64748b",
                cursor: "pointer",
                fontFamily: "noto-m",
              }}
              onClick={() => navigate("/students-contract")}
            >
              {t('studentsContract.form.cancel')}
            </button>
            <button
              className="sc-form-prev-btn"
              style={{
                padding: "12px 32px",
                borderRadius: "10px",
                border: "1.5px solid #FE9100",
                background: "#fff",
                color: "#FE9100",
                cursor: "pointer",
                fontFamily: "noto-m",
              }}
              onClick={() => setStep(2)}
            >
              {t('studentsContract.minor.prev')}
            </button>
            <button
              className="sc-form-save-btn"
              style={{
                padding: "12px 32px",
                borderRadius: "10px",
                border: "none",
                background: "#fe9100",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(40, 167, 69, 0.2)",
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

export default RepresentativeEntity;
