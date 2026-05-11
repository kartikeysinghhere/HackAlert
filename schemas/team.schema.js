const { z } = require('zod');

const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100),
    description: z.string().max(1000).optional().nullable(),
    hackathon_name: z.string().max(200).optional().nullable(),
    max_members: z.number().int().min(2).max(10).optional().default(4),
    required_skills: z.string().max(500).optional().nullable()
  })
});

const joinTeamSchema = z.object({
  body: z.object({
    team_id: z.string().uuid("Invalid team ID")
  })
});

const messageSchema = z.object({
  body: z.object({
    message: z.string().min(1, "Message cannot be empty").max(2000)
  })
});

const dmSchema = z.object({
  body: z.object({
    message: z.string().min(1, "Message cannot be empty").max(2000)
  }),
  params: z.object({
    partner_email: z.string().email("Invalid partner email")
  })
});

module.exports = {
  createTeamSchema,
  joinTeamSchema,
  messageSchema,
  dmSchema
};
