export type Class = {
  id: string;
  teacherId: string;
  name: string;
  description?: string;
  status: "active" | "archived";
  studentCount: number;
  activeAssignmentCount: number;
  createdAt: string;
};
