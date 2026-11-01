import type {
  CampoComparado,
  ClaveDeResultado,
  ConciliacionDelPeriodo,
  ItemDeConciliacion,
} from '../../servicios/conciliacion.api';
import { TARJETAS_DE_CONCILIACION, type AccionDeConciliacion } from '../../textos-de-la-conciliacion';

const CAMPOS_DE_DINERO: readonly CampoComparado[] = ['total', 'iva', 'idp', 'otrosImpuestos'];
const CAMPOS_DE_FECHA: readonly CampoComparado[] = ['fechaEmision'];

/** Cómo se escribe el valor de un campo comparado: dinero con moneda, fecha con formato y lo demás tal cual. */
export type TipoDeValor = 'dinero' | 'fecha' | 'texto';

export function tipoDeValorDelCampo(campo: CampoComparado): TipoDeValor {
  if (CAMPOS_DE_DINERO.includes(campo)) return 'dinero';
  return CAMPOS_DE_FECHA.includes(campo) ? 'fecha' : 'texto';
}

/** Cuántas líneas hay que revisar: lo que no cuadra o falta de algún lado. */
export function cantidadPorRevisar(conciliacion: Pick<ConciliacionDelPeriodo, 'resumen'>): number {
  return TARJETAS_DE_CONCILIACION.filter(({ porRevisar }) => porRevisar).reduce(
    (suma, { clave }) => suma + conciliacion.resumen[clave],
    0,
  );
}

/** Cuántas líneas hay en total, de cualquier resultado. */
export const cantidadConciliada = (conciliacion: Pick<ConciliacionDelPeriodo, 'resumen'>): number =>
  Object.values(conciliacion.resumen).reduce((suma, cantidad) => suma + cantidad, 0);

/** La clave del grupo que se abre al llegar: el primero que pide revisión; si no hay, el que cuadra. */
export function grupoInicial(conciliacion: Pick<ConciliacionDelPeriodo, 'resumen'>): ClaveDeResultado {
  const porRevisar = TARJETAS_DE_CONCILIACION.find(
    ({ clave, porRevisar: revisar }) => revisar && conciliacion.resumen[clave] > 0,
  );
  return porRevisar?.clave ?? 'cuadra';
}

type AccionesPorGrupo = (item: ItemDeConciliacion) => AccionDeConciliacion[];

const abrirSiHayDocumento: AccionesPorGrupo = (item) => (item.documentoId ? ['abrirDocumento'] : []);

/** De la fila de la SAT sin registrar: registrarla en la bandeja o descartarla, según su estado. */
const accionesDeLaSatSinRegistrar: AccionesPorGrupo = ({ estadoEnLaBandeja }) => {
  if (estadoEnLaBandeja === 'pendiente') return ['verEnLaBandeja', 'descartar'];
  return estadoEnLaBandeja === 'bloqueado' ? ['descartar'] : [];
};

const restaurarSiHayFila: AccionesPorGrupo = ({ dteId }) => (dteId ? ['restaurar'] : []);

const ACCIONES: Record<ClaveDeResultado, AccionesPorGrupo> = {
  cuadra: abrirSiHayDocumento,
  conDiferencias: abrirSiHayDocumento,
  enLaSatYNoEnArrancar: accionesDeLaSatSinRegistrar,
  enArrancarYNoEnLaSat: abrirSiHayDocumento,
  sinDatosDeLaSat: abrirSiHayDocumento,
  registradoEnOtroPeriodo: abrirSiHayDocumento,
  anuladoEnLaSatYVigenteAqui: abrirSiHayDocumento,
  descartado: restaurarSiHayFila,
};

/** Lo que el usuario puede hacer con una línea de ese grupo; el servidor sigue validando cada acción. */
export const accionesDelItem = (clave: ClaveDeResultado, item: ItemDeConciliacion): AccionDeConciliacion[] =>
  ACCIONES[clave](item);

/** El texto «A-123» o «123» del documento de una línea. */
export const numeroDelItem = ({ serie, numero }: Pick<ItemDeConciliacion, 'serie' | 'numero'>): string =>
  serie ? `${serie}-${numero}` : numero;

/** El título de una línea: «FACT A-123». */
export const tituloDelItem = (item: ItemDeConciliacion): string =>
  [item.tipoDte, numeroDelItem(item)].filter(Boolean).join(' ');
