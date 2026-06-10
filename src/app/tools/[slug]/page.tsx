import ToolClient from './ToolClient';
import { allToolMetadata, getToolMetadataBySlug } from '@/lib/tools/metadata';
import { getCategoryById } from '@/lib/tools/categories';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return allToolMetadata.map((tool) => ({ slug: tool.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
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
