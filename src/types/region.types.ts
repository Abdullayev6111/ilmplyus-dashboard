import type { BaseEntity } from "./common.types";

export interface Region extends BaseEntity {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
}

export interface SaveRegionPayload {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
}
