import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { FondosEnBancos } from '../../puertos/puertos-de-bancos.js';
import type { ConsultasDeFondos, ReferenciasDeFondos, RepositorioDeFondos } from '../../puertos/puertos-de-fondos.js';
import type {
  ComprobantesParaReponer,
  ConciliacionDeMovimientos,
  ConfiguracionDeControl,
  ConsultasDeReposiciones,
  LibroParaReponer,
  RepositorioDeReposiciones,
} from '../../puertos/puertos-de-reposiciones.js';

/** Lo que necesitan los casos de uso de las reposiciones. */
export interface DependenciasDeReposiciones {
  unidadDeTrabajo: UnidadDeTrabajo;
  fondos: RepositorioDeFondos;
  /** Las cifras del fondo (monto, pendiente y vales) para saber cuánto efectivo debe haber. */
  consultasDeFondos: ConsultasDeFondos;
  referencias: Pick<ReferenciasDeFondos, 'exigirCuentaBancaria'>;
  reposiciones: RepositorioDeReposiciones;
  consultas: ConsultasDeReposiciones;
  comprobantes: ComprobantesParaReponer;
  /** Las órdenes a Bancos (por el mediador): el cheque o la nota de la reposición y su anulación. */
  bancos: FondosEnBancos;
  conciliacion: ConciliacionDeMovimientos;
  libro: LibroParaReponer;
  configuracion: ConfiguracionDeControl;
  correlativos: Correlativos;
  auditoria: Auditoria;
  /** Se publica después de confirmar la transacción de la petición (o la de Bancos, si llegó por aviso). */
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
}
