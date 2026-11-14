import { z } from "zod";

export const recordIodFormSchema = z.object({
  onset_date: z.string().min(1, "Enter the incident date"),
  note: z.string().max(2000, "Keep this under 2,000 characters"),
});

export type RecordIodFormValues = z.infer<typeof recordIodFormSchema>;
