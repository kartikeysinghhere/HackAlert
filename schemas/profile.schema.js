const { z } = require('zod');

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
    mobile: z.string().regex(/^[0-9+ ]+$/).optional().nullable(),
    college: z.string().max(200).optional().nullable(),
    gender: z.string().optional().nullable(),
    bio: z.string().max(500).optional().nullable(),
    skills: z.string().max(500).optional().nullable()
  })
});

module.exports = {
  updateProfileSchema
};
