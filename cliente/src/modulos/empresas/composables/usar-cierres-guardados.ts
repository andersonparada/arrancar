import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { guardarArchivo } from '@/modulos/core/utilidades/archivos';
import type { CierreGuardado, EntradaDelHistorial } from '../servicios/cierre-de-carga.tipos';
import { apiDatosDeEmpresa } from '../servicios/datos-de-empresa.api';
import { ultimoCierreDelHistorial } from './resumen-de-cierre';

const mensajeDe = (error: unknown, siFalla: string) => (error instanceof Error ? error.message : siFalla);

/** La lista de lo que pasó con la carga, con su ventana. */
function usarHistorial(empresaId: () => string | null) {
  const avisos = usarAvisos();
  const abierto = ref(false);
  const entradas = ref<EntradaDelHistorial[]>([]);
  const cargando = ref(false);

  async function traer(): Promise<EntradaDelHistorial[]> {
    const id = empresaId();
    if (!id) return [];
    cargando.value = true;
    try {
      entradas.value = await apiDatosDeEmpresa.historialDeCarga(id);
    } catch (error) {
      avisos.error(mensajeDe(error, 'No se pudo cargar el historial de la carga inicial.'));
      entradas.value = [];
    } finally {
      cargando.value = false;
    }
    return entradas.value;
  }

  async function abrir(): Promise<void> {
    abierto.value = true;
    await traer();
  }

  return { abierto, entradas, cargando, traer, abrir };
}

/** La revisión de un cierre guardado, de solo lectura. */
function usarRevisionGuardada(empresaId: () => string | null) {
  const avisos = usarAvisos();
  const cierre = ref<CierreGuardado | null>(null);
  const cargando = ref(false);

  async function abrir(cierreId: string): Promise<void> {
    const id = empresaId();
    if (!id) return;
    cargando.value = true;
    try {
      cierre.value = await apiDatosDeEmpresa.cierreDeCarga(id, cierreId);
    } catch (error) {
      avisos.error(mensajeDe(error, 'No se pudo abrir la revisión del cierre.'));
    } finally {
      cargando.value = false;
    }
  }

  return { cierre, cargando, abrir };
}

/** Baja el Excel de un cierre. */
function usarExportacionDelCierre(empresaId: () => string | null) {
  const avisos = usarAvisos();
  const exportando = ref(false);

  async function exportar(cierreId: string): Promise<void> {
    const id = empresaId();
    if (!id) return;
    exportando.value = true;
    try {
      guardarArchivo(await apiDatosDeEmpresa.exportarCierre(id, cierreId));
    } catch (error) {
      avisos.error(mensajeDe(error, 'No se pudo exportar la revisión del cierre.'));
    } finally {
      exportando.value = false;
    }
  }

  return { exportando, exportar };
}

/**
 * Lo que quedó guardado de los cierres de la carga inicial de la empresa que se edita: el historial, la revisión
 * de cada cierre y su Excel. Los botones del último cierre buscan su id en el historial.
 */
export function usarCierresGuardados(empresaId: () => string | null) {
  const avisos = usarAvisos();
  const historial = usarHistorial(empresaId);
  const revision = usarRevisionGuardada(empresaId);
  const exportacion = usarExportacionDelCierre(empresaId);

  /** Hace algo con el cierre más reciente; si la carga no tiene revisión guardada, lo dice. */
  const conElUltimo = (hacer: (cierreId: string) => Promise<void>) => async () => {
    const ultimo = ultimoCierreDelHistorial(await historial.traer());
    if (ultimo) await hacer(ultimo.id);
    else avisos.error('No hay una revisión guardada de este cierre.');
  };

  return {
    historialAbierto: historial.abierto,
    entradas: historial.entradas,
    cargandoHistorial: historial.cargando,
    abrirHistorial: historial.abrir,
    cierre: revision.cierre,
    abrirRevision: revision.abrir,
    exportando: exportacion.exportando,
    exportar: exportacion.exportar,
    verUltimaRevision: conElUltimo(revision.abrir),
    exportarUltimo: conElUltimo(exportacion.exportar),
    cerrarHistorial: () => (historial.abierto.value = false),
    cerrarRevision: () => (revision.cierre.value = null),
  };
}
