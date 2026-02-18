/**
 * Environment variable utilities with type-safe access
 */

export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value !== undefined) {
    return value;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Missing required environment variable: ${key}`);
}

export function getEnvOptional(key: string): string | undefined {
  return process.env[key];
}

export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value !== undefined) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Missing required environment variable: ${key}`);
}

export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value !== undefined) {
    return value.toLowerCase() === 'true';
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  return false;
}
