import React from "react";
import { Badge, Text, Stack } from "@mantine/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserTie, faClock } from "@fortawesome/free-solid-svg-icons";
import type { Group } from "../../types/groups.types";
import { getLocalized } from "../../utils/getLocalized";
import { useTranslation } from "react-i18next";
import "./lessonSchedule.css";

interface ScheduleCardProps {
  group: Group;
  onClick?: () => void;
  isMobile?: boolean;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  group,
  onClick,
  isMobile,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div
      className={`schedule-card ${isMobile ? "mobile" : ""}`}
      onClick={onClick}
    >
      <div className="schedule-card-header">
        <Badge
          color="orange"
          variant="light"
          size="lg"
          radius="sm"
          className="group-name-badge"
        >
          {group.name}
        </Badge>
        <Badge
          color="orange"
          variant="filled"
          size="lg"
          radius="sm"
          className="level-badge"
        >
          {group.level ? getLocalized(group.level, "name", lang) : "N/A"}
        </Badge>
      </div>

      <Stack gap={6} mt={4} className="card-info">
        <div className="info-item">
          <FontAwesomeIcon icon={faUserTie} className="info-icon" />
          <Text size="md" className="teacher-name">
            {group.teacher?.first_name} {group.teacher?.last_name}
          </Text>
        </div>
        <div className="info-item time">
          <FontAwesomeIcon icon={faClock} className="info-icon" />
          <Text
            size="md"
            fw={700}
            style={{ fontSize: "12px", color: "#ff0000" }}
          >
            {group.start_time?.slice(0, 5)} - {group.end_time?.slice(0, 5)}
          </Text>
        </div>
      </Stack>

      {isMobile && <button className="vazifa-btn">{t('lessonSchedule.card.assignTask')}</button>}
    </div>
  );
};
