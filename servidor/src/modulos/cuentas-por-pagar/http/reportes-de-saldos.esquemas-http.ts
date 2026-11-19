import { z } from 'zod';
import { ESTADOS_DE_PAGO } from '../dominio/pagos.js';
import { ORIGENES_DE_DOCUMENTO, TIPOS_DE_DOCUMENTO, type TipoDeDocumento } from '../dominio/tipos-de-documento.js';
import type { SolicitudDeDocumentosAUnaFecha } from '../aplicacion/casos-uso/reportes/reporte-de-documentos-a-una-fecha.js';

const LIMITE_POR_OMISION = 50;
/** El máximo es lo que se imprime de una vez (CP5-h). */
const LIMITE_MAXIMO = 2000;

const comoBooleano = z.enum(['true', 'false']).transform((valor) => valor === 'true');
const AUTORIZACION = z.enum(['todos', 'autorizados', 'sin_autorizar']).default('todos');
type TipoDeCargo = Exclude<TipoDeDocumento, 'nota_de_credito'>;
const TIPOS_DE_CARGO = TIPOS_DE_DOCUMENTO.filter((tipo): tipo is TipoDeCargo => tipo !== 'nota_de_credito') as [
  TipoDeCargo,
  ...TipoDeCargo[],
];

/** R1: el corte (hoy si falta), un proveedor, qué autorización entra, si salen los que están en cero y el orden. */
export const esquemaFiltroDeSaldosPorProveedor = z.object({
  corte: z.iso.date().optional(),
  proveedorId: z.uuid().optional(),
  autorizacion: AUTORIZACION,
  incluirSinSaldo: comoBooleano.default(false),
  orden: z.enum(['nombre', 'mayor_saldo']).default('nombre'),
});

const emisionValida = ({ emitidosDesde, emitidosHasta }: { emitidosDesde?: string; emitidosHasta?: string }) =>
  !emitidosDesde || !emitidosHasta || emitidosDesde <= emitidosHasta;

/**
 * R2: lo de R1 más tipo, origen, vencidos, vence hasta, sin contraseña, estado de pago, emisión y retenciones por
 * practicar. `vista` solo la usa el cliente para preajustar; el servidor la ignora. Sin `estadoDePago`, solo entran los
 * cargos con saldo al corte.
 */
export const esquemaFiltroDeDocumentosAUnaFecha = z
  .object({
    corte: z.iso.date().optional(),
    proveedorId: z.uuid().optional(),
    autorizacion: AUTORIZACION,
    vista: z.string().max(40).optional(),
    tipo: z.enum(TIPOS_DE_CARGO).optional(),
    origen: z.enum(ORIGENES_DE_DOCUMENTO).optional(),
    vencidos: comoBooleano.default(false),
    venceHasta: z.iso.date().optional(),
    sinContrasena: comoBooleano.default(false),
    estadoDePago: z.enum(ESTADOS_DE_PAGO).optional(),
    emitidosDesde: z.iso.date().optional(),
    emitidosHasta: z.iso.date().optional(),
    conRetencionesPorPracticar: comoBooleano.default(false),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).default(LIMITE_POR_OMISION),
  })
  .refine(emisionValida, { message: 'La fecha inicial no puede ser posterior a la final.', path: ['emitidosDesde'] });

export type FiltroDeSaldosPorProveedorSolicitado = z.output<typeof esquemaFiltroDeSaldosPorProveedor>;
export type FiltroDeDocumentosAUnaFechaSolicitado = z.output<typeof esquemaFiltroDeDocumentosAUnaFecha>;

/** Separa lo que filtra de lo que pagina; `vista` no llega al caso de uso. */
export function separarPaginacion(consulta: FiltroDeDocumentosAUnaFechaSolicitado) {
  const { pagina, limite, vista: _vista, ...filtro } = consulta;
  const solicitud: SolicitudDeDocumentosAUnaFecha = filtro;
  return { solicitud, pagina: { pagina, limite } };
}
