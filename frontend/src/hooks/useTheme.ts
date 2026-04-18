import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('crmwp-theme') as Theme | null) ?? 'dark';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('crmwp-theme', theme);
  }, [theme]);

  function toggle() {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return { theme, toggle };
}
