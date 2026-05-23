function createSidebarStore() {
  let collapsed = $state(false);
  let mobileOpen = $state(false);

  return {
    get collapsed() { return collapsed; },
    get mobileOpen() { return mobileOpen; },
    toggle() { collapsed = !collapsed; },
    toggleMobile() { mobileOpen = !mobileOpen; },
    closeMobile() { mobileOpen = false; },
    collapse() { collapsed = true; },
    expand() { collapsed = false; }
  };
}

export const sidebar = createSidebarStore();
