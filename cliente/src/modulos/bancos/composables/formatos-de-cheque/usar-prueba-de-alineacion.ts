import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiFormatosDeCheque } from '../../servicios/formatos-de-cheque.api';
import type { ClaveDePlantilla, PruebaDeAlineacion } from '../../servicios/tipos-de-formatos-de-cheque';
import { reglaDePagina } from './estilos-de-impresion-de-cheque';
import { usarPapelImpreso } from './usar-papel-impreso';

/** Qué se prueba: un formato guardado o una plantilla de fábrica sin guardar. */
export interface OrigenDeLaPrueba {
  formatoId?: string;
  plantilla?: ClaveDePlantilla;
}

const traerLaPrueba = ({ formatoId, plantilla }: OrigenDeLaPrueba): Promise<PruebaDeAlineacion> =>
  formatoId
    ? apiFormatosDeCheque.pruebaDeFormato(formatoId)
    : apiFormatosDeCheque.pruebaDePlantilla(plantilla ?? 'cheque_suelto');

/**
 * La hoja de prueba de alineación: no marca nada ni gasta cheques. «La prueba quedó alineada» solo existe para un
 * formato guardado (una plantilla sin formato propio nunca figura como probada).
 */
export function usarPruebaDeAlineacion(origen: OrigenDeLaPrueba) {
  const avisos = usarAvisos();
  const { enviando, enviar } = usarFormulario();
  const { datos: prueba, cargando } = usarCarga<PruebaDeAlineacion | null>(
    () => traerLaPrueba(origen),
    null,
    'No se pudo preparar la hoja de prueba.',
  );
  const impresa = ref(false);
  usarPapelImpreso(() => (prueba.value ? reglaDePagina(prueba.value.cheque.papel) : ''));

  function imprimir(): void {
    window.print();
    impresa.value = true;
  }

  async function marcarAlineada(): Promise<void> {
    const { formatoId } = origen;
    if (!formatoId || !prueba.value) return;
    if (!(await enviar(() => apiFormatosDeCheque.marcarProbado(formatoId)))) return;
    prueba.value = { ...prueba.value, probado: true };
    avisos.exito('Listo: el formato quedó probado.');
  }

  return { prueba, cargando, impresa, enviando, imprimir, marcarAlineada };
}
