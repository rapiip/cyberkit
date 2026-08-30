import LandingClient from './LandingClient';
import { catalogStats } from '@/lib/tools/catalog-stats';

/**
 * Server Component wrapper so the catalogue figures are derived from the
 * registries at build time and the tool metadata module never reaches the
 * client bundle.
 */
export default function Page() {
  return <LandingClient stats={catalogStats} />;
}
