// Barcha umumiy ro'yxatlar /api/options/{entity} orqali olinadi — ular faqat
// `lookups.view` ruxsatini talab qiladi. Batafsil: hooks/useOptions.ts
import { useOptions } from './useOptions';

export const useBranches = () => useOptions('branches');
export const useRoles = () => useOptions('roles');
export const usePositions = () => useOptions('positions');
export const useLevels = () => useOptions('levels');
export const useCourses = () => useOptions('courses');
export const useGroups = () => useOptions('groups');
export const useEmployees = () => useOptions('employees');
