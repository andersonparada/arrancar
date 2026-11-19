import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type {
  BancarizacionDelLibro,
  ConceptosDeGasto,
  ConfiguracionDeComprobantes,
  ConsultasDeComprobantes,
  RepositorioDeComprobantes,
} from '../../puertos/puertos-de-comprobantes.js';
import type { ConsultasDeFondos, RepositorioDeFondos } from '../../puertos/puertos-de-fondos.js';

/** Lo que necesitan los casos de uso de los comprobantes. */
export interface DependenciasDeComprobantes {
  unidadDeTrabajo: UnidadDeTrabajo;
  fondos: RepositorioDeFondos;
  /** Las cifras del fondo (monto, pendiente y vales) para saber cuánto efectivo debe haber. */
  consultasDeFondos: ConsultasDeFondos;
  comprobantes: RepositorioDeComprobantes;
  consultas: ConsultasDeComprobantes;
  configuracion: ConfiguracionDeComprobantes;
  conceptos: ConceptosDeGasto;
  bancarizacion: BancarizacionDelLibro;
  correlativos: Correlativos;
  auditoria: Auditoria;
  /** Se publica después de confirmar la transacción de la petición (o la del libro, si llegó por orden o aviso). */
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
}
