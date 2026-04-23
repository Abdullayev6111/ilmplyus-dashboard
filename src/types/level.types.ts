export interface Level {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  created_at: string;
}

export interface LevelPayload {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
}
