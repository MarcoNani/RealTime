document.addEventListener('DOMContentLoaded', () => {
  const content = document.querySelector('.content');
  const bottomToolbar = document.querySelector('.bottom-toolbar');

  function adjustContentMargin() {
    const toolbarHeight = bottomToolbar.offsetHeight;
    content.style.marginBottom = `${toolbarHeight}px`;
  }

  // Regola il margine iniziale
  adjustContentMargin();

  // Rileva il ridimensionamento della finestra
  window.addEventListener('resize', adjustContentMargin);
});
