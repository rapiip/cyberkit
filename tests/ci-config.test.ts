import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';

/**
 * Guards the CI configuration itself.
 *
 * The workflow was invalid YAML for its entire history: the plain scalar
 *
 *   run: npx license-checker ... || echo 'Warning: Restrictive licenses found'
 *
 * contains ": ", which terminates a plain scalar, so GitHub could not build the
 * job graph. 51 consecutive runs completed as failures with zero jobs, meaning
 * lint, typecheck, tests, build, audit, TruffleHog and CodeQL never actually ran.
 * Nothing in the repository noticed, so these assertions exist to notice.
 */

interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
}

interface WorkflowJob {
  'runs-on'?: string;
  steps?: WorkflowStep[];
}

interface Workflow {
  name?: string;
  on?: Record<string, unknown>;
  jobs?: Record<string, WorkflowJob>;
}

async function loadYaml<T>(path: string): Promise<T> {
  let text = await readFile(path, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return yaml.load(text) as T;
}

test('the CI workflow is parseable and builds a real job graph', async () => {
  const workflow = await loadYaml<Workflow>('.github/workflows/ci.yml');

  // A missing name is how GitHub ends up displaying the file path instead.
  assert.equal(typeof workflow.name, 'string');
  assert.ok(workflow.name && workflow.name.length > 0, 'the workflow needs a name');

  assert.ok(workflow.on, 'the workflow needs triggers');
  assert.ok('push' in workflow.on!, 'must run on push');
  assert.ok('pull_request' in workflow.on!, 'must run on pull_request');

  const jobs = workflow.jobs ?? {};
  const jobNames = Object.keys(jobs);
  assert.ok(jobNames.length > 0, 'a workflow with zero jobs silently checks nothing');

  for (const [jobName, job] of Object.entries(jobs)) {
    assert.ok(job['runs-on'], `${jobName} needs runs-on`);
    const steps = job.steps ?? [];
    assert.ok(steps.length > 0, `${jobName} has no steps`);
    for (const step of steps) {
      assert.ok(step.uses || step.run, `${jobName} step "${step.name ?? '?'}" does nothing`);
    }
  }
});

test('CI runs the full verification pipeline', async () => {
  const workflow = await loadYaml<Workflow>('.github/workflows/ci.yml');
  const jobs = workflow.jobs ?? {};

  const commands = Object.values(jobs)
    .flatMap((job) => job.steps ?? [])
    .map((step) => step.run ?? '')
    .join('\n');

  for (const expected of ['npm run lint', 'npm run typecheck', 'npm test', 'npm run build', 'npm audit']) {
    assert.ok(commands.includes(expected), `CI must run ${expected}`);
  }
  assert.ok(commands.includes('npm run test:e2e'), 'CI must run the end-to-end suite');

  // The E2E job serves the production output, so it has to build first.
  const e2e = jobs.e2e;
  assert.ok(e2e, 'an e2e job must exist');
  const e2eRuns = (e2e.steps ?? []).map((step) => step.run ?? '');
  const buildIndex = e2eRuns.findIndex((command) => command.includes('npm run build'));
  const testIndex = e2eRuns.findIndex((command) => command.includes('npm run test:e2e'));
  assert.ok(buildIndex >= 0 && testIndex >= 0, 'the e2e job must build and then test');
  assert.ok(buildIndex < testIndex, 'the build must happen before the e2e run');
});

test('no CI action is pinned to a mutable branch', async () => {
  const workflow = await loadYaml<Workflow>('.github/workflows/ci.yml');
  const uses = Object.values(workflow.jobs ?? {})
    .flatMap((job) => job.steps ?? [])
    .map((step) => step.uses)
    .filter((value): value is string => typeof value === 'string');

  assert.ok(uses.length > 0, 'expected the workflow to use actions');

  // A branch ref means the action's contents can change between runs while it
  // has access to the repository checkout.
  const mutable = uses.filter((value) => /@(main|master|latest|HEAD)$/.test(value));
  assert.deepEqual(mutable, [], `actions pinned to a branch: ${mutable.join(', ')}`);

  // Third-party actions must be pinned to a commit SHA. First-party actions/* and
  // github/* are allowed to use release tags.
  const thirdParty = uses.filter(
    (value) => !value.startsWith('actions/') && !value.startsWith('github/')
  );
  for (const value of thirdParty) {
    assert.match(
      value,
      /@[0-9a-f]{40}$/,
      `${value} is third-party and must be pinned to a commit SHA`
    );
  }
});

test('Dependabot keeps version updates grouped and watches the CI actions', async () => {
  const config = await loadYaml<{
    updates?: Array<{
      'package-ecosystem'?: string;
      groups?: Record<string, unknown>;
      'open-pull-requests-limit'?: number;
    }>;
  }>('.github/dependabot.yml');

  const updates = config.updates ?? [];
  const ecosystems = updates.map((entry) => entry['package-ecosystem']);
  assert.ok(ecosystems.includes('npm'), 'npm dependencies must be watched');
  // The workflow actions run with access to the checkout, so they need watching too.
  assert.ok(ecosystems.includes('github-actions'), 'CI actions must be watched');

  const npm = updates.find((entry) => entry['package-ecosystem'] === 'npm');
  assert.ok(npm);
  const groups = Object.keys(npm.groups ?? {});
  // Ungrouped majors opened one pull request each; they piled up and went stale.
  assert.ok(groups.length >= 2, `expected minor/patch and major groups, saw: ${groups.join(', ')}`);
});
