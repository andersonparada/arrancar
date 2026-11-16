import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiConstanciasPendientes, type ConstanciasPendientes } from '../../servicios/constancias-pendientes.api';
import { apiDocumentos, type ProveedorParaFiltro } from '../../servicios/documentos.api';
import { mesDe } from '../documentos/filtros-de-documentos';
import { usarDescargas } from '../libro/usar-salidas-del-libro';
import {
  bloquesDePendientes,
  cantidadDeFiltrosDePendientes,
  consultaDePendientes,
  filtrosDePendientesIniciales,
  lineasDeImpresionDePendientes,
} from './datos-de-constancias-pendientes';

/** Los proveedores para el filtro, ordenados por nombre. */
function usarProveedores() {
  const avisos = usarAvisos();
  const proveedores = ref<ProveedorParaFiltro[]>([]);
  onMounted(async () => {
    try {
      proveedores.value = await apiDocumentos.listarProveedores();
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la lista de proveedores.');
    }
  });
  return proveedores;
}

/** Trae el reporte con los filtros; si llegan dos respuestas, solo vale la de la última petición. */
function usarReporte(filtros: ReturnType<typeof filtrosDePendientesIniciales>) {
  const avisos = usarAvisos();
  const reporte = ref<ConstanciasPendientes | null>(null);
  const cargando = ref(false);
  let ultima = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultima;
    cargando.value = true;
    try {
      const respuesta = await apiConstanciasPendientes.listar(consultaDePendientes(filtros));
      if (peticion === ultima) reporte.value = respuesta;
    } catch (error) {
      if (peticion !== ultima) return;
      reporte.value = null;
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las constancias pendientes.');
    }
    if (peticion === ultima) cargando.value = false;
  }

  watch(filtros, () => void cargar());
  onMounted(cargar);
  return { reporte, cargando };
}

/** El enlace a «Retenciones por practicar» de Cuentas por pagar: solo con el módulo activo y el permiso. */
function usarEnlaceAPorPracticar() {
  const sesion = usarSesion();
  return computed(
    () => sesion.moduloActivo('cuentas-por-pagar') && sesion.puede('cuentas-por-pagar.reportes-de-saldos.ver'),
  );
}

/** Lo que se calcula a partir del reporte y los filtros: bloques, filtros activos y líneas del papel. */
function usarVistaDelReporte(
  filtros: ReturnType<typeof filtrosDePendientesIniciales>,
  reporte: Ref<ConstanciasPendientes | null>,
  proveedores: Ref<ProveedorParaFiltro[]>,
) {
  const mesEnCurso = mesDe(new Date());
  const nombre = computed(() => proveedores.value.find((p) => p.id === filtros.proveedorId)?.nombre ?? null);
  return {
    bloques: computed(() =>
      reporte.value ? bloquesDePendientes(reporte.value.pendientes, reporte.value.totales) : [],
    ),
    cantidadDeFiltros: computed(() => cantidadDeFiltrosDePendientes(filtros, mesEnCurso)),
    lineas: computed(() => lineasDeImpresionDePendientes(filtros, nombre.value)),
    quitarFiltros: () => Object.assign(filtros, filtrosDePendientesIniciales(mesEnCurso)),
  };
}

/** R12: los filtros, el reporte agrupado por mes y grupo, la impresión y el Excel. */
export function usarConstanciasPendientes() {
  const filtros = reactive(filtrosDePendientesIniciales(mesDe(new Date())));
  const { reporte, cargando } = usarReporte(filtros);
  const { descargando, descargar } = usarDescargas();
  const proveedores = usarProveedores();

  return {
    filtros,
    reporte,
    cargando,
    descargando,
    proveedores,
    puedeVerPorPracticar: usarEnlaceAPorPracticar(),
    ...usarVistaDelReporte(filtros, reporte, proveedores),
    exportar: () => descargar(() => apiConstanciasPendientes.intercambio.exportar(consultaDePendientes(filtros))),
    imprimir: () => window.print(),
  };
}
