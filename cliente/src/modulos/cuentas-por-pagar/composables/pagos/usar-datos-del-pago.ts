import { onMounted, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import {
  apiPagos,
  type MediosDePago,
  type NotaParaLigar,
  type ParaPagar,
  type ProveedorPorPagar,
} from '../../servicios/pagos.api';

const mensajeDe = (error: unknown, porOmision: string): string => (error instanceof Error ? error.message : porOmision);

/** Los proveedores con algo autorizado por pagar. */
export function usarProveedoresPorPagar() {
  const { datos, cargando } = usarCarga<ProveedorPorPagar[]>(
    async () => (await apiPagos.proveedoresPorPagar()).elementos,
    [],
    'No se pudo cargar la lista de proveedores.',
  );
  return { proveedores: datos, cargandoProveedores: cargando };
}

/** Las cuentas y chequeras de Bancos y las notas ya registradas, solo si el usuario puede usarlas. */
export function usarCatalogosDelPago(puedeEmitir: () => boolean, puedeLigar: () => boolean, fecha: () => string) {
  const avisos = usarAvisos();
  const medios = ref<MediosDePago | null>(null);
  const notas = ref<NotaParaLigar[]>([]);
  const cargando = ref(true);

  async function traer(): Promise<void> {
    try {
      if (puedeEmitir()) medios.value = await apiPagos.medios(fecha());
      if (puedeLigar()) notas.value = (await apiPagos.notasParaLigar()).elementos;
    } catch (error) {
      avisos.error(mensajeDe(error, 'No se pudieron cargar las cuentas y las notas de Bancos.'));
    } finally {
      cargando.value = false;
    }
  }
  onMounted(traer);
  return { medios, notas, cargandoCatalogos: cargando, recargarCatalogos: traer };
}

interface EstadoDeCargos {
  datos: Ref<ParaPagar | null>;
  cargando: Ref<boolean>;
  /** El número de la última petición: si llegan dos, solo vale la última. */
  ultima: number;
}

interface FiltroParaPagar {
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

/** Cambia el mes de la fecha: se trae solo lo pagado en ese mes, sin tocar lo que el usuario escribió. */
async function actualizarSuma(datos: Ref<ParaPagar | null>, proveedorId: string, fecha: string): Promise<void> {
  if (!datos.value || !proveedorId || !fecha) return;
  try {
    const respuesta = await apiPagos.paraPagar(proveedorId, { fecha });
    if (datos.value) datos.value = { ...datos.value, sumaDelMesAlProveedor: respuesta.sumaDelMesAlProveedor };
  } catch {
    // Solo afina un aviso: el servidor vuelve a revisar todo al registrar.
  }
}

/** Lo que se puede pagar del proveedor elegido; si se piden dos a la vez, solo vale la última respuesta. */
export function usarCargosParaPagar() {
  const estado: EstadoDeCargos = { datos: ref<ParaPagar | null>(null), cargando: ref(false), ultima: 0 };
  return {
    datos: estado.datos,
    cargando: estado.cargando,
    traer: (proveedorId: string, contrasenaId?: string) => traerCargos(estado, proveedorId, { contrasenaId }),
    actualizarSumaDelMes: (proveedorId: string, fecha: string) => actualizarSuma(estado.datos, proveedorId, fecha),
  };
}
