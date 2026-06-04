export type StudentGender = 'Erkak' | 'Ayol';

export interface FilterState {
  sources: number[]; // source IDs
  genders: StudentGender[];
  courses: number[]; // course IDs
  levels: number[]; // level IDs
  date: string;
}

export const EMPTY_FILTER: FilterState = {
  sources: [],
  genders: [],
  courses: [],
  levels: [],
  date: '',
};

export const GENDERS: StudentGender[] = ['Erkak', 'Ayol'];
