import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { juntarProveedoresPorPagar, type ProveedoresJuntados } from './paginas-de-proveedores';
import { apiPagos, type ParaPagar } from '../../servicios/pagos.api';
import { claveDeSuma, crearControlDeSuma } from './control-de-suma';
import { mensajeDe } from './mensaje-de-error';

/** Los proveedores con algo autorizado por pagar. */
export function usarProveedoresPorPagar() {
  const { datos, cargando } = usarCarga<ProveedoresJuntados>(
    () => juntarProveedoresPorPagar((pagina) => apiPagos.proveedoresPorPagar(pagina)),
    { proveedores: [], incompleta: false },
    'No se pudo cargar la lista de proveedores.',
  );
  return {
    proveedores: computed(() => datos.value.proveedores),
    listaIncompleta: computed(() => datos.value.incompleta),
    cargandoProveedores: cargando,
  };
}

interface EstadoDeCargos {
  datos: Ref<ParaPagar | null>;
  cargando: Ref<boolean>;
  /** El número de la última petición: si llegan dos, solo vale la última. */
  ultima: number;
  suma: ReturnType<typeof crearControlDeSuma>;
}

/** El proveedor y la fecha que hay ahora en el formulario, leídos al momento de usarlos. */
export type FormularioVigente = () => { proveedorId: string; fecha: string };

export interface FiltroParaPagar {
  contrasenaId?: string;
  fecha?: string;
}

async function traerCargos(estado: EstadoDeCargos, proveedorId: string, filtro: FiltroParaPagar) {
  const peticion = ++estado.ultima;
  estado.cargando.value = !!proveedorId;
  if (!proveedorId) {
    estado.datos.value = null;
    return null;
  }
  try {
    const respuesta = await apiPagos.paraPagar(proveedorId, filtro);
    if (peticion !== estado.ultima) return null;
    estado.datos.value = respuesta;
    return respuesta;
  } catch (error) {
    if (peticion === estado.ultima) {
      usarAvisos().error(mensajeDe(error, 'No se pudo cargar lo que se le debe al proveedor.'));
    }
    return null;
  } finally {
    if (peticion === estado.ultima) estado.cargando.value = false;
  }
}

/**
 * Cambia el mes de la fecha: se trae solo lo pagado en ese mes, sin tocar lo que el usuario escribió. La respuesta
 * solo vale si sigue siendo el último pedido, no llegó otra carga de cargos y el proveedor y el mes son los vigentes.
 */
async function actualizarSuma(estado: EstadoDeCargos, vigente: FormularioVigente): Promise<void> {
  const { proveedorId, fecha } = vigente();
  if (!estado.datos.value || !proveedorId || !fecha) return;
  const [numero, cargas, pedida] = [estado.suma.nuevo(), estado.ultima, claveDeSuma(proveedorId, fecha)];
  try {
    const respuesta = await apiPagos.paraPagar(proveedorId, { fecha });
    const { proveedorId: actual, fecha: fechaActual } = vigente();
    const sirve = estado.suma.sirve(numero, pedida, claveDeSuma(actual, fechaActual));
    if (sirve && cargas === estado.ultima && estado.datos.value)
      estado.datos.value = { ...estado.datos.value, sumaDelMesAlProveedor: respuesta.sumaDelMesAlProveedor };
  } catch {
    // Solo afina un aviso: el servidor vuelve a revisar todo al registrar.
  }
}

/** Lo que se puede pagar del proveedor elegido; si se piden dos a la vez, solo vale la última respuesta. */
export function usarCargosParaPagar() {
  const estado: EstadoDeCargos = {
    datos: ref<ParaPagar | null>(null),
    cargando: ref(false),
    ultima: 0,
    suma: crearControlDeSuma(),
  };
  return {
    datos: estado.datos,
    cargando: estado.cargando,
    traer: (proveedorId: string, filtro: FiltroParaPagar = {}) => traerCargos(estado, proveedorId, filtro),
    actualizarSumaDelMes: (vigente: FormularioVigente) => actualizarSuma(estado, vigente),
  };
}
