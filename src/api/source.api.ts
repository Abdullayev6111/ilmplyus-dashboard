import { API } from './api';

export interface Source {
  id: number;
  name_uz: string;
  name_ru: string | null;
  name_en: string | null;
  link: string;
  created_at: string;
  updated_at: string;
}

export interface SourcePayload {
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  created_at?: string;
  updated_at?: string;
}

export const sourceAPI = {
  getSources: async (): Promise<Source[]> => {
    const { data } = await API.get('/sources');
    return data;
  },

  createSource: async (payload: SourcePayload): Promise<Source> => {
    const { data } = await API.post('/sources', payload);
    return data;
  },

  updateSource: async (id: number, payload: SourcePayload): Promise<Source> => {
    const { data } = await API.put(`/sources/${id}`, payload);
    return data;
  },

  deleteSource: async (id: number): Promise<void> => {
    await API.delete(`/sources/${id}`);
  },
};
