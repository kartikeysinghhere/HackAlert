const { z } = require('zod');

const saveHackathonSchema = z.object({
  body: z.object({
    hackathon_name: z.string().min(1).max(200),
    hackathon_start: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
    hackathon_website: z.string().url("Invalid website URL")
  })
});

module.exports = {
  saveHackathonSchema
};
