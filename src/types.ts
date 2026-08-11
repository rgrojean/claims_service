export type Address = { line1: string; city: string; state: string; zip: string };

export type Patient = {
  patientId: string; name: string; dob: string; gender: string; ssn: string;
  phone: string; email: string | null; address: Address;
};

export type Encounter = {
  claimRef: string; patientId: string; payerId: string; memberId: string;
  serviceDate: string; cpt: string; amount: number; diagnosis: string;
};

export type EnrichedClaim = Encounter & {
  subscriberId: string; subscriberIdSource: string; ssn: string;
  lastName: string; firstName: string; dob: string; gender: string; address: Address;
};

export type SubmittedClaim = {
  claimRef: string; memberId: string | null; ssn: string | null;
  lastName: string | null; firstName: string | null; dob: string | null;
};

export type RemitRecord = {
  claimRef?: string; memberId?: string; ssn?: string;
  patientName?: string; dob?: string; paidAmount?: number;
};
