import { useQuery } from '@tanstack/react-query';
import { API } from '@/api/api';
import { useCreateMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useMutations';
import type {
  DemoLesson,
  DemoLessonFilters,
  CreateDemoLessonPayload,
  UpdateDemoLessonPayload,
  AttendancePayload,
  DemoLessonsApiResponse,
} from '@/types/demoLesson.types';

export const DEMO_LESSON_KEY = 'demo-lessons';

export const useDemoLessons = (filters?: DemoLessonFilters) =>
  useQuery<DemoLessonsApiResponse>({
    queryKey: [DEMO_LESSON_KEY, filters],
    queryFn: async () => {
      const res = await API.get('/demo-lessons', { params: filters });
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });

export const useDemoLessonById = (id: number | null) =>
  useQuery<DemoLesson>({
    queryKey: [DEMO_LESSON_KEY, id],
    queryFn: async () => {
      const res = await API.get(`/demo-lessons/${id}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

export const useCreateDemoLesson = () =>
  useCreateMutation<DemoLesson, Error, CreateDemoLessonPayload>(
    async (payload) => {
      const res = await API.post('/demo-lessons', payload);
      return res.data;
    },
    [[DEMO_LESSON_KEY]],
  );

export const useUpdateDemoLesson = () =>
  useUpdateMutation<DemoLesson, Error, UpdateDemoLessonPayload>(
    async ({ id, data }) => {
      const res = await API.put(`/demo-lessons/${id}`, data);
      return res.data;
    },
    [[DEMO_LESSON_KEY]],
  );

export const useDeleteDemoLesson = () =>
  useDeleteMutation<unknown, Error, number>(
    async (id) => {
      const res = await API.delete(`/demo-lessons/${id}`);
      return res.data;
    },
    [[DEMO_LESSON_KEY]],
  );

export const useAttendanceDemoLesson = () =>
  useCreateMutation<unknown, Error, AttendancePayload>(
    async ({ id, data }) => {
      const res = await API.post(`/demo-lessons/${id}/attendance`, data);
      return res.data;
    },
    [[DEMO_LESSON_KEY]],
  );
