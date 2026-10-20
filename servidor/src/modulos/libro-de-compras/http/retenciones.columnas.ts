import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { ReporteDeRetencionesDto, RetencionDto } from '../aplicacion/dto/retenciones.dto.js';

/** Una fila del Excel: una retención, con el plazo de su grupo y el estado de su documento. */
export interface FilaExportadaDeRetencion {
  grupo: string;
  plazoDelGrupo: string;
  impuesto: string;
  regla: string;
  fecha: string;
  proveedorNit: string | null;
  proveedorNombre: string;
  documento: string;
  uuid: string | null;
  fechaEmision: string;
  base: string;
  porcentaje: string | null;
  propuesto: string;
  retenido: string;
  enCero: boolean;
  motivoDelAjuste: string | null;
  constanciaNumero: string | null;
  constanciaFecha: string | null;
  estadoDelDocumento: string;
}

const REGLAS: Readonly<Record<string, string>> = {
  iva_exportador_agropecuario: 'IVA exportador agropecuario',
  iva_exportador: 'IVA exportador',
  iva_contribuyente_especial: 'IVA contribuyente especial',
  iva_otro_agente: 'IVA otro agente',
  iva_sector_publico: 'IVA sector público',
  iva_pequeno_contribuyente: 'IVA pequeño contribuyente (5 %)',
  isr_opcional_simplificado: 'ISR opcional simplificado',
  iva_factura_especial: 'IVA factura especial',
  isr_factura_especial: 'ISR factura especial',
};

const documentoDe = ({ documento }: RetencionDto): string =>
  [documento.tipoDte, documento.serie, documento.numero].filter(Boolean).join(' ');

type DatosDelGrupo = ReadonlyMap<string, { nombre: string; plazo: string }>;

function aFila(retencion: RetencionDto, grupos: DatosDelGrupo): FilaExportadaDeRetencion {
  const grupo = grupos.get(retencion.grupo);
  return {
    grupo: grupo?.nombre ?? retencion.grupo,
    plazoDelGrupo: grupo?.plazo ?? '',
    impuesto: retencion.impuesto.toUpperCase(),
    regla: REGLAS[retencion.regla] ?? retencion.regla,
    fecha: retencion.fecha,
    proveedorNit: retencion.proveedor.nit,
    proveedorNombre: retencion.proveedor.nombre,
    documento: documentoDe(retencion),
    uuid: retencion.documento.uuid,
    fechaEmision: retencion.documento.fechaEmision,
    base: retencion.base,
    porcentaje: retencion.porcentaje,
    propuesto: retencion.propuesto,
    retenido: retencion.retenido,
    enCero: retencion.enCero,
    motivoDelAjuste: retencion.motivoDelAjuste,
    constanciaNumero: retencion.constanciaNumero,
    constanciaFecha: retencion.constanciaFecha,
    estadoDelDocumento: retencion.documento.estado === 'anulado' ? 'Anulado' : 'Vigente',
  };
}

/** El reporte en filas planas para Excel: las de documentos vigentes y, después, las de anulados. */
export function aFilasExportadasDeRetenciones(reporte: ReporteDeRetencionesDto): FilaExportadaDeRetencion[] {
  const grupos: DatosDelGrupo = new Map(
    reporte.grupos.map((g) => [g.grupo as string, { nombre: g.nombre, plazo: g.plazo }]),
  );
  return [...reporte.retenciones, ...reporte.anuladas].map((retencion) => aFila(retencion, grupos));
}

/** Las columnas del Excel de retenciones: solo se exporta, nunca se importa. */
export const columnasDeRetenciones: Columna[] = [
  { clave: 'grupo', titulo: 'Grupo de entero', requerido: true, tipo: 'texto' },
  { clave: 'plazoDelGrupo', titulo: 'Plazo del entero', requerido: true, tipo: 'fecha' },
  { clave: 'impuesto', titulo: 'Impuesto', requerido: true, tipo: 'texto' },
  { clave: 'regla', titulo: 'Regla', requerido: true, tipo: 'texto' },
  { clave: 'fecha', titulo: 'Fecha de la retención', requerido: true, tipo: 'fecha' },
  { clave: 'proveedorNit', titulo: 'NIT del proveedor', requerido: false, tipo: 'texto' },
  { clave: 'proveedorNombre', titulo: 'Proveedor', requerido: true, tipo: 'texto' },
  { clave: 'documento', titulo: 'Documento', requerido: true, tipo: 'texto' },
  { clave: 'uuid', titulo: 'UUID de la FEL', requerido: false, tipo: 'texto' },
  { clave: 'fechaEmision', titulo: 'Fecha de emisión', requerido: true, tipo: 'fecha' },
  { clave: 'base', titulo: 'Base', requerido: true, tipo: 'decimal' },
  { clave: 'porcentaje', titulo: 'Porcentaje', requerido: false, tipo: 'decimal' },
  { clave: 'propuesto', titulo: 'Propuesto', requerido: true, tipo: 'decimal' },
  { clave: 'retenido', titulo: 'Retenido', requerido: true, tipo: 'decimal' },
  { clave: 'enCero', titulo: 'En cero (no se retuvo)', requerido: true, tipo: 'siNo' },
  { clave: 'motivoDelAjuste', titulo: 'Motivo del ajuste', requerido: false, tipo: 'texto' },
  { clave: 'constanciaNumero', titulo: 'Constancia', requerido: false, tipo: 'texto' },
  { clave: 'constanciaFecha', titulo: 'Fecha de la constancia', requerido: false, tipo: 'fecha' },
  { clave: 'estadoDelDocumento', titulo: 'Estado del documento', requerido: true, tipo: 'texto' },
];
