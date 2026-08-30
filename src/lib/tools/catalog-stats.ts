import { allToolMetadata } from './metadata';
import { categories } from './categories';
import { workspaceRegistry } from './workspaces';
import { securityLabs } from '@/lib/labs';

export interface CatalogStats {
  workspaces: number;
  tools: number;
  categories: number;
  labs: number;
}

/**
 * Catalogue figures derived from the registries.
 *
 * The landing page used to advertise hardcoded values ("40+ Security Tools",
 * "9 Categories") that drifted from the actual catalogue. Import this from a
 * Server Component so the metadata module stays out of the client bundle.
 *
 * `categories` counts only categories that own at least one tool: the registry
 * declares a `labs` category that holds no tools, and Security Labs are counted
 * separately.
 */
export const catalogStats: CatalogStats = {
  workspaces: workspaceRegistry.length,
  tools: allToolMetadata.length,
  categories: categories.filter((category) =>
    allToolMetadata.some((tool) => tool.category === category.id)
  ).length,
  labs: securityLabs.length,
};
