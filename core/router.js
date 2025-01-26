export function createRouter(routes) {
    function navigate(path) {
      window.history.pushState({}, path, window.location.origin + path);
      const route = routes[path];
      if (route) {
        route();
      }
    }
    window.onpopstate = () => {
      const path = window.location.pathname;
      const route = routes[path];
      if (route) {
        route();
      }
    };
    return { navigate };
  }