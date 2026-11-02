export const applyTheme = (themeMode) => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');

    if (themeMode === 'dark') {
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else if (themeMode === 'light') {
        root.classList.remove('dark'); // Light mode is default (no dark class)
        localStorage.setItem('theme', 'light');
    } else {
        // 'system' mode: check OS preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', 'system');
    }
};