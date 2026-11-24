import { usarDescarte } from './usar-descarte';
import { usarDevolucion } from './usar-devolucion';
import { usarPorRecibir } from './usar-por-recibir';
import { usarRebaja } from './usar-rebaja';
import { usarRecepcion } from './usar-recepcion';

/** Todo lo que se hace desde la bandeja «Por recibir»; al terminar cualquier acción la bandeja se vuelve a traer. */
export function usarBandejaPorRecibir() {
  const lista = usarPorRecibir();
  const alTerminar = async () => {
    lista.limpiarSeleccion();
    await lista.recargar();
  };
  return {
    lista,
    recepcion: usarRecepcion(alTerminar),
    devolucion: usarDevolucion(alTerminar),
    rebaja: usarRebaja(alTerminar),
    descarte: usarDescarte(alTerminar),
  };
}
