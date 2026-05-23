export type Student = {
  id: string;
  teacherId: string;
  name: string;
  accessCode: string;
  classIds: string[];
  status: "active" | "inactive";
  memo?: string;
  createdAt: string;
};
