import type {
  ConsultaDeDocumentos,
  DestinoDeDocumento,
  EstadoBuscado,
  ProveedorParaFiltro,
  TipoDeDocumento,
} from '../../servicios/documentos.api';
import { DESTINOS_DE_DOCUMENTO, TIPOS_DE_DOCUMENTO } from '../../textos-de-documentos';

export const DOCUMENTOS_POR_PAGINA = 50;
const MESES_QUE_SE_OFRECEN = 24;
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Lo que el usuario escoge en la lista; el texto vacío significa «todos». El período va como `AAAA-MM`. */
export interface FiltrosDeDocumentos {
  periodo: string;
  proveedorId: string;
  estado: EstadoBuscado;
  destino: DestinoDeDocumento | '';
  tipo: TipoDeDocumento | '';
}

export interface OpcionDeFiltro<T extends string> {
  valor: T;
  texto: string;
}

const dosDigitos = (numero: number) => String(numero).padStart(2, '0');

/** El mes de una fecha como `AAAA-MM`, con la fecha del equipo. */
export const mesDe = (fecha: Date): string => `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}`;

/** Al abrir: el mes en curso y sin los anulados. */
export const filtrosIniciales = (hoy: Date): FiltrosDeDocumentos => ({
  periodo: mesDe(hoy),
  proveedorId: '',
  estado: 'vigente',
  destino: '',
  tipo: '',
});

/** Sin escoger nada, salvo que los anulados siguen ocultos. */
export const filtrosVacios = (): FiltrosDeDocumentos => ({
  periodo: '',
  proveedorId: '',
  estado: 'vigente',
  destino: '',
  tipo: '',
});

/** Lo que se manda al servidor: el período como el primer día del mes y nada de lo que quedó en «todos». */
export function consultaDeDocumentos(filtros: FiltrosDeDocumentos, pagina: number): ConsultaDeDocumentos {
  return {
    periodo: filtros.periodo ? `${filtros.periodo}-01` : undefined,
    proveedorId: filtros.proveedorId || undefined,
    estado: filtros.estado,
    destino: filtros.destino || undefined,
    tipo: filtros.tipo || undefined,
    pagina,
    limite: DOCUMENTOS_POR_PAGINA,
  };
}

/** Cuántos filtros distintos de «todos» hay (el estado cuenta solo si no es el de omisión). */
export function cantidadDeFiltros(filtros: FiltrosDeDocumentos): number {
  const puestos = [filtros.periodo, filtros.proveedorId, filtros.destino, filtros.tipo];
  return puestos.filter(Boolean).length + (filtros.estado === 'vigente' ? 0 : 1);
}

/** «octubre de 2026» a partir de `AAAA-MM` o `AAAA-MM-DD`. */
export function etiquetaDePeriodo(periodo: string): string {
  const [anio, mes] = periodo.split('-');
  const nombre = MESES[Number(mes) - 1];
  return nombre ? `${nombre} de ${anio}` : periodo;
}

const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** «Todos los períodos» y los últimos meses, del más reciente al más antiguo. */
export function opcionesDePeriodo(hoy: Date, actual = ''): OpcionDeFiltro<string>[] {
  const meses = Array.from({ length: MESES_QUE_SE_OFRECEN }, (_, atras) =>
    mesDe(new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1)),
  );
  // Un período más antiguo (si se llegara con él) no debe quedar sin etiqueta en el selector.
  const todos = actual && !meses.includes(actual) ? [...meses, actual] : meses;
  return [
    { valor: '', texto: 'Todos los períodos' },
    ...todos.map((mes) => ({ valor: mes, texto: conMayuscula(etiquetaDePeriodo(mes)) })),
  ];
}

export const OPCIONES_DE_ESTADO: OpcionDeFiltro<EstadoBuscado>[] = [
  { valor: 'vigente', texto: 'Vigentes' },
  { valor: 'anulado', texto: 'Anulados' },
  { valor: 'todos', texto: 'Todos' },
];

const porNombre = <T extends string>(textos: Record<T, string>, todos: string): OpcionDeFiltro<T | ''>[] => [
  { valor: '', texto: todos },
  ...(Object.entries(textos) as [T, string][])
    .map(([valor, texto]) => ({ valor, texto }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' })),
];

export const opcionesDeDestino = () => porNombre(DESTINOS_DE_DOCUMENTO, 'Todos los destinos');
export const opcionesDeTipo = () => porNombre(TIPOS_DE_DOCUMENTO, 'Todos los tipos');

/** «Todos los proveedores» y luego cada uno por nombre. */
export function opcionesDeProveedor(proveedores: ProveedorParaFiltro[]): OpcionDeFiltro<string>[] {
  const ordenados = [...proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  return [
    { valor: '', texto: 'Todos los proveedores' },
    ...ordenados.map(({ id, nombre }) => ({ valor: id, texto: nombre })),
  ];
}

export const paginasEnTotal = (total: number, limite: number): number => Math.max(1, Math.ceil(total / limite));

/** «1 a 50 de 120» para el pie de la lista. */
export function rangoMostrado(pagina: number, limite: number, total: number): string {
  if (total === 0) return '0 de 0';
  const desde = (pagina - 1) * limite + 1;
  return `${desde} a ${Math.min(pagina * limite, total)} de ${total}`;
}
