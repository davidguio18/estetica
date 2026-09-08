import { InvalidAuditLogError, JsonValue } from '../domain/audit-log.entity';

const FORBIDDEN_KEYS = new Set([
  'password',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'token',
  'tokenhash',
  'secret',
  'jwt',
]);

export function sanitizeAuditValue(value: JsonValue | null | undefined): JsonValue | null {
  if (value === undefined || value === null) {
    return null;
  }
  return sanitize(value, new WeakSet<object>());
}

function sanitize(value: JsonValue, seen: WeakSet<object>): JsonValue {
  if (value === null) {
    return null;
  }
  if (
    value === undefined ||
    typeof value === 'bigint' ||
    typeof value === 'function' ||
    typeof value === 'symbol'
  ) {
    throw new InvalidAuditLogError('Audit values must contain only JSON data');
  }
  if (Array.isArray(value)) {
    assertSerializableObject(value, seen);
    try {
      return value.map((item) => sanitize(item, seen));
    } finally {
      seen.delete(value);
    }
  }
  if (typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new InvalidAuditLogError('Audit values must contain valid JSON numbers');
    }
    return value;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new InvalidAuditLogError('Audit values must contain only JSON data');
  }

  assertSerializableObject(value, seen);

  try {
    const result: { [key: string]: JsonValue } = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (!FORBIDDEN_KEYS.has(normalizeKey(key))) {
        result[key] = sanitize(nestedValue, seen);
      }
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, '');
}

function assertSerializableObject(value: object, seen: WeakSet<object>): void {
  if (seen.has(value)) {
    throw new InvalidAuditLogError('Audit values must not contain circular references');
  }
  seen.add(value);
}
