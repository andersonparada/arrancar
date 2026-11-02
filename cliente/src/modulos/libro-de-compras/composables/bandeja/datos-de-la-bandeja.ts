import type {
  ConsultaDeDteRecibidos,
  DteRecibido,
  EstadoDeDte,
  PropuestaDeDte,
} from '../../servicios/dte-recibidos.api';
import { FALTANTES } from '../../textos-de-la-bandeja';
import { sumarMontos } from '../documentos/detalles-de-documento';
import { CODIGO_DE_RECIBO, llevaFacturaAfectada, opcionesDeTipoSat } from '../documentos/tipos-de-documento-sat';

/** Filas por página de la bandeja y por solicitud de confirmación (tope del servidor). */
export const FILAS_POR_PAGINA = 50;
export const FILAS_POR_CONFIRMACION = 100;

/** Lo que el usuario escoge para acotar la lista; vacío es «todos». `proveedor` distingue los que se crearán al confirmar. */
export interface FiltrosDeLaBandeja {
  busqueda: string;
  tipoDte: string;
  desde: string;
  hasta: string;
  proveedor: '' | 'nuevo' | 'existente';
}

export const filtrosDeLaBandejaVacios = (): FiltrosDeLaBandeja => ({
  busqueda: '',
  tipoDte: '',
  desde: '',
  hasta: '',
  proveedor: '',
});

/** Cuántos filtros están puestos, para mostrar «Quitar filtros» solo cuando hace falta. */
export const cantidadDeFiltrosDeLaBandeja = (filtros: FiltrosDeLaBandeja): number =>
  Object.values(filtros).filter((valor) => valor.trim() !== '').length;

const CONDICION_DEL_PROVEEDOR = { nuevo: false, existente: true } as const;

/** La consulta al servidor de una pestaña: lo vacío no filtra. */
export function consultaDeLaBandeja(
  estado: EstadoDeDte,
  filtros: FiltrosDeLaBandeja,
  pagina: number,
): ConsultaDeDteRecibidos {
  const { busqueda, tipoDte, desde, hasta, proveedor } = filtros;
  return {
    estado,
    busqueda: busqueda.trim() || undefined,
    tipoDte: tipoDte || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    conProveedor: proveedor ? CONDICION_DEL_PROVEEDOR[proveedor] : undefined,
    pagina,
    limite: FILAS_POR_PAGINA,
  };
}

/** Lo que valdría para la fila hoy: lo que el usuario completó y, si falta, lo que se propone. */
export interface ValoresDeLaFila {
  proveedorId: string | null;
  conceptoId: string | null;
  destino: DteRecibido['borrador']['destino'];
  fechaRecepcion: string | null;
  periodo: string | null;
}

/** La recepción de una empresa agente de retención del IVA no se propone: la escribe el usuario. */
const recepcionPropuesta = (propuesta: PropuestaDeDte | null): string | null =>
  propuesta && !propuesta.recepcionObligatoria ? propuesta.fechaRecepcion : null;

/** Lo completado por el usuario y, si falta, lo propuesto. */
const elegir = <T>(completado: T | null, propuesto: T | null | undefined): T | null => completado ?? propuesto ?? null;

export function valoresDeLaFila({ borrador, propuesta }: Pick<DteRecibido, 'borrador' | 'propuesta'>): ValoresDeLaFila {
  return {
    proveedorId: elegir(borrador.proveedorId, propuesta?.proveedorId),
    conceptoId: elegir(borrador.conceptoId, propuesta?.conceptoId),
    destino: elegir(borrador.destino, propuesta?.destino),
    fechaRecepcion: elegir(borrador.fechaRecepcion, recepcionPropuesta(propuesta)),
    periodo: elegir(borrador.periodo, propuesta?.periodo),
  };
}

