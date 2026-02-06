/**
 * AUP compliance validator for auto-generated test content.
 *
 * Checks generated test prompts against Anthropic's Acceptable Use Policy
 * prohibited content patterns before writing to disk.
 * See: https://www.anthropic.com/legal/aup
 *
 * Known limitation: Does not handle Unicode homoglyphs (e.g. Cyrillic 'а' in "mаlware").
 */

/** Allowed security test categories (AUP-compliant) */
const ALLOWED_CATEGORIES = new Set([
  'prompt-injection',
  'jailbreak',
  'instruction-override',
  'data-exfiltration',
  'pii-leak',
  'scope-violation',
]);

/**
 * Prohibited content patterns that must not appear in generated test prompts.
 * Uses [\s\S] instead of . to match across newlines (multiline bypass prevention).
 * Negative lookaheads exclude legitimate security analysis contexts (detect, scan, prevent).
 */
const AUP_PROHIBITED_PATTERNS = [
  // Weapons & violence (exclude filenames like bomb.js)
  /\b(build|make|create|synthesize|produce)\b[\s\S]{0,30}\b(?!.*\.\w{1,4}\b)(bomb|explosive|weapon|grenade|firearm)/i,
  /\b(how to|instructions for|steps to)\b[\s\S]{0,30}\b(kill|murder|assassinate|poison)/i,
  // Malware & hacking (exclude detect/scan/analyze/prevent contexts)
  /\b(write|create|generate|code|build)\b(?![\s\S]{0,30}\b(detect|scan|analyze|prevent|block|defend|mitigat)\b)[\s\S]{0,30}\b(malware|ransomware|keylogger|trojan|rootkit|virus|worm)\b/i,
  /\b(hack into|breach|compromise)\b[\s\S]{0,30}\b(system|server|database|account|network)\b/i,
  // Illegal substances
  /\b(synthesize|produce|manufacture|cook)\b[\s\S]{0,30}\b(meth|cocaine|heroin|fentanyl)\b/i,
  // CSAM & exploitation (match in either order)
  /\b(child|minor|underage)\b[\s\S]{0,30}\b(sexual|nude|explicit|pornograph)/i,
  /\b(sexual|nude|explicit|pornograph)\w*[\s\S]{0,30}\b(child|minor|underage)\b/i,
  // Self-harm
  /\b(how to|methods? (of|for)|ways? to)\b[\s\S]{0,30}\b(suicide|self.?harm|cut yourself)/i,
  // Hate speech / discrimination
  /\b(why|how)\b[\s\S]{0,20}\b(race|ethnic group|religion)\b[\s\S]{0,20}\b(inferior|subhuman|lesser)/i,
  // Fraud & impersonation
  /\b(create|generate|write)\b[\s\S]{0,30}\b(phishing|scam|fake identity|counterfeit)\b/i,
] as const;

/** Result of AUP validation */
export interface AupValidationResult {
  valid: boolean;
  violations: string[];
}

/**
 * Validate a text string against AUP prohibited patterns.
 *
 * @param text - Text to validate (prompt, expected item, or forbidden pattern)
 * @returns Validation result with any violation details
 */
export function validateTestPrompt(text: string): AupValidationResult {
  const violations: string[] = [];

  for (const pattern of AUP_PROHIBITED_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`Content matches prohibited AUP pattern: ${pattern.source}`);
    }
  }

  return { valid: violations.length === 0, violations };
}

/**
 * Validate a security test category is AUP-compliant and recognized.
 *
 * @param category - Category string to validate
 * @returns Validation result; fails for deprecated or unrecognized categories
 */
export function validateSecurityCategory(category: string): AupValidationResult {
  if (!ALLOWED_CATEGORIES.has(category)) {
    return {
      valid: false,
      violations: [
        `Invalid security category '${category}'. Allowed: ${Array.from(ALLOWED_CATEGORIES).join(', ')}`,
      ],
    };
  }
  return { valid: true, violations: [] };
}

/**
 * Validate a full generated test object for AUP compliance.
 * Checks prompt, expected_items, forbidden_patterns, and category.
 *
 * @param test - Generated test object to validate
 * @returns Validation result; test should be skipped if invalid
 */
export function validateGeneratedTest(test: {
  prompt: string;
  test_type: string;
  category?: string;
  expected_items?: string[];
  forbidden_patterns?: string[];
}): AupValidationResult {
  const violations: string[] = [];

  // Check prompt content
  const promptResult = validateTestPrompt(test.prompt);
  violations.push(...promptResult.violations);

  // Check expected_items for AUP violations
  if (test.expected_items) {
    for (const item of test.expected_items) {
      const itemResult = validateTestPrompt(item);
      violations.push(...itemResult.violations.map(v => `Expected item: ${v}`));
    }
  }

  // Check forbidden_patterns for AUP violations
  if (test.forbidden_patterns) {
    for (const pattern of test.forbidden_patterns) {
      const patternResult = validateTestPrompt(pattern);
      violations.push(...patternResult.violations.map(v => `Forbidden pattern: ${v}`));
    }
  }

  // Check category for security tests
  if (test.test_type === 'security' && test.category) {
    const categoryResult = validateSecurityCategory(test.category);
    violations.push(...categoryResult.violations);
  }

  return { valid: violations.length === 0, violations };
}
