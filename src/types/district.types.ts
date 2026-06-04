import type { BaseEntity } from "./common.types";
import type { Region } from "./region.types";

export interface District extends BaseEntity {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  region_id: number;
  region?: Region;
}

export interface SaveDistrictPayload {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  region_id: number;
}
