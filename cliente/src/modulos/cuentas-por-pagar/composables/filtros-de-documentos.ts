import type {
  ConsultaDeDocumentos,
  EstadoBuscado,
  OrigenDelDocumento,
  ProveedorParaFiltro,
  TipoDeDocumento,
} from '../servicios/tipos';
import { TIPOS_DE_DOCUMENTO } from '../textos';

export const DOCUMENTOS_POR_PAGINA = 50;

/** Lo que el usuario escoge en la lista; el texto vacío significa «todos». Las fechas son de emisión (`AAAA-MM-DD`). */
export interface FiltrosDeDocumentos {
  proveedorId: string;
  estado: EstadoBuscado;
  tipo: TipoDeDocumento | '';
  origen: OrigenDelDocumento | '';
  emitidosDesde: string;
  emitidosHasta: string;
  soloVencidos: boolean;
}

export interface OpcionDeFiltro<T extends string> {
  valor: T;
  texto: string;
}

/** Al abrir: todo lo vigente, es decir, sin lo anulado. */
export const filtrosIniciales = (): FiltrosDeDocumentos => ({
  proveedorId: '',
  estado: 'vigente',
  tipo: '',
  origen: '',
  emitidosDesde: '',
  emitidosHasta: '',
  soloVencidos: false,
});

/** Lo que se manda al servidor: nada de lo que quedó en «todos». */
export function consultaDeDocumentos(filtros: FiltrosDeDocumentos, pagina: number): ConsultaDeDocumentos {
  return {
    proveedorId: filtros.proveedorId || undefined,
    estado: filtros.estado,
    tipo: filtros.tipo || undefined,
    origen: filtros.origen || undefined,
    emitidosDesde: filtros.emitidosDesde || undefined,
    emitidosHasta: filtros.emitidosHasta || undefined,
    soloVencidos: filtros.soloVencidos || undefined,
    pagina,
    limite: DOCUMENTOS_POR_PAGINA,
  };
}

/** Cuántos filtros distintos de la forma de abrir hay (el estado cuenta solo si no es el de omisión). */
export function cantidadDeFiltros(filtros: FiltrosDeDocumentos): number {
  const puestos = [filtros.proveedorId, filtros.tipo, filtros.origen, filtros.emitidosDesde, filtros.emitidosHasta];
  return puestos.filter(Boolean).length + (filtros.soloVencidos ? 1 : 0) + (filtros.estado === 'vigente' ? 0 : 1);
}

export const OPCIONES_DE_ESTADO: OpcionDeFiltro<EstadoBuscado>[] = [
  { valor: 'vigente', texto: 'Vigentes' },
  { valor: 'pendiente', texto: 'Por completar' },
  { valor: 'registrado', texto: 'Por autorizar' },
  { valor: 'autorizado', texto: 'Autorizados' },
  { valor: 'anulado', texto: 'Anulados' },
  { valor: 'todos', texto: 'Todos' },
];

export const OPCIONES_DE_ORIGEN: OpcionDeFiltro<OrigenDelDocumento | ''>[] = [
  { valor: '', texto: 'Todos los orígenes' },
  { valor: 'libro_de_compras', texto: 'Libro de compras' },
  { valor: 'saldo_inicial', texto: 'Saldo inicial' },
];

const porTexto = (a: { texto: string }, b: { texto: string }): number =>
  a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' });

/** «Todos los tipos» y luego cada uno por nombre. */
export function opcionesDeTipo(): OpcionDeFiltro<TipoDeDocumento | ''>[] {
  const tipos = (Object.entries(TIPOS_DE_DOCUMENTO) as [TipoDeDocumento, string][])
    .map(([valor, texto]) => ({ valor, texto }))
    .sort(porTexto);
  return [{ valor: '', texto: 'Todos los tipos' }, ...tipos];
}

/** «Todos los proveedores» y luego cada uno por nombre. */
export function opcionesDeProveedor(proveedores: ProveedorParaFiltro[]): OpcionDeFiltro<string>[] {
  const ordenados = proveedores.map(({ id, nombre }) => ({ valor: id, texto: nombre })).sort(porTexto);
  return [{ valor: '', texto: 'Todos los proveedores' }, ...ordenados];
}

export const paginasEnTotal = (total: number, limite: number): number => Math.max(1, Math.ceil(total / limite));

/** «1 a 50 de 120» para el pie de la lista. */
export function rangoMostrado(pagina: number, limite: number, total: number): string {
  if (total === 0) return '0 de 0';
  const desde = (pagina - 1) * limite + 1;
  return `${desde} a ${Math.min(pagina * limite, total)} de ${total}`;
}
