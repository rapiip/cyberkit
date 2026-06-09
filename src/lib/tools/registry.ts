import type { ToolDefinition } from './types';
import { encodingTools } from './encoding';
import { hashingTools } from './hashing';
import { networkTools } from './network';
import { webSecurityTools } from './web-security';
import { forensicsTools } from './forensics';
import { osintTools } from './osint';
import { ctfTools } from './ctf';
import { dnsTools } from './dns';

export const allTools: ToolDefinition[] = [
  ...webSecurityTools,
  ...dnsTools,
  ...networkTools,
  ...encodingTools,
  ...hashingTools,
  ...forensicsTools,
  ...osintTools,
  ...ctfTools,
];

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return allTools.find((t) => t.slug === slug);
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return allTools.filter((t) => t.category === category);
}

export function getFeaturedTools(): ToolDefinition[] {
  return allTools.filter((t) => t.isFeatured);
}

export function searchTools(query: string): ToolDefinition[] {
  const q = query.toLowerCase().trim();
  if (!q) return allTools;
  return allTools.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.shortDescription.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q)) ||
      t.category.includes(q)
  );
}

export { allTools as tools };
