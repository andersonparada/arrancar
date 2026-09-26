import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { enrutador } from './enrutador';
import { usarApariencia } from './modulos/core/almacenes/apariencia';
import { vPermiso } from './modulos/core/directivas/permiso';
import './estilos.css';

const oscuro = window.matchMedia('(prefers-color-scheme: dark)');
const aplicarModoOscuro = () => document.documentElement.classList.toggle('oscuro', oscuro.matches);
aplicarModoOscuro();
oscuro.addEventListener('change', aplicarModoOscuro);

const pinia = createPinia();
void usarApariencia(pinia).cargar();

createApp(App).use(pinia).use(enrutador).directive('permiso', vPermiso).mount('#app');