/** Lo que el usuario todavía debe decidir antes de confirmar la fila; el servidor tiene la última palabra. */
export function faltantesDeLaFila(fila: DteRecibido): string[] {
  if (fila.estado !== 'pendiente') return [];
  const valores = valoresDeLaFila(fila);
  const faltan: [boolean, string][] = [
    [!valores.conceptoId, FALTANTES.concepto],
    [!valores.destino, FALTANTES.destino],
    [!valores.fechaRecepcion, FALTANTES.recepcion],
    [llevaFacturaAfectada(fila.tipoDte) && !fila.borrador.documentoAfectadoId, FALTANTES.factura],
  ];
  return faltan.filter(([falta]) => falta).map(([, texto]) => texto);
}

/** Una fila pendiente sin proveedor: se crea al confirmar, con el NIT y el nombre que trae. */
export const tieneProveedorNuevo = (fila: DteRecibido): boolean =>
  fila.estado === 'pendiente' && valoresDeLaFila(fila).proveedorId === null;

export interface ProveedorNuevo {
  nit: string;
  nombre: string;
  filas: number;
}

/** Los proveedores que se crearán al confirmar, uno por NIT y por nombre. */
export function proveedoresNuevos(filas: readonly DteRecibido[]): ProveedorNuevo[] {
  const porNit = new Map<string, ProveedorNuevo>();
  for (const fila of filas.filter(tieneProveedorNuevo)) {
    const actual = porNit.get(fila.nitEmisor);
    porNit.set(fila.nitEmisor, {
      nit: fila.nitEmisor,
      nombre: actual?.nombre ?? fila.nombreEmisor,
      filas: (actual?.filas ?? 0) + 1,
    });
  }
  return [...porNit.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

/** Lo que el usuario debe saber antes de confirmar lo marcado. */
export interface ResumenDeLaSeleccion {
  cantidad: number;
  total: string;
  proveedoresNuevos: ProveedorNuevo[];
  conFaltantes: number;
  anuladasEnLaSat: number;
}

export function resumenDeLaSeleccion(filas: readonly DteRecibido[]): ResumenDeLaSeleccion {
  return {
    cantidad: filas.length,
    total: sumarMontos(filas.map(({ total }) => total)),
    proveedoresNuevos: proveedoresNuevos(filas),
    conFaltantes: filas.filter((fila) => faltantesDeLaFila(fila).length > 0).length,
    anuladasEnLaSat: filas.filter(({ estadoSat }) => estadoSat === 'anulado').length,
  };
}

/** Parte la lista en grupos del tamaño que acepta el servidor. */
export function enGrupos<T>(lista: readonly T[], tamano: number): T[][] {
  const grupos: T[][] = [];
  for (let desde = 0; desde < lista.length; desde += tamano) grupos.push(lista.slice(desde, desde + tamano));
  return grupos;
}

/** El título de una fila: «FACT A-123». */
export const tituloDeLaFila = ({ tipoDte, serie, numero }: Pick<DteRecibido, 'tipoDte' | 'serie' | 'numero'>): string =>
  `${tipoDte} ${serie ? `${serie}-` : ''}${numero}`;

/** Las opciones del filtro de proveedor; quien no puede crear proveedores debe crearlos antes en Proveedores. */
export const opcionesDeProveedor = (
  puedeCrear: boolean,
): { valor: FiltrosDeLaBandeja['proveedor']; texto: string }[] => [
  { valor: '', texto: 'Todos' },
  { valor: 'existente', texto: 'Con proveedor' },
  {
    valor: 'nuevo',
    texto: puedeCrear ? 'Proveedor nuevo (se crea al confirmar)' : 'Proveedor nuevo (falta crearlo en Proveedores)',
  },
];

/** «Todos los tipos» y luego los códigos de la SAT, agrupados como en el formulario. */
export const opcionesDeTipoDeDte = () => [
  { valor: '', texto: 'Todos los tipos' },
  ...opcionesDeTipoSat().filter(({ valor }) => valor !== CODIGO_DE_RECIBO),
];
