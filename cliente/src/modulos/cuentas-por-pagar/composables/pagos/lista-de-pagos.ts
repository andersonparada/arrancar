import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { ConsultaDePagos, EstadoBuscadoDePago, FormaDePago, PagoResumen } from '../../servicios/tipos-de-pagos';
import { nombreDeLaForma } from './detalles-de-pago';

export const PAGOS_POR_PAGINA = 24;

/** Lo que el usuario escoge en «Pagos»; el texto vacío significa «todos». */
export interface FiltrosDePagos {
  proveedorId: string;
  forma: FormaDePago | '';
  estado: EstadoBuscadoDePago;
  /** `''` todos, `'si'` solo los cheques posfechados (comprometidos). */
  posfechado: '' | 'si';
  desde: string;
  hasta: string;
  cuentaBancariaId: string;
}

/** Al abrir: los pagos vigentes, que son los que cuentan. */
export const filtrosInicialesDePagos = (): FiltrosDePagos => ({
  proveedorId: '',
  forma: '',
  estado: 'vigente',
  posfechado: '',
  desde: '',
  hasta: '',
  cuentaBancariaId: '',
});

export const OPCIONES_DE_ESTADO_DE_PAGO: { valor: EstadoBuscadoDePago; texto: string }[] = [
  { valor: 'vigente', texto: 'Vigentes' },
  { valor: 'anulado', texto: 'Anulados' },
  { valor: 'todos', texto: 'Todos' },
];

export const OPCIONES_DE_POSFECHADO: { valor: '' | 'si'; texto: string }[] = [
  { valor: '', texto: 'Todos' },
  { valor: 'si', texto: 'Solo posfechados (comprometidos)' },
];

const FORMAS: FormaDePago[] = ['cheque', 'nota_de_debito', 'nota_ligada', 'cuenta_de_apertura', 'efectivo'];

/** Las formas por nombre, para el selector. */
export const OPCIONES_DE_FORMA: { valor: FormaDePago | ''; texto: string }[] = [
  { valor: '', texto: 'Todas las formas' },
  ...FORMAS.map((forma) => ({ valor: forma, texto: nombreDeLaForma(forma) })).sort((a, b) =>
    a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }),
  ),
];

/** Lo que se manda al servidor: nada de lo que quedó en «todos». */
export function consultaDePagos(filtros: FiltrosDePagos, pagina: number): ConsultaDePagos {
  return {
    proveedorId: filtros.proveedorId || undefined,
    forma: filtros.forma || undefined,
    estado: filtros.estado,
    posfechado: filtros.posfechado === 'si' ? true : undefined,
    desde: filtros.desde || undefined,
    hasta: filtros.hasta || undefined,
    cuentaBancariaId: filtros.cuentaBancariaId || undefined,
    pagina,
    limite: PAGOS_POR_PAGINA,
  };
}

/** Cuántos filtros distintos de la forma de abrir hay. */
export function cantidadDeFiltrosDePagos(filtros: FiltrosDePagos): number {
  const { estado, ...resto } = filtros;
  return Object.values(resto).filter(Boolean).length + (estado === 'vigente' ? 0 : 1);
}

/** Cómo se lee la forma en una fila: «Cheque 1523 · Banco X», «Efectivo · Retiro 15» o solo la forma. */
export function formaDeLaFila(pago: Pick<PagoResumen, 'forma' | 'movimiento' | 'retiro'>): string {
  const nombre = nombreDeLaForma(pago.forma);
  if (pago.retiro) return `${nombre} · Retiro ${pago.retiro.numero}`;
  if (!pago.movimiento) return nombre;
  const numero = pago.movimiento.numero === null ? '' : ` ${pago.movimiento.numero}`;
  return `${nombre}${numero} · ${pago.movimiento.cuentaBancariaNombre}`;
}

/** Lo anulado manda sobre lo posfechado. */
export function marcaDeLaFila(pago: Pick<PagoResumen, 'estado' | 'posfechado'>): string | undefined {
  if (pago.estado === 'anulado') return 'Anulado';
  return pago.posfechado ? 'Posfechado' : undefined;
}

/** Los datos de una tarjeta de la lista. */
export function detallesDeLaFila(pago: PagoResumen): DetalleDeRegistro[] {
  const contrasenas = pago.contrasenas.map(({ numero }) => numero).join(', ');
  return [
    { etiqueta: 'Proveedor', valor: pago.proveedor.nombre },
    { etiqueta: 'Forma', valor: formaDeLaFila(pago) },
    { etiqueta: 'Fecha', valor: formatearFecha(pago.fecha) },
    { etiqueta: 'Monto', valor: formatearMonto(pago.monto) },
    ...(contrasenas
      ? [{ etiqueta: pago.contrasenas.length > 1 ? 'Contraseñas' : 'Contraseña', valor: contrasenas }]
      : []),
    ...(pago.fechaDeAnulacion ? [{ etiqueta: 'Anulado el', valor: formatearFecha(pago.fechaDeAnulacion) }] : []),
  ];
}
