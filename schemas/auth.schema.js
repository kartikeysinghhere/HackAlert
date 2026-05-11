const { z } = require('zod');

const signupSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email format"),
    pass: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
    username: z.string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be at most 20 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    mobile: z.string().regex(/^[0-9+ ]+$/, "Invalid phone number format").optional().nullable(),
    college: z.string().max(200).optional().nullable(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say', 'Male', 'Female', 'Other']).optional().nullable(),
    bio: z.string().max(500).optional().nullable(),
    skills: z.string().max(500).optional().nullable()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    pass: z.string().min(1, "Password is required")
  })
});

module.exports = {
  signupSchema,
  loginSchema
};
