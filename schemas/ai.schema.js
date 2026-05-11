const { z } = require('zod');

const aiIdeasSchema = z.object({
  body: z.object({
    theme: z.string().min(2, "Theme is too short").max(200),
    problem: z.string().max(1000).optional().nullable(),
    level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']).optional().default('Beginner'),
    duration: z.string().max(50).optional().nullable(),
    skills: z.string().max(500).optional().nullable()
  })
});

const aiAnalyzeSchema = z.object({
  body: z.object({
    name: z.string().max(200).optional().nullable(),
    details: z.string().min(10, "Details are too short").max(5000),
    skills: z.string().max(500).optional().nullable()
  })
});

const askBotSchema = z.object({
  body: z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1).max(2000)
    })).min(1)
  })
});

module.exports = {
  aiIdeasSchema,
  aiAnalyzeSchema,
  askBotSchema
};
