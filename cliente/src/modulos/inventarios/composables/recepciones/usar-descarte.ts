import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiRecepciones, type LineaPorRecibir } from '../../servicios/recepciones.api';
import { AVISO_DE_DESCARTE, AVISO_DE_DESCARTE_DE_NOTA } from '../../textos';
import { usarVentanaDeMotivo } from '../compartido/usar-ventana-de-motivo';

const textoDeDescarte = (linea: LineaPorRecibir): string =>
  linea.esInventario
    ? 'La línea se descartó: ya no es inventario en el Libro de compras.'
    : 'La línea se descartó. El Libro de compras no cambió.';

const textoDeDeshacer = (linea: LineaPorRecibir): string =>
  linea.esInventario
    ? 'La línea volvió a la bandeja y a ser inventario en el Libro de compras.'
    : 'La línea volvió a la bandeja. El Libro de compras no cambió.';

/** Deshacer un descarte: la línea vuelve a ser inventario en el libro y reaparece en la bandeja. */
function usarDeshacerDescarte(descartadas: Ref<LineaPorRecibir[]>, alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  return async function devolverALaBandeja(linea: LineaPorRecibir): Promise<void> {
    if (!(await enviar(() => apiRecepciones.devolverALaBandeja(linea.lineaId)))) return;
    descartadas.value = descartadas.value.filter((descartada) => descartada.lineaId !== linea.lineaId);
    avisos.exito(textoDeDeshacer(linea));
    await alTerminar();
  };
}

/** La ventana del motivo: descarta la línea elegida, la deja a la vista para deshacer y repite los avisos del servidor. */
function usarVentanaDeDescarte(
  objetivo: Ref<LineaPorRecibir | null>,
  descartadas: Ref<LineaPorRecibir[]>,
  alTerminar: () => Promise<void>,
) {
  const avisos = usarAvisos();
  return usarVentanaDeMotivo(
    (motivo) => apiRecepciones.descartar(objetivo.value!.lineaId, motivo),
    async (resultado) => {
      descartadas.value = [objetivo.value!, ...descartadas.value];
      avisos.exito(textoDeDescarte(objetivo.value!));
      resultado.avisos.forEach((aviso) => avisos.info(aviso));
      await alTerminar();
    },
  );
}

/**
 * Descartar una línea (deja de ser inventario en el Libro de compras, si lo era) y deshacerlo. El servidor no lista lo
 * descartado, así que las líneas descartadas en esta visita quedan a la vista para devolverlas a la bandeja.
 */
export function usarDescarte(alTerminar: () => Promise<void>) {
  const objetivo = ref<LineaPorRecibir | null>(null);
  const descartadas = ref<LineaPorRecibir[]>([]);
  const ventana = usarVentanaDeDescarte(objetivo, descartadas, alTerminar);
  const abrir = (linea: LineaPorRecibir) => {
    objetivo.value = linea;
    ventana.abrir();
  };
  const aviso = computed(() =>
    objetivo.value?.esInventario === false ? AVISO_DE_DESCARTE_DE_NOTA : AVISO_DE_DESCARTE,
  );

  return { ...ventana, aviso, descartadas, abrir, devolverALaBandeja: usarDeshacerDescarte(descartadas, alTerminar) };
}
