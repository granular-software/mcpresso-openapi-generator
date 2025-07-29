/**
 * Convert a string to camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toLowerCase());
}

/**
 * Convert a string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s/g, '');
}

/**
 * Convert a string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[-_\s]+/g, '_')
    .replace(/_$/, '');
}

/**
 * Convert a string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[-_\s]+/g, '-');
}

/**
 * Convert a string to a valid JavaScript identifier
 */
export function toValidIdentifier(name: string): string {
  return name
    .replace(/[{}]/g, '') // Remove curly braces
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace other special chars with underscore
    .replace(/^[0-9]/, '_$&') // Ensure it doesn't start with a number
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Extract reference name from a schema reference
 */
export function extractRefName(ref: string): string {
  const parts = ref.split('/');
  const lastPart = parts[parts.length - 1];
  return lastPart.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Escape a string for use in template literals
 */
export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

/**
 * Clean a description string for use in code
 */
export function cleanDescription(description: string): string {
  return description
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
    .replace(/`([^`]+)`/g, '$1') // Remove backticks
    .trim();
} 