import Sidebar from '@/components/layout/Sidebar';
import CommandPalette from '@/components/layout/CommandPalette';

/**
 * Application shell for every console route.
 *
 * This is a nested layout: the surrounding `<html>`/`<body>` elements are owned
 * by `src/app/layout.tsx`.
 */
export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <main id="main-content" className="flex-1 min-h-screen overflow-x-hidden pt-14 md:pt-0">
        {children}
      </main>
      <CommandPalette />
    </div>
  );
}
