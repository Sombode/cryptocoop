import App from './App.svelte';
import 'sweetalert2/dist/sweetalert2.min.css';

const app = new App({
  target: document.body,
});

export default app;

// recreate the whole app if an HMR update touches this module
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.$destroy();
  });
  import.meta.hot.accept();
}
