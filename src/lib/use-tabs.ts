import "./use-tabs.css";

// reference: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tab_role

export function useTabs(tabList: HTMLElement) {
  const tabs = tabList.querySelectorAll<HTMLElement>(':scope > [role="tab"]');

  // Add a click event handler to each tab
  tabs.forEach((tab) => {
    tab.addEventListener("click", changeTabs);
  });

  // Enable arrow navigation between tabs in the tab list
  let tabFocus = 0;

  tabList.addEventListener("keydown", (e) => {
    // Move right
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      tabs[tabFocus].tabIndex = -1;
      if (e.key === "ArrowRight") {
        tabFocus++;
        // If we're at the end, go to the start
        if (tabFocus >= tabs.length) {
          tabFocus = 0;
        }
        // Move left
      } else if (e.key === "ArrowLeft") {
        tabFocus--;
        // If we're at the start, move to the end
        if (tabFocus < 0) {
          tabFocus = tabs.length - 1;
        }
      }

      tabs[tabFocus].tabIndex = 0;
      tabs[tabFocus].focus();
    }
  });

  function changeTabs(e: KeyboardEvent | MouseEvent) {
    const targetTab = e.target as HTMLElement;
    tabs.forEach((t) => {
      t.setAttribute("aria-selected", (t === targetTab).toString());

      const tabPanel = document.querySelector<HTMLElement>(`#${t.getAttribute("aria-controls")}`)!;
      tabPanel.toggleAttribute("hidden", t !== targetTab);
    });
  }
}
