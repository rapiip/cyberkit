/**
 * Security Labs registry.
 *
 * Labs are intentionally separate from the tool registry: they are experimental
 * teaching sandboxes rather than analysis capabilities, and they run entirely
 * against local simulated targets. Keeping the list here lets the labs page and
 * the landing page derive their content from one source instead of hardcoding
 * counts.
 */
export interface LabDefinition {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  /** Tailwind classes for the difficulty badge. */
  accentClass: string;
  topics: string[];
}

export const securityLabs: LabDefinition[] = [
  {
    id: 'sql-injection',
    name: 'SQL Injection Lab',
    description:
      'Study why unsafe query construction breaks authentication in a contained simulator, then compare it with parameterized query defenses.',
    difficulty: 'Intermediate',
    accentClass: 'border-cyber-red/30 bg-cyber-red/10 text-cyber-red',
    topics: ['Authentication Bypass', 'UNION-based', 'Error-based', 'Parameterized Queries'],
  },
  {
    id: 'xss',
    name: 'XSS Lab',
    description:
      'Study how unsafe output rendering creates client-side risk in a sandbox, with emphasis on encoding, CSP, and cookie hardening.',
    difficulty: 'Intermediate',
    accentClass: 'border-cyber-amber/30 bg-cyber-amber/10 text-cyber-amber',
    topics: ['Reflected XSS', 'DOM-based XSS', 'Input Sanitization', 'Content Security Policy'],
  },
  {
    id: 'auth-bypass',
    name: 'Authentication Bypass Lab',
    description:
      'Review authentication logic flaws in a local-only simulation and learn how prepared statements keep credential checks intact.',
    difficulty: 'Intermediate',
    accentClass: 'border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan',
    topics: ['Authentication Bypass', 'Login Flaws', 'Prepared Statements'],
  },
  {
    id: 'csrf',
    name: 'CSRF Concept Demo',
    description:
      'Visualize how cookie-only state-changing requests can fail without CSRF tokens, SameSite cookies, and request verification.',
    difficulty: 'Intermediate',
    accentClass: 'border-cyber-pink/30 bg-cyber-pink/10 text-cyber-pink',
    topics: ['Cross-Site Request Forgery', 'SameSite Cookies', 'Anti-CSRF Tokens'],
  },
];

export function getLabById(id: string) {
  return securityLabs.find((lab) => lab.id === id);
}
