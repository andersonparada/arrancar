import { computed, onBeforeUnmount, ref } from 'vue';
import { usarApariencia } from '../../almacenes/apariencia';
import { usarAvisos } from '../../almacenes/avisos';
import { apiApariencia } from '../../servicios/apariencia.api';
import { sugerirColoresDeImagen } from '../../utilidades/colores';
import type { Colores } from './paletas';
import { usarCambioDeApariencia } from './usar-cambio-de-apariencia';

type Avisos = ReturnType<typeof usarAvisos>;

/** Muestra el archivo elegido mientras sube, sin esperar al servidor; libera la copia anterior. */
function usarLogoLocal() {
  const url = ref<string | null>(null);
  const mostrar = (archivo: File | null) => {
    if (url.value) URL.revokeObjectURL(url.value);
    url.value = archivo ? URL.createObjectURL(archivo) : null;
  };
  onBeforeUnmount(() => mostrar(null));
  return { url, mostrar };
}

async function sugerirColoresDelLogo(logo: string, elegirColores: (colores: Colores) => void, avisos: Avisos) {
  const sugerencia = await sugerirColoresDeImagen(logo).catch(() => undefined);
  if (sugerencia === undefined) return avisos.error('No se pudo leer el logo.');
  if (!sugerencia) return avisos.info('El logo no tiene colores suficientes para sugerir una paleta.');
  elegirColores(sugerencia);
  avisos.info('Colores sugeridos a partir del logo. Revise la vista previa y guarde.');
}

const confirmarQuitarLogo = (avisos: Avisos) =>
  avisos.confirmar({ mensaje: '¿Quitar el logo propio y volver al de Arrancar?', textoConfirmar: 'Quitar' });

/** El logo de la instalación: subirlo, quitarlo y sugerir colores a partir de él. */
export function usarLogoDeApariencia(elegirColores: (colores: Colores) => void) {
  const apariencia = usarApariencia();
  const avisos = usarAvisos();
  const { aplicar } = usarCambioDeApariencia();
  const local = usarLogoLocal();
  const vistaPrevia = computed(() => local.url.value ?? apariencia.urlLogo);
  const sugerirColores = () => sugerirColoresDelLogo(vistaPrevia.value, elegirColores, avisos);

  async function subir(archivo: File): Promise<void> {
    local.mostrar(archivo);
    if (!(await aplicar(() => apiApariencia.cambiarLogo(archivo)))) return;
    avisos.exito('Logo actualizado.');
    await sugerirColores();
  }

  async function quitar(): Promise<void> {
    if (!(await confirmarQuitarLogo(avisos))) return;
    if (await aplicar(() => apiApariencia.quitarLogo())) local.mostrar(null);
  }

  const tieneLogoPropio = computed(() => apariencia.apariencia.urlLogo !== null);
  return { vistaPrevia, tieneLogoPropio, subir, quitar, sugerirColores };
}
