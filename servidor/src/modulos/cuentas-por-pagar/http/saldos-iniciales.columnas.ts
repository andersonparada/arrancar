import { z } from 'zod';
import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';
import { esquemaSaldoInicial } from './saldos-iniciales.esquemas-http.js';
import { NOMBRES_DE_TIPOS } from './saldos-iniciales.nombres-de-tipos.js';

/** Las columnas del Excel de los saldos iniciales: los mismos datos del formulario, en el mismo orden. */
export const columnasDeSaldosIniciales = (opciones: {
  proveedorId: () => Promise<OpcionDeReferencia[]>;
}): Columna[] => [
  {
    clave: 'proveedorId',
    titulo: 'Proveedor',
    requerido: true,
    tipo: 'referencia',
    campoDeNombre: 'proveedorNombre',
    tambienPorCodigo: true,
    opciones: opciones.proveedorId,
  },
  { clave: 'tipo', titulo: 'Tipo', requerido: true, tipo: 'lista', opciones: NOMBRES_DE_TIPOS },
  { clave: 'serie', titulo: 'Serie', requerido: false, tipo: 'texto' },
  { clave: 'numero', titulo: 'Número', requerido: true, tipo: 'texto' },
  { clave: 'referencia', titulo: 'Referencia del sistema anterior', requerido: false, tipo: 'texto' },
  { clave: 'fechaEmision', titulo: 'Fecha de emisión', requerido: true, tipo: 'fecha' },
  { clave: 'vencimiento', titulo: 'Vencimiento', requerido: false, tipo: 'fecha' },
  { clave: 'total', titulo: 'Total', requerido: true, tipo: 'decimal' },
  { clave: 'retenciones', titulo: 'Retenciones (todas)', requerido: false, tipo: 'decimal' },
  { clave: 'retencionesPorPracticar', titulo: 'Retenciones por practicar', requerido: false, tipo: 'decimal' },
  { clave: 'saldoPendiente', titulo: 'Saldo pendiente', requerido: true, tipo: 'decimal' },
  { clave: 'tieneActivoFijo', titulo: 'Activo fijo', requerido: false, tipo: 'siNo' },
];

/** Una celda de dinero vacía vale cero: el Excel la entrega como `null` y el esquema espera su predeterminado. */
const conValor = (valor: unknown) => valor !== null && valor !== undefined;

const sinVacios = (datos: unknown) => {
  if (typeof datos !== 'object' || datos === null) return datos;
  const { retenciones, retencionesPorPracticar, ...resto } = datos as Record<string, unknown>;
  return {
    ...resto,
    ...(conValor(retenciones) ? { retenciones } : {}),
    ...(conValor(retencionesPorPracticar) ? { retencionesPorPracticar } : {}),
  };
};

/** El esquema del formulario, con las retenciones vacías tomadas como cero. */
export const esquemaDeSaldoInicialEnExcel = z.preprocess(sinVacios, esquemaSaldoInicial);

/** Los textos del contador para la hoja de instrucciones (C-U8-1 a C-U8-4). */
export const NOTAS_DE_SALDOS_INICIALES = [
  'Cargue solo los documentos registrados en el sistema anterior que siguen pendientes de pago al cierre del día anterior a la fecha de inicio de la empresa. Lo emitido antes pero no registrado allá va al Libro de compras.',
  'Proveedor: escríbalo como está en Proveedores o con su NIT (el código del proveedor es su NIT).',
  'Fechas: día/mes/año con el año de cuatro cifras, por ejemplo 15/03/2025. Si deja vacío el vencimiento, el ensayo muestra el que se propone.',
  'Retenciones: todas las del documento, ya practicadas o no.',
  'Saldo pendiente: lo que falta pagarle al proveedor, sin retenciones (total menos retenciones menos lo pagado y las notas anteriores a la fecha de inicio).',
  'Retenciones por practicar: la parte de las retenciones que la empresa todavía no practicó. Es informativa: no cambia el saldo pendiente; al pagar, la empresa emite la constancia y la entera.',
  'Una nota de crédito con saldo a favor se carga con su saldo libre. Un anticipo a proveedor no es una nota de crédito: no se carga aquí.',
  'Solo quetzales.',
];
