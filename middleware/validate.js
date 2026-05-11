const { ZodError } = require('zod');

/**
 * Reusable Zod validation middleware
 * Validates request body, params, and query against a Zod schema.
 */
const validate = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Update req with validated/parsed data (e.g. defaults from zod)
    req.body = validated.body;
    req.query = validated.query;
    req.params = validated.params;

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues || error.errors || [];
      return res.status(400).json({
        error: 'Validation failed',
        details: issues.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(error);
  }
};

module.exports = { validate };
