import { z } from "zod";

export const emailSchema = z.string().email({ message: "Inserisci una mail valida" });

export const loginSchema = z.object({
	email: z.string().email({ message: "Inserisci una mail valida" }),
	password: z.string().min(1, { message: "La password non può essere vuota" }),
});

export const passwordSchema = z
	.string()
	.min(8, { message: "Minimo 8 caratteri" })
	.max(20, { message: "Massimo 20 caratteri" })
	.refine((password) => /[A-Z]/.test(password), {
		message: "Un elemento uppercase",
	})
	.refine((password) => /[a-z]/.test(password), {
		message: "Un elemento lowercase",
	})
	.refine((password) => /[0-9]/.test(password), { message: "Almeno un numero" })
	.refine((password) => /[!@#$%^&*]/.test(password), {
		message: "Un carattere speciale",
	});

export const confirmPasswordSchema = z.string().refine((confirmPassword) => confirmPassword, {
	message: "Le password non coincidono",
});

export const signupSchema = z
	.object({
		email: z.string().email({ message: "Inserisci un'email valida" }),
		password: passwordSchema,
		confirmPassword: z.string(),
		name: z.string().min(2, { message: "Il nome utente è obbligatorio per creare un account" }),
		phoneNumber: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Le password non corrispondono",
		path: ["confirmPassword"],
	});

// Shared field schemas
const nameSchema = z.string().min(1);
const dateSchema = z.string().date();
const hourSchema = z.string().min(1);
const kindSchema = z.string().min(1);
const staffSchema = z.string().min(1);
const phoneSchema = z.string().optional();

// Base schema with common fields
const baseUserSchema = z.object({
	date: dateSchema,
	hour: hourSchema,
	kind: kindSchema,
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
	name: z.string(),
	phone: phoneSchema,
});
