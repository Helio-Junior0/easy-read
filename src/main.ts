import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { popularBancoSeVazio } from './services/seedService';
import './style.css';

const app = createApp(App);

app.use(router);

popularBancoSeVazio().then(() => {
  app.mount('#app');
});