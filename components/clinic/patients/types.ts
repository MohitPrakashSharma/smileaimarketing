export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  status: "ACTIVE" | "INACTIVE";
  lastVisitAt: string | null;
  nextVisitAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientInvoice = {
  id: string;
  number: string;
  status: "DRAFT" | "SENT" | "PAID" | "VOID";
  totalCents: number;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
};
