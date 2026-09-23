export type TaskStatus = 'draft' | 'published' | 'closed';
export type ReadinessLevel = 'draft' | 'working' | 'ready' | 'priority';
export type ProposalStatus = 'pending' | 'accepted' | 'rejected';
export type Mode = 'live' | 'demo';
export interface TaskInput {
  title: string;
  draft_text: string;
  industry: string;
  context: string;
  need: string;
  users: string;
  data: string;
  constraints: string;
  expected_result: string;
  success_criteria: string;
  business_contact: string;
  interaction_format: string;
}
export interface Readiness {
  quality_warnings?: string[];
  score: number;
  level: ReadinessLevel;
  level_label: string;
  breakdown: {
    key: string;
    label: string;
    points: number;
    max_points: number;
    complete: boolean;
    missing_fields: string[];
  }[];
  missing_fields: string[];
}
export interface Task extends TaskInput {
  id: number;
  score: number;
  readiness_level: ReadinessLevel;
  readiness: Readiness;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}
export interface TeamInput {
  name: string;
  interests: string;
  skills: string;
  technologies: string;
}
export interface Team extends TeamInput {
  id: number;
  created_at: string;
}
export interface ProposalInput {
  team: number;
  idea: string;
  plan: string;
  timeline: string;
  prototype_url: string;
}
export interface Proposal extends ProposalInput {
  id: number;
  task_id: number;
  team_details: Team;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
}
export interface Analysis {
  fallback_reason?: string;
  notice?: string;
  provider: string;
  draft_text: string;
  questions: { field: string; question: string }[];
  missing_fields: string[];
}
export interface Snapshot {
  tasks: Task[];
  teams: Team[];
  proposals: Proposal[];
}
