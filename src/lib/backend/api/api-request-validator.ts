import { ApiError } from "./api-errors";

export type ValidationPath = Array<string | number>;

export type ApiValidationIssue = {
  path: ValidationPath;
  code: string;
  message: string;
};

export type ApiRequestValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: ApiValidationIssue[] };

export type ApiRequestValidator<T> = (
  value: unknown,
) => ApiRequestValidationResult<T>;

export function createRequestValidator<T>(
  validator: ApiRequestValidator<T>,
): ApiRequestValidator<T> {
  return validator;
}

export function assertValidRequest<T>(
  validator: ApiRequestValidator<T> | undefined,
  value: unknown,
): T {
  if (!validator) {
    return value as T;
  }

  const result = validator(value);

  if (result.ok) {
    return result.data;
  }

  throw new ApiError("VALIDATION_FAILED", "Request validation failed.", 400, {
    issues: result.issues.map((issue) => ({
      code: issue.code,
      message: sanitizeValidationMessage(issue.message),
      path: issue.path,
    })),
  });
}

export function validationIssue(
  path: ValidationPath,
  code: string,
  message: string,
): ApiValidationIssue {
  return {
    code,
    message: sanitizeValidationMessage(message),
    path,
  };
}

function sanitizeValidationMessage(message: string) {
  return message.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 240);
}
