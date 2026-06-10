import type { Metadata } from 'next';
import ToolClient from './ToolClient';
import { allToolMetadata, getToolMetadataBySlug } from '@/lib/tools/metadata';
import { getCategoryById } from '@/lib/tools/categories';
import { notFound } from 'next/navigation';

type ToolPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allToolMetadata.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolMetadataBySlug(slug);
  if (!tool) notFound();

  const categoryName = getCategoryById(tool.category)?.name || 'Cybersecurity';

  return {
    title: tool.name,
    description: tool.shortDescription || tool.description,
    keywords: [tool.name, tool.category, categoryName, tool.difficulty, tool.executionType],
    alternates: {
      canonical: `/tools/${tool.slug}`,
    },
    openGraph: {
      title: `${tool.name} - CyberKit`,
      description: tool.shortDescription || tool.description,
      url: `/tools/${tool.slug}`,
      type: 'website',
    },
  };
}

export default async function Page({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = getToolMetadataBySlug(slug);
  if (!tool) notFound();

  const relatedTools = allToolMetadata
    .filter((item) => item.category === tool.category && item.id !== tool.id)
    .slice(0, 4);

  return (
    <ToolClient
      tool={tool}
      relatedTools={relatedTools}
      categoryName={getCategoryById(tool.category)?.name || 'Related'}
    />
  );
}
