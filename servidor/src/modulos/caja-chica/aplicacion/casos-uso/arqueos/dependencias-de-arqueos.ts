import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type {
  ComprobantesDelArqueo,
  ConfiguracionDeArqueos,
  ConsultasDeArqueos,
  RepositorioDeArqueos,
} from '../../puertos/puertos-de-arqueos.js';
import type { ConsultasDeFondos, RepositorioDeFondos } from '../../puertos/puertos-de-fondos.js';

/** Lo que necesitan los casos de uso de los arqueos. */
export interface DependenciasDeArqueos {
  unidadDeTrabajo: UnidadDeTrabajo;
  fondos: RepositorioDeFondos;
  /** Las cifras del fondo (monto, pendiente y vales) para saber cuánto efectivo debe haber. */
  consultasDeFondos: ConsultasDeFondos;
  arqueos: RepositorioDeArqueos;
  consultas: ConsultasDeArqueos;
  comprobantes: ComprobantesDelArqueo;
  configuracion: ConfiguracionDeArqueos;
  correlativos: Correlativos;
  auditoria: Auditoria;
  /** Se publica después de confirmar la transacción de la petición. */
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
  /** El instante de ahora (el reloj solo da el día); se inyecta para que las pruebas lo fijen. */
  ahora: () => Date;
}
