import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto, formatearNit } from '@/modulos/core/utilidades/formato';
import type {
  CuadreDeProveedor,
  EstadoDeLaCarga,
  ProveedorParaSaldo,
  SaldoInicial,
  TotalesDelCuadre,
} from '../../servicios/tipos-de-saldos-iniciales';
import type { TipoDeDocumento } from '../../servicios/tipos';
import { TIPOS_DE_DOCUMENTO } from '../../textos';
import { tituloDeDocumento } from '../detalles-de-documento';

/** Cómo está la carga, para el encabezado y para saber si se puede cargar. */
export interface SituacionDeLaCarga {
  situacion: 'sin-fecha' | 'cerrada' | 'abierta';
  texto: string;
  /** Solo con la carga abierta se agregan saldos nuevos. */
  puedeCargar: boolean;
}

export function situacionDeLaCarga(carga: EstadoDeLaCarga): SituacionDeLaCarga {
  if (!carga.fechaDeInicio) {
    return {
      situacion: 'sin-fecha',
      texto: 'Falta la fecha de inicio de la empresa: sin ella no se pueden cargar saldos iniciales.',
      puedeCargar: false,
    };
  }
  const fecha = formatearFecha(carga.fechaDeInicio);
  return carga.cerrada
    ? { situacion: 'cerrada', texto: `Fecha de inicio: ${fecha} · Carga cerrada`, puedeCargar: false }
    : { situacion: 'abierta', texto: `Fecha de inicio: ${fecha} · Carga abierta`, puedeCargar: true };
}

/** Qué hacer cuando no se puede cargar; vacío si la carga está abierta. */
export function ayudaDeLaCarga(situacion: SituacionDeLaCarga['situacion']): string {
  if (situacion === 'sin-fecha') return 'Escríbala en la ficha de la empresa y vuelva aquí.';
  if (situacion === 'cerrada') {
    return 'Ya no se agregan, corrigen ni eliminan saldos. Para cambiar uno, reabra la carga en la ficha de la empresa.';
  }
  return '';
}

export const tituloDeSaldo = tituloDeDocumento;

/** Los datos de la tarjeta de un saldo: lo cargado y lo que se debe hoy. */
export function detallesDeSaldo(saldo: SaldoInicial): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Emisión', valor: formatearFecha(saldo.fechaEmision) },
    { etiqueta: 'Vence', valor: saldo.vencimiento ? formatearFecha(saldo.vencimiento) : '—' },
    { etiqueta: 'Total', valor: formatearMonto(saldo.total) },
    { etiqueta: 'Saldo pendiente al inicio', valor: formatearMonto(saldo.saldoPendiente) },
    { etiqueta: 'Saldo de hoy', valor: formatearMonto(saldo.saldo) },
  ];
  if (saldo.referencia) detalles.push({ etiqueta: 'Referencia anterior', valor: saldo.referencia });
  return detalles;
}

/** Lo que va a pasar al eliminar, para leerlo antes de confirmar. */
export function resumenDeEliminacionDeSaldo(saldo: SaldoInicial): string {
  return `Se eliminará ${tituloDeSaldo(saldo)} de ${saldo.proveedorNombre} por ${formatearMonto(saldo.saldoPendiente)} de saldo pendiente. Se borra de verdad y queda en la auditoría; si se cargó por error, después puede cargarlo bien.`;
}

const porNombre = (a: { texto: string }, b: { texto: string }): number =>
  a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' });

/** Los tipos de documento por nombre, para el selector. */
export function opcionesDeTipoDeSaldo(): { valor: TipoDeDocumento; texto: string }[] {
  return (Object.entries(TIPOS_DE_DOCUMENTO) as [TipoDeDocumento, string][])
    .map(([valor, texto]) => ({ valor, texto }))
    .sort(porNombre);
}

/** «Todos los proveedores» y luego cada uno por nombre (para el filtro). */
export function opcionesDeProveedorParaFiltro(proveedores: ProveedorParaSaldo[]): { valor: string; texto: string }[] {
  const ordenados = proveedores.map(({ id, nombre }) => ({ valor: id, texto: nombre })).sort(porNombre);
  return [{ valor: '', texto: 'Todos los proveedores' }, ...ordenados];
}

/** Los proveedores activos por nombre y, al corregir, también el que ya tenía el saldo aunque se haya inactivado. */
export function opcionesDeProveedorParaCargar(
  proveedores: ProveedorParaSaldo[],
  actual: string | null,
): { valor: string | null; texto: string }[] {
  const elegibles = proveedores
    .filter(({ activo, id }) => activo || id === actual)
    .map(({ id, nombre, activo }) => ({ valor: id, texto: activo ? nombre : `${nombre} (inactivo)` }))
    .sort(porNombre);
  return [{ valor: null, texto: 'Elija el proveedor' }, ...elegibles];
}

/** Los totales generales del cuadre, cada uno por separado (no un solo neto). */
export function detallesDelCuadre(totales: TotalesDelCuadre): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Documentos', valor: String(totales.documentos) },
    { etiqueta: 'Cargos', valor: formatearMonto(totales.cargos) },
    { etiqueta: 'Notas a favor', valor: formatearMonto(totales.notasAFavor) },
    { etiqueta: 'Neto (cargos menos notas)', valor: formatearMonto(totales.neto) },
    { etiqueta: 'Retenciones por practicar', valor: formatearMonto(totales.retencionesPorPracticar) },
  ];
}

/** Una fila del cuadre por proveedor: su nombre, su NIT y sus totales. */
export function filaDelCuadre(proveedor: CuadreDeProveedor): { titulo: string; detalles: DetalleDeRegistro[] } {
  return {
    titulo: proveedor.proveedorNombre,
    detalles: [
      { etiqueta: 'NIT', valor: proveedor.proveedorNit ? formatearNit(proveedor.proveedorNit) : '—' },
      ...detallesDelCuadre(proveedor),
    ],
  };
}
