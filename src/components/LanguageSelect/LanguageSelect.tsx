import { useTranslation } from "react-i18next";
import classes from "./LanguagePicker.module.css";
import { Select } from "@mantine/core";

const langs = [
  { value: "uz", label: "UZ" },
  { value: "ru", label: "RU" },
  { value: "en", label: "EN" },
];

type Props = {
  variant?: "login" | "header";
};

export default function LanguageSelect({ variant = "header" }: Props) {
  const { i18n } = useTranslation();

  const changeLang = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("lang", lng);
  };

  // LOGIN
  if (variant === "login") {
    return (
      <div className={classes.wrapper}>
        {langs?.map((l) => (
          <button
            key={l.value}
            onClick={() => changeLang(l.value)}
            className={`${classes.btn} ${i18n.language === l.value ? classes.active : ""}`}
          >
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  // HEADER

  return (
    <Select
      value={i18n.language}
      onChange={(v) => v && changeLang(v)}
      data={langs}
      rightSection={null}
      checkIconPosition="right"
      size="sm"
      radius="md"
      styles={{
        input: {
          background: "#003366",
          color: "white",
          border: "none",
          fontFamily: "noto-b",
          height: 36,
          width: 70,
          textAlign: "center",
          fontSize: 18,
        },
        dropdown: {
          borderRadius: 12,
          fontSize: 18,
        },
      }}
      classNames={{
        option: "lang-option",
      }}
    />
  );
}
