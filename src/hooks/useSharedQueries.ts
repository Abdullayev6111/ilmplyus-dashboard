import { useQuery } from '@tanstack/react-query';
import { API } from '../api/api';
import type { Branch, Role, Position } from '../types';
import type { Level } from '../types/level.types';
import type { Course } from '../types/course.types';
import type { Group } from '../types/groups.types';

// Reference data — rarely changes, cache for 30 minutes
const REFERENCE_STALE = 30 * 60 * 1000;
const REFERENCE_GC = 60 * 60 * 1000;

const fetchArray = async <T>(url: string): Promise<T[]> => {
  const { data } = await API.get<T[] | { data: T[] }>(url);
  return Array.isArray(data) ? data : (data as { data: T[] })?.data ?? [];
};

export const useBranches = () =>
  useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => fetchArray<Branch>('/branches'),
    staleTime: REFERENCE_STALE,
    gcTime: REFERENCE_GC,
  });

export const useRoles = () =>
  useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => fetchArray<Role>('/roles'),
    staleTime: REFERENCE_STALE,
    gcTime: REFERENCE_GC,
  });

export const usePositions = () =>
  useQuery<Position[]>({
    queryKey: ['positions'],
    queryFn: () => fetchArray<Position>('/positions'),
    staleTime: REFERENCE_STALE,
    gcTime: REFERENCE_GC,
  });

export const useLevels = () =>
  useQuery<Level[]>({
    queryKey: ['levels'],
    queryFn: () => fetchArray<Level>('/levels'),
    staleTime: REFERENCE_STALE,
    gcTime: REFERENCE_GC,
  });

export const useCourses = () =>
  useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => fetchArray<Course>('/courses'),
    staleTime: REFERENCE_STALE,
    gcTime: REFERENCE_GC,
  });

export const useGroups = () =>
  useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => fetchArray<Group>('/groups'),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export interface Employee {
  id: number;
  full_name: string;
  type?: string;
}

export const useEmployees = () =>
  useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => fetchArray<Employee>('/employees'),
    staleTime: REFERENCE_STALE,
    gcTime: REFERENCE_GC,
  });
