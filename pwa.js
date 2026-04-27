const THEME_STORAGE_KEY = "controle-financeiro-theme-v1";

function applyTheme(theme) {
  const safeTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = safeTheme;
  document.documentElement.style.colorScheme = safeTheme;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", safeTheme === "dark" ? "#0b1714" : "#0d8b72");
  }
}

function updateThemeButton(button) {
  const isDark = document.documentElement.dataset.theme === "dark";
  button.innerHTML = isDark
    ? '<span class="theme-icon" aria-hidden="true">&#9728;</span><span class="theme-label">Modo claro</span>'
    : '<span class="theme-icon" aria-hidden="true">&#9790;</span><span class="theme-label">Modo dark</span>';
  button.setAttribute("aria-pressed", String(isDark));
}

applyTheme(localStorage.getItem(THEME_STORAGE_KEY));

window.addEventListener("DOMContentLoaded", () => {
  const themeButton = document.querySelector("#themeToggleButton");
  if (!themeButton) {
    return;
  }

  updateThemeButton(themeButton);
  themeButton.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    updateThemeButton(themeButton);
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Nao foi possivel ativar o modo app.", error);
    });
  });
}
