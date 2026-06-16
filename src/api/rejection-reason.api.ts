import { API } from './api';

export interface RejectionReason {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  comment: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RejectionReasonPayload {
  name_uz: string;
  comment?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const rejectionReasonAPI = {
  getAll: async (): Promise<RejectionReason[]> => {
    const { data } = await API.get('/rejection-reasons');
    return data;
  },

  create: async (payload: RejectionReasonPayload): Promise<RejectionReason> => {
    const { data } = await API.post('/rejection-reasons', payload);
    return data;
  },

  update: async (id: number, payload: RejectionReasonPayload): Promise<RejectionReason> => {
    const { data } = await API.put(`/rejection-reasons/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await API.delete(`/rejection-reasons/${id}`);
  },
};
