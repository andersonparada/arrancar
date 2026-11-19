import { watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import type { DestinoDeDocumento } from '../../servicios/documentos.api';
import type { EdicionDeDocumento } from './edicion-de-documento';
import { referenciaDeLaRuta } from './referencia-de-destino';

/**
 * Si se llegó desde un destino (la ficha de un anticipo, de un fondo…), el documento va a ese destino: se escoge solo en cuanto
 * los destinos activos están a la vista, y no lo cambia la propuesta por proveedor. Si el destino no está activo, el
 * formulario queda como siempre y el usuario escoge.
 * @returns el destino fijo, o `null` si no se llegó desde uno.
 */
export function usarDestinoDeLaRuta(
  edicion: EdicionDeDocumento,
  destinos: Readonly<Ref<DestinoDeDocumento[]>>,
): DestinoDeDocumento | null {
  const { destino } = referenciaDeLaRuta(useRoute().query);
  if (!destino) return null;
  watch(
    destinos,
    (activos) => {
      if (activos.includes(destino)) edicion.destino = destino;
    },
    { immediate: true },
  );
  return destino;
}
