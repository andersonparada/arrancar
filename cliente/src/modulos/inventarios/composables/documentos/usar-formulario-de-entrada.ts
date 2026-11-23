import { computed, ref } from 'vue';
import { apiDocumentos } from '../../servicios/documentos.api';
import { datosDeEntrada, entradaNueva, erroresDeEntrada, esDonacion } from './edicion-de-documento';
import { erroresDeRenglones } from './edicion-de-renglones';
import { usarBaseDeDocumento } from './usar-base-de-documento';

/** El formulario de una entrada manual: encabezado, renglones con costo y confirmación con resumen. */
export function usarFormularioDeEntrada() {
  const edicion = ref(entradaNueva());
  const { registrar, resumen, ...base } = usarBaseDeDocumento(edicion, 'entrada');

  const guardar = () =>
    registrar({
      errores: () => ({ ...erroresDeEntrada(edicion.value), ...erroresDeRenglones(edicion.value.renglones, true) }),
      resumen,
      titulo: 'Registrar entrada',
      enviar: () => apiDocumentos.registrarEntrada(datosDeEntrada(edicion.value)),
    });

  return { edicion, ...base, esDonacion: computed(() => esDonacion(edicion.value)), guardar };
}
