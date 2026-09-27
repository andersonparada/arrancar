import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { apiApariencia, type Apariencia } from '../servicios/apariencia.api';
import { variablesTema } from '../utilidades/colores';

const LLAVE_CACHE = 'arrancar.apariencia';

export const APARIENCIA_PREDETERMINADA: Apariencia = {
  nombreAplicacion: 'Arrancar',
  colorPrincipal: '#1f4d2c',
  colorAcento: '#e9c46a',
  urlLogo: null,
};

function leerCache(): Apariencia | null {
  try {
    const texto = localStorage.getItem(LLAVE_CACHE);
    return texto ? (JSON.parse(texto) as Apariencia) : null;
  } catch {
    return null;
  }
}

function escribirCache(apariencia: Apariencia): void {
  try {
    localStorage.setItem(LLAVE_CACHE, JSON.stringify(apariencia));
  } catch {
    // Sin almacenamiento local (modo privado): se vuelve a pedir en cada carga.
  }
}

/** Aplica los colores al documento y al color de la barra del navegador en el celular. */
export function aplicarTema(elemento: HTMLElement, principal: string, acento: string): void {
  for (const [variable, valor] of Object.entries(variablesTema(principal, acento))) {
    elemento.style.setProperty(variable, valor);
  }
}

/**
 * Identidad visual de la instalación (nombre, colores y logo). Se aplica al
 * instante desde la última copia guardada en el navegador y luego se actualiza
 * con la del servidor, para que no parpadee al abrir la app.
 */
export const usarApariencia = defineStore('apariencia', () => {
  const apariencia = ref<Apariencia>(leerCache() ?? APARIENCIA_PREDETERMINADA);

  const nombreAplicacion = computed(() => apariencia.value.nombreAplicacion);
  const urlLogo = computed(() => apariencia.value.urlLogo ?? '/logo.svg');

  function establecer(nueva: Apariencia): void {
    apariencia.value = nueva;
    aplicarTema(document.documentElement, nueva.colorPrincipal, nueva.colorAcento);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', nueva.colorPrincipal);
    escribirCache(nueva);
  }

  async function cargar(): Promise<void> {
    establecer(apariencia.value);
    try {
      establecer(await apiApariencia.obtener());
    } catch {
      // Sin conexión se conserva la última apariencia conocida.
    }
  }

  return { apariencia, nombreAplicacion, urlLogo, establecer, cargar };
});
