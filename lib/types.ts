export type Area = {
  id: string;
  name: string;
};

export type Project = {
  id: string;
  area_id: string | null;
  name: string;
  status: string;
};

export type Task = {
  id: string;
  project_id: string | null;
  title: string;
  status: string;
};

export type ActiveTimer = {
  user_id: string;
  task_id: string | null;
  started_at: string | null;
  is_running: boolean;
  is_paused: boolean;
  last_state_change: string | null;
  accumulated_sec: number;
};

export type DailyScore = {
  id: string;
  date: string;
  target_minutes: number;
  worked_minutes: number;
  checklist_ratio: number;
  win: boolean;
  locked: boolean;
};
