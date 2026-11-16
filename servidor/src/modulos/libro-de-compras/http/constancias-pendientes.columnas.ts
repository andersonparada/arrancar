import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { ConstanciasPendientesDto } from '../aplicacion/dto/constancias-pendientes.dto.js';

/** Una fila del Excel: una retención sin constancia, con los plazos de su entero y de su constancia. */
export interface FilaExportadaDeConstanciaPendiente {
  mes: string;
  grupo: string;
  plazoDelGrupo: string;
  diasParaElPlazo: number;
  enterado: boolean;
  proveedorNit: string | null;
  proveedorNombre: string;
  documento: string;
  fecha: string;
  impuesto: string;
  regla: string;
  base: string;
  retenido: string;
  plazoDeLaConstancia: string | null;
  diasParaLaConstancia: number | null;
  notaDelPlazo: string | null;
  estadoDelDocumento: string;
}

type Pendiente = ConstanciasPendientesDto['pendientes'][number];

const documentoDe = ({ retencion }: Pendiente): string =>
  [retencion.documento.tipoDte, retencion.documento.serie, retencion.documento.numero].filter(Boolean).join(' ');

function aFila(pendiente: Pendiente, estadoDelDocumento: string): FilaExportadaDeConstanciaPendiente {
  const { retencion } = pendiente;
  return {
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

/** El reporte en filas planas para Excel: las de documentos vigentes y, después, las de anulados. */
export function aFilasDeConstanciasPendientes(reporte: ConstanciasPendientesDto): FilaExportadaDeConstanciaPendiente[] {
  return [
    ...reporte.pendientes.map((pendiente) => aFila(pendiente, 'Vigente')),
    ...reporte.anuladas.map((pendiente) => aFila(pendiente, 'Anulado')),
  ];
}

/** Las columnas del Excel de constancias pendientes: solo se exporta, nunca se importa. */
export const columnasDeConstanciasPendientes: Columna[] = [
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
