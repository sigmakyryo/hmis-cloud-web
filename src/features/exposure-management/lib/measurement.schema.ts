import { z } from "zod";

export const measurementFormSchema = z
  .object({
    group_uuid: z.string().min(1, "Choose a group"),
    agent_uuid: z.string().min(1, "Choose an agent"),
    sample_type: z.enum(["personal", "area", "biological"]),
    sampled_at: z.string().min(1, "Enter when it was sampled"),
    duration_minutes: z.coerce.number().int().min(1, "Duration must be at least 1 minute").max(1440),
    result_value: z.coerce.number().min(0, "Result cannot be negative"),
    result_unit: z.string().min(1, "Choose a unit"),
    below_lod: z.boolean(),
    lod_value: z.string(),
  })
  .refine((v) => !v.below_lod || (v.lod_value !== "" && Number(v.lod_value) > 0), {
    message: "Enter the limit of detection for a result below it",
    path: ["lod_value"],
  });

export type MeasurementFormValues = z.input<typeof measurementFormSchema>;
