export type Profile = {
  id: string;
  email: string;
  full_name: string;
  job_title: string;
  job_desk: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  department_id: string | null;
  is_admin: boolean;
  created_at: string;
  // 0 = Sunday ... 6 = Saturday
  work_days: number[];
  work_start_time: string;
  work_end_time: string;
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type Department = {
  id: string;
  name: string;
  created_at: string;
};

export type TaskStatus = "todo" | "revision" | "reviewing" | "done";
export type TaskPriority = "low" | "normal" | "high";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  department_id: string;
  created_by: string | null;
  deadline: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
};

export type TaskAssignee = {
  task_id: string;
  profile_id: string;
};

export type TaskAttachment = {
  id: string;
  task_id: string;
  uploaded_by: string | null;
  file_url: string;
  file_name: string;
  created_at: string;
};

export type TaskComment = {
  id: string;
  task_id: string;
  profile_id: string;
  body: string;
  created_at: string;
};

export type TaskStatusUpdate = {
  id: string;
  task_id: string;
  changed_by: string | null;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  note: string | null;
  created_at: string;
};

export type AttendanceStatus = "present" | "late" | "absent" | "leave";

export type Attendance = {
  id: string;
  profile_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  note: string | null;
};

export type ChatChannel = {
  id: string;
  name: string | null;
  department_id: string | null;
  is_dm: boolean;
  created_by: string | null;
  created_at: string;
};

export type ChatChannelMember = {
  channel_id: string;
  profile_id: string;
};

export type ChatMessage = {
  id: string;
  channel_id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
};
