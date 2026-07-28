'use client';

import { useTheme } from '@appica/ui-react/hooks/use-theme';
import { Button } from '@appica/ui-react/button';
import { SunHigh, MoonStars } from '@appica/icons-react';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme, mounted } = useTheme();

  if (!mounted) {
    return <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" />;
  }

  const next = resolvedTheme === 'dark' ? 'light' : 'dark';
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(next)}
    >
      {resolvedTheme === 'dark' ? (
        <MoonStars className="w-4 h-4" />
      ) : (
        <SunHigh className="w-4 h-4" />
      )}
    </Button>
  );
}
