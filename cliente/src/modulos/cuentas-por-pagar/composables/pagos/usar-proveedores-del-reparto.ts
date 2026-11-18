import { computed, onMounted, reactive, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiPagos, type ProveedorPorPagar } from '../../servicios/pagos.api';
import { fechaDeHoy } from '../dinero';
import {
  conLosCargos,
  MAXIMO_DE_PROVEEDORES_EN_EL_REPARTO,
  opcionesParaAgregar,
  proveedorDelReparto,
  type ProveedorDelReparto,
} from './reparto-de-efectivo';

export interface PuntoDeInicioDelReparto {
  proveedorId?: string;
  contrasenaId?: string;
}

/** Los proveedores con algo autorizado por pagar: de ahí se eligen los del reparto. */
function usarProveedoresDisponibles() {
  const datos = ref<ProveedorPorPagar[]>([]);
  const cargando = ref(true);
  async function cargar(): Promise<void> {
    cargando.value = true;
    try {
      datos.value = (await apiPagos.proveedoresPorPagar()).elementos;
    } catch (error) {
      usarAvisos().error(error instanceof Error ? error.message : 'No se pudo cargar la lista de proveedores.');
    } finally {
      cargando.value = false;
    }
  }
  return { datos, cargando, cargar };
}

/** La lista de proveedores del reparto, con la fecha que se les pone a todos. */
function usarListaDelReparto() {
  const proveedores = reactive<ProveedorDelReparto[]>([]);
  const fechaDeTodos = ref(fechaDeHoy());

  function quitar(proveedorId: string): void {
    const indice = proveedores.findIndex((proveedor) => proveedor.proveedorId === proveedorId);
    if (indice >= 0) proveedores.splice(indice, 1);
  }

  /** Cambia la fecha de todos los proveedores; cada uno puede después tener la suya. */
  function ponerFechaATodos(fecha: string): void {
    fechaDeTodos.value = fecha;
    for (const proveedor of proveedores) proveedor.edicion.fecha = fecha;
  }
  return { proveedores, fechaDeTodos, quitar, ponerFechaATodos };
}

type ListaDelReparto = ReturnType<typeof usarListaDelReparto>;

/** Agregar un proveedor: entra de una vez y se le traen sus cargos; si falla, se avisa y no queda a medias. */
function usarAgregadoDeProveedor(
  disponibles: Ref<ProveedorPorPagar[]>,
  lista: ListaDelReparto,
  inicial: string | null,
) {
  let abierta = inicial;
  return async (proveedorId: string): Promise<void> => {
    const elegido = disponibles.value.find((proveedor) => proveedor.proveedorId === proveedorId);
    if (!elegido || lista.proveedores.some((proveedor) => proveedor.proveedorId === proveedorId)) return;
    const nuevo = reactive(proveedorDelReparto(elegido, lista.fechaDeTodos.value));
    lista.proveedores.push(nuevo);
    try {
      const filtro = { ...(abierta ? { contrasenaId: abierta } : {}), fecha: nuevo.edicion.fecha };
      conLosCargos(nuevo, await apiPagos.paraPagar(proveedorId, filtro), abierta);
    } catch (error) {
      usarAvisos().error(error instanceof Error ? error.message : 'No se pudo cargar lo que se le debe al proveedor.');
      lista.quitar(proveedorId);
    } finally {
      nuevo.cargando = false;
      abierta = null;
    }
  };
}

/**
 * Los proveedores del reparto: se agregan de uno en uno (trae sus cargos autorizados), se quitan, y la fecha de todos se
 * cambia de una vez. Si se vino de una contraseña, ese proveedor entra con solo esa contraseña ya marcada.
 */
export function usarProveedoresDelReparto(inicio: PuntoDeInicioDelReparto) {
  const disponibles = usarProveedoresDisponibles();
  const lista = usarListaDelReparto();
  const agregar = usarAgregadoDeProveedor(disponibles.datos, lista, inicio.contrasenaId ?? null);

  /** Al abrir: carga los proveedores y mete al de la contraseña de la que se vino, si se vino de una. */
  onMounted(async () => {
    await disponibles.cargar();
    if (inicio.proveedorId) await agregar(inicio.proveedorId);
  });

  return {
    ...lista,
    agregar,
    recargarProveedores: disponibles.cargar,
    cargandoProveedores: disponibles.cargando,
    sinProveedores: computed(() => !disponibles.cargando.value && disponibles.datos.value.length === 0),
    opcionesParaAgregar: computed(() => opcionesParaAgregar(disponibles.datos.value, lista.proveedores)),
    puedeAgregarOtro: computed(() => lista.proveedores.length < MAXIMO_DE_PROVEEDORES_EN_EL_REPARTO),
  };
}
