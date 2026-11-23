import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiRecepciones, type LineaPorRecibir } from '../../servicios/recepciones.api';
import { usarVentanaDeMotivo } from '../compartido/usar-ventana-de-motivo';

/** Deshacer un descarte: la línea vuelve a ser inventario en el libro y reaparece en la bandeja. */
function usarDeshacerDescarte(descartadas: Ref<LineaPorRecibir[]>, alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  return async function devolverALaBandeja(linea: LineaPorRecibir): Promise<void> {
    if (!(await enviar(() => apiRecepciones.devolverALaBandeja(linea.lineaId)))) return;
    descartadas.value = descartadas.value.filter((descartada) => descartada.lineaId !== linea.lineaId);
    avisos.exito('La línea volvió a la bandeja y a ser inventario en el Libro de compras.');
    await alTerminar();
  };
}

/**
 * Descartar una línea (deja de ser inventario en el Libro de compras) y deshacerlo. El servidor no lista lo descartado,
 * así que las líneas descartadas en esta visita quedan a la vista para devolverlas a la bandeja si fue un error.
 */
export function usarDescarte(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const objetivo = ref<LineaPorRecibir | null>(null);
  const descartadas = ref<LineaPorRecibir[]>([]);
  const ventana = usarVentanaDeMotivo(
    (motivo) => apiRecepciones.descartar(objetivo.value!.lineaId, motivo),
    async (resultado) => {
      descartadas.value = [objetivo.value!, ...descartadas.value];
      avisos.exito('La línea se descartó: ya no es inventario en el Libro de compras.');
      resultado.avisos.forEach((aviso) => avisos.info(aviso));
      await alTerminar();
    },
  );
  const abrir = (linea: LineaPorRecibir) => {
    objetivo.value = linea;
    ventana.abrir();
  };

  return {
    ...ventana,
    descartadas,
    abrir,
    devolverALaBandeja: usarDeshacerDescarte(descartadas, alTerminar),
  };
}
