import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { MovimientosDeBancos } from '../../puertos/puertos-de-bancos.js';
import type { RepositorioDeAnticipos } from '../../puertos/puertos-de-anticipos.js';
import type {
  BancarizacionDelLibro,
  ConsultasDeGastos,
  DocumentosDelLibro,
  PoliticaDeGastos,
  ReferenciasDelGasto,
  RepositorioDeGastos,
} from '../../puertos/puertos-de-gastos.js';

/** Lo que necesitan los casos de uso de los gastos de un anticipo. */
export interface DependenciasDeGastos {
  unidadDeTrabajo: UnidadDeTrabajo;
  gastos: RepositorioDeGastos;
  consultas: ConsultasDeGastos;
  documentos: DocumentosDelLibro;
  /** La bancarización la evalúa el libro por el mediador. */
  bancarizacion: BancarizacionDelLibro;
  referencias: ReferenciasDelGasto;
  politica: PoliticaDeGastos;
  /** Para bloquear el anticipo (con su movimiento de Bancos antes, siempre en el mismo orden). */
  anticipos: RepositorioDeAnticipos;
  movimientos: MovimientosDeBancos;
  auditoria: Auditoria;
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
}
