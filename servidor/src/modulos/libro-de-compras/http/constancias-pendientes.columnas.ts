import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { ConstanciasPendientesDto } from '../aplicacion/dto/constancias-pendientes.dto.js';
import { fechaLegible } from '../dominio/retenciones/fechas-de-retenciones.js';

const LEYENDA_DE_PLAZOS =
  'Los días son de calendario. El plazo de la constancia del ISR es el 5.º día hábil del mes siguiente (Código Tributario, art. 8); el IVA no tiene plazo propio confirmado y se guía por el del entero.';

/** Una fila del Excel: una retención sin constancia, con los plazos de su entero y de su constancia. */
export interface FilaExportadaDeConstanciaPendiente {
  seccion: string;
  mes: string | null;
  grupo: string | null;
  plazoDelGrupo: string | null;
  diasParaElPlazo: number | null;
  enterado: boolean | null;
  proveedorNit: string | null;
  proveedorNombre: string | null;
  documento: string | null;
  fecha: string | null;
  impuesto: string | null;
  regla: string | null;
  base: string | null;
  retenido: string | null;
  plazoDeLaConstancia: string | null;
  diasParaLaConstancia: number | null;
  notaDelPlazo: string | null;
  estadoDelDocumento: string | null;
}

type Pendiente = ConstanciasPendientesDto['pendientes'][number];

/** Como se ve en pantalla: «FACT A-123» (el tipo, y la serie unida al número con guion). */
function documentoDe({ retencion }: Pendiente): string {
  const { tipoDte, serie, numero } = retencion.documento;
  const completo = serie ? `${serie}-${numero}` : numero;
  return tipoDte ? `${tipoDte} ${completo}` : completo;
}

const VACIA: FilaExportadaDeConstanciaPendiente = {
  seccion: '',
  mes: null,
  grupo: null,
  plazoDelGrupo: null,
  diasParaElPlazo: null,
  enterado: null,
  proveedorNit: null,
  proveedorNombre: null,
  documento: null,
  fecha: null,
  impuesto: null,
  regla: null,
  base: null,
  retenido: null,
  plazoDeLaConstancia: null,
  diasParaLaConstancia: null,
  notaDelPlazo: null,
  estadoDelDocumento: null,
};

const nota = (mensaje: string): FilaExportadaDeConstanciaPendiente => ({
  ...VACIA,
  seccion: 'Nota',
  proveedorNombre: mensaje,
});

function aFila(pendiente: Pendiente, estadoDelDocumento: string): FilaExportadaDeConstanciaPendiente {
  const { retencion } = pendiente;
  return {
    seccion: estadoDelDocumento === 'Vigente' ? 'Constancias pendientes' : 'Retenciones de documentos anulados',
    mes: pendiente.mes,
    grupo: pendiente.nombreDelGrupo,
    plazoDelGrupo: pendiente.plazoDelGrupo,
    diasParaElPlazo: pendiente.diasParaElPlazo,
    enterado: pendiente.enterado,
    proveedorNit: retencion.proveedor.nit,
    proveedorNombre: retencion.proveedor.nombre,
    documento: documentoDe(pendiente),
    fecha: retencion.fecha,
    impuesto: retencion.impuesto.toUpperCase(),
    regla: retencion.regla,
    base: retencion.base,
    retenido: retencion.retenido,
    plazoDeLaConstancia: pendiente.plazoDeLaConstancia,
    diasParaLaConstancia: pendiente.diasParaLaConstancia,
    notaDelPlazo: pendiente.notaDelPlazo,
    estadoDelDocumento,
  };
}

/** Lo que dice cada nota del Excel: el mes, los filtros y el día de los plazos (lo que la pantalla muestra arriba). */
function notasDelReporte(reporte: ConstanciasPendientesDto): string[] {
  const { grupo, proveedorId } = reporte.filtros;
  const nombreDelGrupo = reporte.pendientes.concat(reporte.anuladas).find((p) => p.grupo === grupo)?.nombreDelGrupo;
  const filtros = [grupo ? `Grupo de entero: ${nombreDelGrupo ?? grupo}` : '', proveedorId ? 'Solo un proveedor' : ''];
  return [
    `Constancias pendientes hasta el mes ${reporte.hasta.slice(5, 7)}/${reporte.hasta.slice(0, 4)}; plazos calculados al ${fechaLegible(reporte.hoy)}.`,
    filtros.filter(Boolean).length > 0 ? `Filtros: ${filtros.filter(Boolean).join('; ')}.` : 'Sin filtros.',
    LEYENDA_DE_PLAZOS,
  ];
}

/**
 * El reporte en filas planas: las de documentos vigentes, las de anulados, el total y, al final, las notas
 * (mes, filtros y leyenda), como los demás reportes.
 */
export function aFilasDeConstanciasPendientes(reporte: ConstanciasPendientesDto): FilaExportadaDeConstanciaPendiente[] {
  return [
    ...reporte.pendientes.map((pendiente) => aFila(pendiente, 'Vigente')),
    ...reporte.anuladas.map((pendiente) => aFila(pendiente, 'Anulado')),
    {
      ...VACIA,
      seccion: 'Total',
      proveedorNombre: `${reporte.total.cantidad} retenciones sin constancia`,
      retenido: reporte.total.retenido,
    },
    ...notasDelReporte(reporte).map(nota),
  ];
}

/** Las columnas del Excel de constancias pendientes: solo se exporta, nunca se importa. */
export const columnasDeConstanciasPendientes: Columna[] = [
  { clave: 'seccion', titulo: 'Sección', requerido: true, tipo: 'texto' },
  { clave: 'mes', titulo: 'Mes', requerido: true, tipo: 'fecha' },
  { clave: 'grupo', titulo: 'Grupo de entero', requerido: true, tipo: 'texto' },
  { clave: 'plazoDelGrupo', titulo: 'Plazo del entero', requerido: true, tipo: 'fecha' },
  { clave: 'diasParaElPlazo', titulo: 'Días para el entero (negativo: vencido)', requerido: true, tipo: 'entero' },
  { clave: 'enterado', titulo: 'Enterado', requerido: true, tipo: 'siNo' },
  { clave: 'proveedorNit', titulo: 'NIT del proveedor', requerido: false, tipo: 'texto' },
  { clave: 'proveedorNombre', titulo: 'Proveedor', requerido: true, tipo: 'texto' },
  { clave: 'documento', titulo: 'Documento', requerido: true, tipo: 'texto' },
  { clave: 'fecha', titulo: 'Fecha de la retención', requerido: true, tipo: 'fecha' },
  { clave: 'impuesto', titulo: 'Impuesto', requerido: true, tipo: 'texto' },
  { clave: 'regla', titulo: 'Regla', requerido: true, tipo: 'texto' },
  { clave: 'base', titulo: 'Base', requerido: true, tipo: 'decimal' },
  { clave: 'retenido', titulo: 'Retenido', requerido: true, tipo: 'decimal' },
  { clave: 'plazoDeLaConstancia', titulo: 'Plazo de la constancia', requerido: false, tipo: 'fecha' },
  {
    clave: 'diasParaLaConstancia',
    titulo: 'Días para la constancia (negativo: vencida)',
    requerido: false,
    tipo: 'entero',
  },
  { clave: 'notaDelPlazo', titulo: 'Nota del plazo', requerido: false, tipo: 'texto' },
  { clave: 'estadoDelDocumento', titulo: 'Estado del documento', requerido: true, tipo: 'texto' },
];
