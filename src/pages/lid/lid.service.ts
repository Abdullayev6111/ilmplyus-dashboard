import { API } from "@/api/api";
import type {
  LidComment,
  LidOperator,
  Lid,
  LidStatus,
} from "@/types/lid.types";

export interface LidsQueryParams {
  page: number;
  per_page: number;
}

export async function fetchLids(params: LidsQueryParams): Promise<Lid[]> {
  const { data } = await API.get<Lid[]>("/lids", { params });
  return data;
}

export async function deleteLid(id: number): Promise<void> {
  await API.delete(`/lids/${id}`);
}

// export async function getLidComments(lidId: number): Promise<LidComment[]> {
//   const { data } = await API.get<LidComment[]>(`/lids/${lidId}/comment`);
//   return data;
// }

export async function addLidComment(
  lidId: number,
  text: string,
): Promise<LidComment> {
  const { data } = await API.post<LidComment>(`/lids/${lidId}/comment`, {
    text,
  });
  return data;
}

export function getOperatorFullName(
  operator: LidOperator | null | undefined,
): string {
  if (!operator) return "—";

  return `${operator.last_name} ${operator.first_name} `.trim();
}

export async function updateLidStatus(
  id: number,
  status: LidStatus,
  operator_id: number,
  comment?: string,
): Promise<Lid> {
  const { data } = await API.patch<Lid>(`/lids/${id}`, {
    status,
    operator_id,
    comment,
  });

  return data;
}
