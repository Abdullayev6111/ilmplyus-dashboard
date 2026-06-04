export interface Group {
  id: number;
  name: string;
  days?: string[];
  start_time?: string;
  end_time?: string;
  start_date?: string;
}

export interface Teacher {
  id: number;
  full_name: string;
}

export interface Lesson {
  id: number;
  group_id: number;
  date: string;
  topic: string;
  lesson_file: string;
  homework_title: string;
  homework_description: string;
  homework_file: string;
  group?: Group;
  teacher?: Teacher;
}
