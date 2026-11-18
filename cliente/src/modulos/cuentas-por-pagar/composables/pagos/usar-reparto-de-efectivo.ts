import { computed } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiRetiros, type Retiro } from '../../servicios/retiros.api';
import { documentosDelReparto, quedaDelRetiro, totalDelReparto } from './reparto-de-efectivo';
import { PERMISO_SIN_BANCARIZAR, usarRegistroDelReparto } from './usar-registro-del-reparto';
import { usarProveedoresDelReparto, type PuntoDeInicioDelReparto } from './usar-proveedores-del-reparto';

/** El retiro del que sale el efectivo, con su disponible al día. */
function usarRetiroDelReparto(retiroId: () => string) {
  return usarCarga<Retiro | null>(() => apiRetiros.obtener(retiroId()), null, 'No se pudo cargar el retiro.');
}

/**
 * La pantalla «Pagar en efectivo»: el retiro, los proveedores a los que se les reparte, cuánto queda mientras se reparte y
 * el registro de todos los pagos de una vez. Lo que se puede pagar y las reglas de bancarización las decide el servidor.
 */
export function usarRepartoDeEfectivo(retiroId: () => string, inicio: PuntoDeInicioDelReparto) {
  const sesion = usarSesion();
  const { datos: retiro, cargando: cargandoElRetiro, cargar: recargarElRetiro } = usarRetiroDelReparto(retiroId);
  const proveedores = usarProveedoresDelReparto(inicio);
  const registro = usarRegistroDelReparto(retiro, proveedores.proveedores);

  /** Después de repartir, otro reparto con el retiro y los saldos ya al día. */
  async function repartirOtro(): Promise<void> {
    registro.resultado.value = null;
    proveedores.proveedores.splice(0);
    await Promise.all([recargarElRetiro(), proveedores.recargarProveedores()]);
  }

  return {
    retiro,
    cargandoElRetiro,
    ...proveedores,
    ...registro,
    repartirOtro,
    puedeSinBancarizar: computed(() => sesion.puede(PERMISO_SIN_BANCARIZAR)),
    puedeSaldar: computed(() => sesion.puede('cuentas-por-pagar.ajustes.crear')),
    total: computed(() => totalDelReparto(proveedores.proveedores)),
    documentos: computed(() => documentosDelReparto(proveedores.proveedores)),
    queda: computed(() => (retiro.value ? quedaDelRetiro(retiro.value.disponible, proveedores.proveedores) : 0)),
  };
}
