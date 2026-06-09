import ToolClient from './ToolClient';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ToolClient slug={slug} />;
}
