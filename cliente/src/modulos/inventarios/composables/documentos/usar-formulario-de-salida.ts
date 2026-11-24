import { ref, toRef, watch, type Ref } from 'vue';
import { apiDocumentos } from '../../servicios/documentos.api';
import { datosDeSalida, erroresDeSalida, salidaNueva, type EdicionDeSalida } from './edicion-de-documento';
import { erroresDeRenglones, type EdicionDeRenglon } from './edicion-de-renglones';
import { departamentoVigente } from './opciones-de-documento';
import { usarBaseDeDocumento } from './usar-base-de-documento';
import { usarDestinosDeSalida } from './usar-referencias-de-documento';

/** Los destinos de la salida; al cambiar de localidad se quita un departamento que no sea de la nueva. */
function usarDestinosSincronizados(edicion: Ref<EdicionDeSalida>) {
  const destinos = usarDestinosDeSalida(toRef(() => edicion.value.localidadId));
  watch(
    () => edicion.value.localidadId,
    () => {
      edicion.value.departamentoId = departamentoVigente(destinos.departamentos.value, edicion.value.departamentoId);
    },
  );
  return destinos;
}

/** El formulario de una salida por consumo: destino con su concepto de gasto, renglones y confirmación con resumen. */
export function usarFormularioDeSalida() {
  const edicion = ref(salidaNueva());
  const { registrar, resumen, renglones, catalogo, ...base } = usarBaseDeDocumento(edicion, 'salida');

  const destinos = usarDestinosSincronizados(edicion);

  /** El artículo propone su concepto de gasto, salvo que el usuario ya haya elegido uno. */
  async function elegirArticulo(renglon: EdicionDeRenglon): Promise<void> {
    await renglones.alElegirArticulo(renglon);
    const propuesto = catalogo.articuloDe(renglon.articuloId)?.conceptoDeGastoId;
    if (propuesto && !edicion.value.conceptoDeGastoId) edicion.value.conceptoDeGastoId = propuesto;
  }

  const guardar = () =>
    registrar({
      errores: () => ({ ...erroresDeSalida(edicion.value), ...erroresDeRenglones(edicion.value.renglones, false) }),
      resumen,
      titulo: 'Registrar salida',
      enviar: () => apiDocumentos.registrarSalida(datosDeSalida(edicion.value)),
    });

  return {
    edicion,
    catalogo,
    ...base,
    destinos,
    renglones: { ...renglones, alElegirArticulo: elegirArticulo },
    guardar,
  };
}
