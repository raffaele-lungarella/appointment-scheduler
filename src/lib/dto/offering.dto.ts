export type OfferingDTO = {
  id: string;
  staffID: string;
  name: string;
  duration: number;
  price: number;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
