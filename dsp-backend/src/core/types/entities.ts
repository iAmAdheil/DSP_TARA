export type UserRole = "owner" | "analyst" | "reviewer" | "viewer";

export interface UserEntity {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ProjectEntity {
  projectId: string;
  name: string;
  domain: "automotive" | "general-system-security";
}

export interface RunEntity {
  runId: string;
  projectId: string;
  status: "queued" | "running" | "completed" | "failed";
}
