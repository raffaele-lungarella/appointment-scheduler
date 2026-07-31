import { createMinuteOfDay } from "$lib/domain/minute-of-day";
import { z } from "zod";

export const emailSchema = z.email({ error: "Inserisci una mail valida" });

export const recoverPasswordSchema = z.object({ email: emailSchema });

export const profileChangeEmailSchema = z.object({ email: emailSchema });

export const loginSchema = z.object({
  email: z.email({ error: "Inserisci una mail valida" }),
  password: z.string().min(1, { error: "La password non può essere vuota" }),
});

export const passwordSchema = z
  .string()
  .min(8, { error: "Almeno 8 caratteri" })
  .max(20, { error: "Massimo 20 caratteri" })
  .refine((password) => /[A-Z]/.test(password), {
    error: "Una lettera maiuscola",
  })
  .refine((password) => /[a-z]/.test(password), {
    error: "Una lettera minuscola",
  })
  .refine((password) => /[0-9]/.test(password), {
    error: "Un numero",
  })
  .refine((password) => /[!@#$%^&*]/.test(password), {
    error: "Un carattere speciale",
  });

export const changePasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, { error: "Inserisci la conferma della password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Le password non corrispondono",
    path: ["confirmPassword"],
  });

export const profileChangePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, { error: "Inserisci la password attuale" }),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, { error: "Inserisci la conferma della password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Le password non corrispondono",
    path: ["confirmPassword"],
  });

export const signupSchema = z
  .object({
    email: z.email({ error: "Inserisci un'email valida" }),
    password: passwordSchema,
    confirmPassword: z.string(),
    name: z.string().min(2, { error: "Il nome utente è obbligatorio per creare un account" }),
    phoneNumber: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Le password non corrispondono",
    path: ["confirmPassword"],
  });

// Shared field schemas
const nameSchema = z.string().min(1);
const dateSchema = z.iso.date();
const startMinuteSchema = z.coerce
  .number({ error: "Scegli un orario valido" })
  .int({ error: "Scegli un orario valido" })
  .min(0, { error: "Scegli un orario valido" })
  .max(1439, { error: "Scegli un orario valido" })
  .transform(createMinuteOfDay);
export const offeringsFieldSchema = z
  .array(z.string().min(1))
  .min(1, { error: "Scegli almeno un servizio" });
const staffSchema = z.string().min(1);
const phoneSchema = z.string().optional();

// Base schema with common fields
const baseUserSchema = z.object({
  date: dateSchema,
  startMinute: startMinuteSchema,
  offerings: offeringsFieldSchema,
  staff: staffSchema,
});

// Schema for each user type
export const anonymousUserSchema = baseUserSchema.extend({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

export const usualUserSchema = baseUserSchema;

export const staffUserSchema = baseUserSchema.extend({
  name: nameSchema,
  phone: phoneSchema,
});

const bookingFields = {
  staff: z.string().min(1, { error: "Scegli uno staff" }),
  offerings: offeringsFieldSchema,
  date: z.iso.date({ error: "Scegli una data" }),
  startMinute: startMinuteSchema,
};

export const bookSchema = z.discriminatedUnion("who", [
  z.object({
    who: z.literal("anonymous"),
    ...bookingFields,
    name: z.string().trim().min(1, { error: "Il nome è obbligatorio" }),
    email: z
      .string()
      .trim()
      .min(1, { error: "L'email è obbligatoria" })
      .pipe(z.email({ error: "Inserisci una mail valida" })),
    phone: z.string().optional(),
  }),
  z.object({
    who: z.literal("usual"),
    ...bookingFields,
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }),
  z.object({
    who: z.literal("staff"),
    ...bookingFields,
    name: z.string().trim().min(1, { error: "Il nome è obbligatorio" }),
    email: z.string().optional(),
    phone: z.string().optional(),
  }),
]);

export const offeringSchema = z.object({
  name: z.string().min(1, { error: "Il nome è obbligatorio" }),
  description: z.string().default(""),
  duration: z.coerce
    .number({ error: "Inserisci una durata valida" })
    .min(1, { error: "La durata deve essere almeno 1 minuto" }),
  price: z.coerce
    .number({ error: "Inserisci un prezzo valido" })
    .min(0, { error: "Il prezzo non può essere negativo" }),
  active: z.boolean().default(false),
});

export const updateOfferingSchema = offeringSchema.extend({
  id: z.string().min(1),
});

export const bannerSchema = z.object({
  message: z.string().min(1),
  visible: z.boolean(),
});

export const shutdownSchema = z.object({
  start: z.iso.date(),
  end: z.iso.date(),
  staffID: z.string().min(1),
});

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const avatarSchema = z
  .string()
  .refine((v) => ACCEPTED_IMAGE_TYPES.some((t) => v.startsWith(`data:${t};base64,`)), {
    error: "Formato non supportato. Usa JPEG, PNG, WebP o GIF",
  })
  .refine((v) => v.length <= 400_000, {
    error: "Immagine troppo grande (max ~300KB)",
  });

export const avatarOriginalSchema = z
  .string()
  .refine((v) => ACCEPTED_IMAGE_TYPES.some((t) => v.startsWith(`data:${t};base64,`)), {
    error: "Formato non supportato. Usa JPEG, PNG, WebP o GIF",
  })
  .refine((v) => v.length <= 2_000_000, {
    error: "Immagine originale troppo grande",
  });

export const insertEmailVerificationSchema = z.object({
  email: emailSchema,
  userID: z.string().min(1),
});
