import { computed, onMounted, reactive } from 'vue';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import type { IntercambioDeDatos } from '@/modulos/core/servicios/intercambio';
import { fechaDeHoy } from './fechas-de-reportes';
import { usarExportacionDeReporte } from './usar-exportacion-de-reporte';
import { usarOpcionesDeFondos } from './usar-opciones-de-fondos';
import { usarPeticionDeReporte } from './usar-peticion-de-reporte';

/** Lo que distingue a un reporte de otro: sus filtros, su consulta y su Excel. */
export interface DefinicionDeReporte<T, F extends { fondoId: string }> {
  inicial: (hoy: string) => F;
  consulta: (filtros: F) => Consulta;
  errores: (filtros: F) => Record<string, string | undefined>;
  cantidadDeFiltros: (filtros: F, hoy: string) => number;
  pedir: (consulta: Consulta) => Promise<T>;
  intercambio: IntercambioDeDatos;
  siFalla: string;
}

/** Los filtros y el reporte, que se pide al abrir y al cambiar los filtros si las fechas están completas. */
function usarFiltrosYReporte<T, F extends { fondoId: string }>(definicion: DefinicionDeReporte<T, F>, hoy: string) {
  const filtros = reactive(definicion.inicial(hoy)) as F;
  const errores = computed(() => definicion.errores(filtros));
  const invalido = (): boolean => Object.values(errores.value).some(Boolean);
  const { reporte, cargando, cargar } = usarPeticionDeReporte(
    () => definicion.pedir(definicion.consulta(filtros)),
    definicion.siFalla,
  );
  const cargarSiSirve = (): void => {
    if (!invalido()) void cargar();
  };
  alDejarDeEscribir(filtros, cargarSiSirve);
  onMounted(cargarSiSirve);
  return { filtros, reporte, cargando, errores, invalido };
}

/**
 * Los filtros y el reporte, la lista de fondos para elegir uno y el Excel con los mismos filtros de la pantalla.
 */
export function usarReporte<T, F extends { fondoId: string }>(definicion: DefinicionDeReporte<T, F>) {
  const hoy = fechaDeHoy();
  const { filtros, invalido, ...datos } = usarFiltrosYReporte(definicion, hoy);
  const fondos = usarOpcionesDeFondos();
  return {
    ...datos,
    filtros,
    opcionesDeFondos: fondos.opciones,
    nombreDelFondo: computed(() => fondos.nombreDe(filtros.fondoId)),
    cantidadDeFiltros: computed(() => definicion.cantidadDeFiltros(filtros, hoy)),
    quitarFiltros: () => Object.assign(filtros, definicion.inicial(hoy)),
    exportar: usarExportacionDeReporte(definicion.intercambio, () => definicion.consulta(filtros), invalido),
  };
}
