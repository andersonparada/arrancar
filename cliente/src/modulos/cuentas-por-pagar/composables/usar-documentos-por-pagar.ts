import { computed } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { sePuedeMarcarParaAutorizar } from './reglas-de-acciones';
import { usarAutorizacion } from './usar-autorizacion';
import { usarListaDeDocumentos } from './usar-lista-de-documentos';
import { usarSeleccion } from './usar-seleccion';

const PERMISO_PARA_AUTORIZAR = 'cuentas-por-pagar.documentos.autorizar';
const PERMISO_PARA_AUTORIZAR_PROPIOS = 'cuentas-por-pagar.documentos.autorizar-propios';

/** La pantalla «Documentos por pagar»: la lista con sus filtros y la autorización por lotes. */
export function usarDocumentosPorPagar() {
  const { puede } = usarSesion();
  const lista = usarListaDeDocumentos();
  const puedeAutorizar = puede(PERMISO_PARA_AUTORIZAR);
  const puedeAutorizarPropios = puede(PERMISO_PARA_AUTORIZAR_PROPIOS);
  const marcables = computed(() =>
    lista.documentos.value.filter((d) => puedeAutorizar && sePuedeMarcarParaAutorizar(d, puedeAutorizarPropios)),
  );
  const seleccion = usarSeleccion(computed(() => marcables.value.map(({ id }) => id)));
  const escogidos = computed(() => marcables.value.filter((d) => seleccion.seleccion.value.includes(d.id)));
  const autorizacion = usarAutorizacion(async () => {
    seleccion.limpiar();
    await lista.recargar();
  });

  return {
    ...lista,
    ...seleccion,
    autorizacion,
    puedeAutorizar,
    puedeAutorizarPropios,
    autorizarEscogidos: () => autorizacion.autorizar(escogidos.value),
  };
}
