import React from "react";
import { Modal, Text, Stack, Divider, Badge } from "@mantine/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserTie,
  faClock,
  faUsers,
  faCalendarDays,
  faDoorOpen,
  faBuilding,
} from "@fortawesome/free-solid-svg-icons";
import type { Group } from "../../types/groups.types";
import { getLocalized } from "../../utils/getLocalized";
import { useTranslation } from "react-i18next";

interface DetailModalProps {
  group: Group | null;
  opened: boolean;
  onClose: () => void;
}


export const DetailModal: React.FC<DetailModalProps> = ({
  group,
  opened,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  if (!group) return null;

  const formattedDays = group.days.map((d) => t(`lessonSchedule.weekdays.${d}`) || d).join(", ");

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      size="lg"
      radius="12px"
      centered
      padding={0}
    >
      <div className="modal-header">
        <span className="modal-header-title">
          {t('lessonSchedule.modal.title')}: {group.name}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            fontSize: "20px",
          }}
        >
          ✕
        </button>
      </div>
      <Stack gap="md">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px 28px 0",
          }}
        >
          <Text size="lg" className="detail-modal-title" color="blue">
            {group.course ? getLocalized(group.course, "name", lang) : "-"}
          </Text>
          <Badge
            size="xl"
            className="modal-level-badge"
            variant="filled"
            radius="sm"
          >
            {group.level ? getLocalized(group.level, "name", lang) : "-"}
          </Badge>
        </div>

        <Divider />

        <Stack gap="xs" style={{ padding: "0 28px 24px" }}>
          <DetailItem
            icon={faUserTie}
            label={t('lessonSchedule.modal.teacher')}
            value={`${group.teacher?.first_name ?? ""} ${group.teacher?.last_name ?? ""}`}
          />
          <DetailItem
            icon={faClock}
            label={t('lessonSchedule.modal.time')}
            value={`${group.start_time?.slice(0, 5) ?? ""} - ${group.end_time?.slice(0, 5) ?? ""}`}
          />
          <DetailItem
            icon={faCalendarDays}
            label={t('lessonSchedule.modal.days')}
            value={formattedDays}
          />
          <DetailItem
            icon={faDoorOpen}
            label={t('lessonSchedule.modal.room')}
            value={group.room ? `${getLocalized(group.room, "name", lang)} (${group.room.floor ?? "-"}-${t('lessonSchedule.modal.floor')})` : "-"}
          />
          <DetailItem
            icon={faBuilding}
            label={t('lessonSchedule.modal.branch')}
            value={group.branch ? getLocalized(group.branch, "name", lang) : "-"}
          />
          <DetailItem
            icon={faUsers}
            label={t('lessonSchedule.modal.studentsCount')}
            value={`${group.students_count ?? 0} / ${group.max_students ?? 0}`}
          />
        </Stack>
      </Stack>
    </Modal>
  );
};

const DetailItem = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
    <div
      style={{
        width: "32px",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f4f8",
        borderRadius: "8px",
      }}
    >
      <FontAwesomeIcon icon={icon} style={{ color: "#003366" }} />
    </div>
    <div>
      <Text
        size="xs"
        color="dimmed"
        style={{ lineHeight: 1.2, fontFamily: "noto-r, sans-serif" }}
      >
        {label}
      </Text>
      <Text
        size="sm"
        fw={500}
        style={{ fontFamily: "noto-m, sans-serif", color: "#000000" }}
      >
        {value}
      </Text>
    </div>
  </div>
);
