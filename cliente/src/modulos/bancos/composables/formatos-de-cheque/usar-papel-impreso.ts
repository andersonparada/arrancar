import { onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';

/**
 * Mientras la pantalla está abierta, el navegador imprime con la regla de página que se le dé (`@page` con el tamaño del
 * papel y sin márgenes) y el diseño principal no le agrega relleno a la hoja (clase `impresion-exacta`, ver
 * `estilos.css`). Al salir se quitan las dos cosas, para que las demás pantallas impriman como siempre.
 */
export function usarPapelImpreso(reglas: () => string): void {
  const estilo = document.createElement('style');
  estilo.dataset.papelDelCheque = '';
  document.head.append(estilo);
  document.documentElement.classList.add('impresion-exacta');
  watchEffect(() => (estilo.textContent = reglas()));
  onBeforeUnmount(() => {
    estilo.remove();
    document.documentElement.classList.remove('impresion-exacta');
  });
}

/** El ancho en píxeles del elemento, que se actualiza al cambiar de tamaño la ventana (para dibujar a escala). */
export function usarAnchoDisponible() {
  const elemento = ref<HTMLElement | null>(null);
  const ancho = ref(0);
  let observador: ResizeObserver | null = null;
  onMounted(() => {
    if (!elemento.value || typeof ResizeObserver === 'undefined') return;
    ancho.value = elemento.value.clientWidth;
    observador = new ResizeObserver(() => (ancho.value = elemento.value?.clientWidth ?? 0));
    observador.observe(elemento.value);
  });
  onBeforeUnmount(() => observador?.disconnect());
  return { elemento, ancho };
}
