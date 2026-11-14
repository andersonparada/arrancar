import type { ConsultaDeDocumentos, DocumentoPorPagar, EstadoBuscado } from '../servicios/tipos';
import { DOCUMENTOS_POR_PAGINA } from './filtros-de-documentos';

/** Lo que el usuario escoge en «Notas de crédito»; el texto vacío significa «todos». Las fechas son de emisión. */
export interface FiltrosDeNotas {
  proveedorId: string;
  estado: EstadoBuscado;
  /** Solo las notas con saldo libre (por omisión) o todas. */
  conSaldo: boolean;
  emitidasDesde: string;
  emitidasHasta: string;
}

/** Al abrir: las notas vigentes que todavía tienen saldo a favor. */
export const filtrosInicialesDeNotas = (): FiltrosDeNotas => ({
  proveedorId: '',
  estado: 'vigente',
  conSaldo: true,
  emitidasDesde: '',
  emitidasHasta: '',
});

/** Lo que se manda al servidor: siempre notas de crédito, y nada de lo que quedó en «todos». */
export function consultaDeNotas(filtros: FiltrosDeNotas, pagina: number): ConsultaDeDocumentos {
  return {
    tipo: 'nota_de_credito',
    proveedorId: filtros.proveedorId || undefined,
    estado: filtros.estado,
    conSaldo: filtros.conSaldo || undefined,
    emitidosDesde: filtros.emitidasDesde || undefined,
    emitidosHasta: filtros.emitidasHasta || undefined,
    pagina,
    limite: DOCUMENTOS_POR_PAGINA,
  };
}

/** Cuántos filtros distintos de la forma de abrir hay. */
export function cantidadDeFiltrosDeNotas(filtros: FiltrosDeNotas): number {
  const puestos = [filtros.proveedorId, filtros.emitidasDesde, filtros.emitidasHasta];
  return puestos.filter(Boolean).length + (filtros.conSaldo ? 0 : 1) + (filtros.estado === 'vigente' ? 0 : 1);
}

export const OPCIONES_DE_ESTADO_DE_NOTA: { valor: EstadoBuscado; texto: string }[] = [
  { valor: 'vigente', texto: 'Vigentes' },
  { valor: 'registrado', texto: 'Por autorizar' },
  { valor: 'autorizado', texto: 'Autorizadas' },
  { valor: 'pendiente', texto: 'Por completar' },
  { valor: 'anulado', texto: 'Anuladas' },
  { valor: 'todos', texto: 'Todas' },
];

export interface SaldoAFavorDeProveedor {
  proveedorId: string;
  proveedorNombre: string;
  /** Texto con dos decimales. */
  saldo: string;
  notas: number;
}

const aCentavos = (monto: string): number => Math.round(Number(monto) * 100);

/** El saldo a favor de las notas dadas, sumado por proveedor y ordenado por nombre; sin saldo libre no cuenta. */
export function saldosAFavorPorProveedor(notas: DocumentoPorPagar[]): SaldoAFavorDeProveedor[] {
  const porProveedor = new Map<string, { nombre: string; centavos: number; notas: number }>();
  for (const nota of notas) {
    const centavos = aCentavos(nota.saldo);
    if (nota.estado === 'anulado' || centavos <= 0) continue;
    const actual = porProveedor.get(nota.proveedorId) ?? { nombre: nota.proveedorNombre, centavos: 0, notas: 0 };
    porProveedor.set(nota.proveedorId, { ...actual, centavos: actual.centavos + centavos, notas: actual.notas + 1 });
  }
  return [...porProveedor.entries()]
    .map(([proveedorId, { nombre, centavos, notas: cantidad }]) => ({
      proveedorId,
      proveedorNombre: nombre,
      saldo: (centavos / 100).toFixed(2),
      notas: cantidad,
    }))
    .sort((a, b) => a.proveedorNombre.localeCompare(b.proveedorNombre, 'es', { sensitivity: 'base' }));
}

/** Los montos de una tarjeta: total, lo aplicado y lo ajustado (el saldo libre va aparte, destacado). */
export function detallesDeNota(nota: DocumentoPorPagar) {
  return [
    { etiqueta: 'Total', clave: 'total', monto: nota.total },
    { etiqueta: 'Aplicado', clave: 'aplicado', monto: nota.aplicado },
    { etiqueta: 'Ajustado', clave: 'ajustado', monto: nota.ajustado },
  ];
}
