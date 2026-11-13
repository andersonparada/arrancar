import { computed, onMounted, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import {
  apiSaldosIniciales,
  type EstadoDeLaCarga,
  type ProveedorParaSaldo,
  type SaldoInicial,
} from '../../servicios/saldos-iniciales.api';
import { DOCUMENTOS_POR_PAGINA, paginasEnTotal } from '../filtros-de-documentos';

const mensajeDe = (error: unknown, siNoHay: string): string => (error instanceof Error ? error.message : siNoHay);

/** Los proveedores para el filtro y para la ventana; si falla, avisa y quedan vacíos. */
function usarProveedores() {
  const avisos = usarAvisos();
  const proveedores = ref<ProveedorParaSaldo[]>([]);
  onMounted(async () => {
    try {
      proveedores.value = await apiSaldosIniciales.listarProveedores();
    } catch (error) {
      avisos.error(mensajeDe(error, 'No se pudo cargar la lista de proveedores.'));
    }
  });
  return proveedores;
}

/** Pide la página de saldos; si llegan dos respuestas, solo vale la de la última petición. */
function usarPeticionDeSaldos(proveedorId: Ref<string>, pagina: Ref<number>) {
  const avisos = usarAvisos();
  const saldos = ref<SaldoInicial[]>([]);
  const carga = ref<EstadoDeLaCarga | null>(null);
  const total = ref(0);
  const cargando = ref(true);
  let ultimaPeticion = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultimaPeticion;
    cargando.value = true;
    try {
      const consulta = { proveedorId: proveedorId.value || undefined, pagina: pagina.value };
      const respuesta = await apiSaldosIniciales.listar({ ...consulta, limite: DOCUMENTOS_POR_PAGINA });
      if (peticion !== ultimaPeticion) return;
      [saldos.value, carga.value, total.value] = [respuesta.elementos, respuesta.carga, respuesta.total];
    } catch (error) {
      if (peticion !== ultimaPeticion) return;
      avisos.error(mensajeDe(error, 'No se pudieron cargar los saldos iniciales.'));
    }
    cargando.value = false;
  }

  return { saldos, carga, total, cargando, cargar };
}

/** La lista de saldos iniciales con su filtro por proveedor, su página y el estado de la carga. */
export function usarListaDeSaldosIniciales() {
  const proveedorId = ref('');
  const pagina = ref(1);
  const peticion = usarPeticionDeSaldos(proveedorId, pagina);

  watch(proveedorId, () => (pagina.value === 1 ? peticion.cargar() : (pagina.value = 1)));
  watch(pagina, peticion.cargar);
  onMounted(peticion.cargar);

  return {
    ...peticion,
    proveedorId,
    pagina,
    paginas: computed(() => paginasEnTotal(peticion.total.value, DOCUMENTOS_POR_PAGINA)),
    limite: DOCUMENTOS_POR_PAGINA,
    proveedores: usarProveedores(),
  };
}
