;(() => {
  try {
    var saved = localStorage.getItem('theme')
    var system = window.matchMedia('(prefers-color-scheme: dark)').matches
    var theme = saved || (system ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } catch (e) {}
})()
