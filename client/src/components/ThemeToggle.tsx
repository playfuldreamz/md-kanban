'use client';

import { useTheme } from '@appica/ui-react/hooks/use-theme';
import { Button } from '@appica/ui-react/button';
import { SunHigh, MoonStars, DeviceDesktop } from '@appica/icons-react';

/** Three-way theme toggle: system → light → dark → system */
export default function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) {
    return <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" />;
  }

  const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
  const label = theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark';
  const icon =
    theme === 'system' ? <DeviceDesktop className="w-4 h-4" /> :
    theme === 'dark' ? <MoonStars className="w-4 h-4" /> :
    <SunHigh className="w-4 h-4" />;

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Theme: ${label}. Click for ${next === 'system' ? 'system' : next} mode.`}
      onClick={() => setTheme(next)}
      title={`${label} — click to switch`}
    >
      {icon}
    </Button>
  );
}
