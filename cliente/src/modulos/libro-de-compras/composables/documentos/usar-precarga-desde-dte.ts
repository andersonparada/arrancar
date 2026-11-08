import { computed, onMounted, ref, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiDteRecibidos } from '../../servicios/dte-recibidos.api';
import { DESDE_LA_SAT, FORMULARIO_DE_DOCUMENTO } from '../../textos-del-registro';
import type { EdicionDeDocumento } from './edicion-de-documento';
import { avisosDeLaPrecarga, edicionDesdeSolicitud } from './edicion-desde-solicitud';

/**
 * Los cambios de proveedor y de tipo que vienen de la precarga: sus reglas («al elegir el proveedor se propone su
 * NIT…») no deben pisar lo que la SAT ya trajo. Cada regla consume su salto una sola vez.
 */
export interface SaltosDeLaPrecarga {
  proveedor: boolean;
  tipo: boolean;
}

/** La fila de la bandeja que se abre (`?desdeDte=<id>`), o `null` si el formulario se abrió vacío. */
function idDeLaFila(valor: unknown): string | null {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return typeof texto === 'string' && texto !== '' ? texto : null;
}

interface EstadoDeLaCarga {
  avisos: ReturnType<typeof usarAvisos>;
  cargando: Ref<boolean>;
  avisosDeLaFila: Ref<string[]>;
  saltos: SaltosDeLaPrecarga;
}

/** Lo que la precarga cambia de proveedor y de tipo no debe activar sus reglas. */
function marcarSaltos(saltos: SaltosDeLaPrecarga, actual: EdicionDeDocumento, lleno: EdicionDeDocumento): void {
  saltos.proveedor = lleno.proveedorId !== actual.proveedorId;
  saltos.tipo = lleno.tipoDte !== actual.tipoDte;
}

function crearCargador(edicion: EdicionDeDocumento, estado: EstadoDeLaCarga, alLlenar: () => void) {
  const { avisos, cargando, avisosDeLaFila, saltos } = estado;
  return async function cargar(id: string): Promise<void> {
    try {
      const { solicitud, avisos: delServidor } = await apiDteRecibidos.solicitud(id);
      const lleno = edicionDesdeSolicitud(solicitud, new Date());
      marcarSaltos(saltos, edicion, lleno);
      Object.assign(edicion, lleno);
      avisosDeLaFila.value = avisosDeLaPrecarga(solicitud, delServidor);
      alLlenar();
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron traer los datos del DTE de la SAT.');
    } finally {
      cargando.value = false;
    }
  };
}

/**
 * «Abrir en el formulario»: si la ruta trae `desdeDte`, pide la solicitud propuesta de esa fila y llena el formulario
 * con ella. `alLlenar` corre con el formulario ya lleno (para que lo escrito desde ahí no cuente como cambio).
 */
export function usarPrecargaDesdeDte(edicion: EdicionDeDocumento, alLlenar: () => void) {
  const avisos = usarAvisos();
  const dteId = idDeLaFila(useRoute().query.desdeDte);
  const cargando = ref(dteId !== null);
  const avisosDeLaFila = ref<string[]>([]);
  const saltos: SaltosDeLaPrecarga = { proveedor: false, tipo: false };

  const cargar = crearCargador(edicion, { avisos, cargando, avisosDeLaFila, saltos }, alLlenar);
  onMounted(() => (dteId ? cargar(dteId) : undefined));
  return {
    dteId,
    cargando,
    avisosDeLaFila,
    saltos,
    /** Desde la bandeja se vuelve a la bandeja; si no, a la lista de facturas. */
    volver: computed(() =>
      dteId
        ? { texto: DESDE_LA_SAT.volver, ruta: { name: 'libro-de-compras.dte-recibidos' } }
        : { texto: FORMULARIO_DE_DOCUMENTO.volver, ruta: { name: 'libro-de-compras.documentos' } },
    ),
  };
}
