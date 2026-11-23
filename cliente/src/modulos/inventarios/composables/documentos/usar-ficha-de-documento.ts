import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiDocumentos, type Documento } from '../../servicios/documentos.api';
import { usarVentanaDeMotivo } from '../compartido/usar-ventana-de-motivo';
import { tituloDeDocumento } from './detalles-de-documento';

/** La ficha de un documento y su anulación: pide el motivo, dice qué pasará y recalcula al guardar. */
export function usarFichaDeDocumento(documentoId: string) {
  const avisos = usarAvisos();
  const { datos, cargando, cargar } = usarCarga(
    () => apiDocumentos.obtener(documentoId),
    null as Documento | null,
    'No se pudo cargar el documento.',
  );
  const anulacion = usarVentanaDeMotivo(
    (motivo) => apiDocumentos.anular(datos.value!, motivo),
    async () => {
      avisos.exito(`${tituloDeDocumento(datos.value!)} anulado.`);
      await cargar();
    },
  );

  return { documento: datos, cargando, ...anulacion };
}
