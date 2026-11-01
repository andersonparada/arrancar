import { ref } from 'vue';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDteRecibidos, type ResultadoDeImportarDte } from '../../servicios/dte-recibidos.api';
import { IMPORTAR_DE_LA_SAT as textos } from '../../textos-de-la-bandeja';
import { extensionAdmitida } from './datos-de-la-importacion';

/** El archivo elegido, si su extensión sirve, y lo que respondió el servidor al cargarlo. */
function usarEleccionDelArchivo() {
  const abierta = ref(false);
  const archivo = ref<File | null>(null);
  const resultado = ref<ResultadoDeImportarDte | null>(null);
  const errorDelArchivo = ref('');

  function abrir(): void {
    archivo.value = null;
    resultado.value = null;
    errorDelArchivo.value = '';
    abierta.value = true;
  }

  function elegir(elegido: File): void {
    resultado.value = null;
    const admitido = extensionAdmitida(elegido.name);
    errorDelArchivo.value = admitido ? '' : textos.extensionNoAdmitida;
    archivo.value = admitido ? elegido : null;
  }

  return { abierta, archivo, resultado, errorDelArchivo, abrir, elegir, cerrar: () => (abierta.value = false) };
}

/**
 * Cargar el archivo de la SAT: abrir la ventana, elegir el archivo, subirlo y ver el resultado. Al terminar bien,
 * `alTerminar` recarga la lista para que lo nuevo aparezca de inmediato, aunque la ventana siga abierta con el resumen.
 */
export function usarImportarDeLaSat(alTerminar: () => unknown) {
  const { enviando, enviar } = usarFormulario();
  const eleccion = usarEleccionDelArchivo();

  async function cargar(): Promise<void> {
    const elegido = eleccion.archivo.value;
    if (!elegido) return;
    const subio = await enviar(async () => {
      eleccion.resultado.value = await apiDteRecibidos.importar(elegido);
    });
    if (subio) await alTerminar();
  }

  return { ...eleccion, enviando, cargar };
}
