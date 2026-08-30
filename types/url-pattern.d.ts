/**
 * Ambient declarations for the URLPattern API.
 *
 * Next.js 16.3 ships `next/dist/server/web/spec-extension/url-pattern.d.ts`,
 * which references the `URLPattern`, `URLPatternInput` and `URLPatternOptions`
 * globals. TypeScript 5.9's `lib.dom.d.ts` does not declare them yet, so with
 * `skipLibCheck: false` the typecheck fails inside node_modules.
 *
 * Declaring them here keeps strict dependency type checking enabled instead of
 * turning `skipLibCheck` on. Remove this file once the TypeScript DOM lib ships
 * URLPattern.
 *
 * Shape follows the URL Pattern Standard: https://urlpattern.spec.whatwg.org/
 */

interface URLPatternInit {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  baseURL?: string;
}

type URLPatternInput = string | URLPatternInit;

interface URLPatternOptions {
  ignoreCase?: boolean;
}

interface URLPatternComponentResult {
  input: string;
  groups: Record<string, string | undefined>;
}

interface URLPatternResult {
  inputs: [URLPatternInput] | [URLPatternInput, string];
  protocol: URLPatternComponentResult;
  username: URLPatternComponentResult;
  password: URLPatternComponentResult;
  hostname: URLPatternComponentResult;
  port: URLPatternComponentResult;
  pathname: URLPatternComponentResult;
  search: URLPatternComponentResult;
  hash: URLPatternComponentResult;
}

interface URLPattern {
  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly hasRegExpGroups: boolean;
  test(input?: URLPatternInput, baseURL?: string): boolean;
  exec(input?: URLPatternInput, baseURL?: string): URLPatternResult | null;
}

// `declare var` is the convention for ambient globals: it lets this declaration
// merge with TypeScript's own once lib.dom.d.ts ships URLPattern, instead of
// producing a duplicate-identifier error. `let`/`const` cannot merge.
// eslint-disable-next-line no-var
declare var URLPattern: {
  prototype: URLPattern;
  new (input: URLPatternInput, baseURL: string | URL, options?: URLPatternOptions): URLPattern;
  new (input?: URLPatternInput, options?: URLPatternOptions): URLPattern;
};
