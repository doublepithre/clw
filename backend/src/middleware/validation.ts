import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = formatZodError(result.error);
      res.status(400).json({ message: 'Validation error', errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = formatZodError(result.error);
      res.status(400).json({ message: 'Validation error', errors });
      return;
    }
    req.query = result.data;
    next();
  };
}

function formatZodError(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!formatted[path]) formatted[path] = [];
    formatted[path].push(issue.message);
  }
  return formatted;
}
