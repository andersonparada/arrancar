import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

interface EstiloFlotante {
  position: 'fixed';
  top: string;
  left: string;
  width: string;
}

/** Dónde poner el panel, justo debajo del campo y con su mismo ancho. */
function calcularEstilo(ancla: HTMLElement): EstiloFlotante {
  const rectangulo = ancla.getBoundingClientRect();
  return {
    position: 'fixed',
    top: `${rectangulo.bottom + 4}px`,
    left: `${rectangulo.left}px`,
    width: `${rectangulo.width}px`,
  };
}

/**
 * La posición en pantalla de un panel flotante anclado a un campo, calculada con
 * `position: fixed` para que se vea por encima de todo aunque el campo esté dentro
 * de un contenedor que recorta su contenido (p. ej. `VentanaModal`).
 */
export function usarPosicionFlotante(ancla: Ref<HTMLElement | null>, visible: Ref<boolean>) {
  const estilo = ref<EstiloFlotante | null>(null);

  function actualizar(): void {
    if (ancla.value) estilo.value = calcularEstilo(ancla.value);
  }

  function alDesplazarOCambiarTamano(): void {
    if (visible.value) actualizar();
  }

  watch(visible, (esVisible) => {
    if (esVisible) actualizar();
  });

  window.addEventListener('scroll', alDesplazarOCambiarTamano, true);
  window.addEventListener('resize', alDesplazarOCambiarTamano);
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', alDesplazarOCambiarTamano, true);
    window.removeEventListener('resize', alDesplazarOCambiarTamano);
  });

  return { estilo };
}
