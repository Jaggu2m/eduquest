/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * On failure, responds 400 with a structured list of field errors.
 * On success, replaces req.body with the parsed (coerced + stripped) data.
 *
 * Usage:
 *   router.post('/', validate(CreateOrganizationSchema), controller.create)
 *
 * @param {import('zod').ZodSchema} schema
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ message: 'Validation failed.', errors });
      return;
    }

    // Replace body with the parsed (stripped of unknown fields) data
    req.body = result.data;
    next();
  };
}
