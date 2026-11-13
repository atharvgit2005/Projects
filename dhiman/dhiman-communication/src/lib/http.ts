import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status });
}

function isDuplicateKeyError(
  error: unknown,
): error is { code: number; keyPattern?: Record<string, number>; keyValue?: Record<string, unknown> } {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

function isMongooseValidationError(
  error: unknown,
): error is { name: string; errors?: Record<string, { message?: string }> } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ValidationError"
  );
}

function isMongooseCastError(
  error: unknown,
): error is { name: string; path?: string; value?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "CastError"
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    return fail(error.message, error.status);
  }

  if (error instanceof ZodError) {
    return fail("Validation failed", 422, error.flatten());
  }

  if (isDuplicateKeyError(error)) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? "field";
    const value = error.keyValue?.[field];
    return fail("Duplicate value", 409, {
      field,
      value,
      message: `${field} must be unique`,
    });
  }

  if (isMongooseValidationError(error)) {
    const fieldErrors = Object.fromEntries(
      Object.entries(error.errors ?? {}).map(([field, issue]) => [field, [issue.message || "Invalid value"]]),
    );
    return fail("Validation failed", 422, {
      formErrors: [],
      fieldErrors,
    });
  }

  if (isMongooseCastError(error)) {
    return fail("Invalid identifier", 400, {
      field: error.path ?? "id",
      value: error.value,
    });
  }

  console.error(error);
  return fail("Something went wrong", 500);
}
