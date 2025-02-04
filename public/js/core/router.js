export function createRouter(routes) {
    function navigate(path) {
        const container = document.getElementById('app'); 
        if (!container) return;
        
          container.innerHTML = ''; 
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
  