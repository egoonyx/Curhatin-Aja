export type Role = "super_admin" | "admin" | "employee";

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
  role: Role;
  created_at: string;
  // 0 = Sunday ... 6 = Saturday
  work_days: number[];
  work_start_time: string;
  work_end_time: string;
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  employee: "Employee",
};

export type Department = {
  id: string;
  name: string;
  parent_department_id: string | null;
  created_at: string;
};

export type SpecialistProfile = {
  profile_id: string;
  specialization: string | null;
  // 0 = Sunday ... 6 = Saturday
  availability_days: number[];
  availability_start_time: string | null;
  availability_end_time: string | null;
  updated_at: string;
};

export type SpecialistCertificate = {
  id: string;
  profile_id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
};

export type ContentPost = {
  id: string;
  department_id: string;
  created_by: string | null;
  link_url: string;
  title: string | null;
  ai_summary: string | null;
  ai_tone: string | null;
  ai_topics: string[] | null;
  ai_suggestions: string | null;
  likes: number;
  views: number;
  comments: number;
  shares: number;
  posted_at: string;
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
  gallery_file_id?: string | null;
};

export type GalleryFile = {
  id: string;
  department_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
};

export type FileShare = {
  file_id: string;
  profile_id: string;
  shared_by: string | null;
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

export type Meeting = {
  id: string;
  title: string;
  description: string | null;
  task_id: string | null;
  channel_id: string | null;
  created_by: string | null;
  start_time: string;
  end_time: string | null;
  zoom_join_url: string | null;
  zoom_start_url: string | null;
  zoom_meeting_id: string | null;
  created_at: string;
};

export type MeetingAttendee = {
  meeting_id: string;
  profile_id: string;
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
  gallery_file_id?: string | null;
};
