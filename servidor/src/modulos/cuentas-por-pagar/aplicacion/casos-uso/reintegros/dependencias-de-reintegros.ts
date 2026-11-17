import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ConsultasDeDocumentos } from '../../puertos/puertos-de-consultas.js';
import type { FechasDeEntrada, RepositorioDeDocumentos } from '../../puertos/puertos-de-documentos.js';
import type { DatosDeLaEmpresa } from '../../puertos/puertos-de-impresion-de-contrasenas.js';
import type { MovimientosDePagos, NombreDelNit, PagosEnBancos } from '../../puertos/puertos-de-pagos.js';
import type { ConsultasDeReintegros, RepositorioDeReintegros } from '../../puertos/puertos-de-reintegros.js';
import type { CargaInicial } from '../../puertos/puertos-de-saldos-iniciales.js';

/** Lo que necesitan los casos de uso de los reintegros del proveedor. */
export interface DependenciasDeReintegros {
  unidadDeTrabajo: UnidadDeTrabajo;
  documentos: RepositorioDeDocumentos;
  consultas: ConsultasDeDocumentos;
  reintegros: RepositorioDeReintegros;
  /** Lo que se lee de Terceros y de Bancos para mostrar el reintegro. */
  lecturas: ConsultasDeReintegros;
  empresa: DatosDeLaEmpresa;
  nombreDelNit: NombreDelNit;
  /** Las órdenes a Bancos (por el mediador): la nota de crédito del depósito y su anulación. */
  bancos: PagosEnBancos;
  /** Lo que se lee de Bancos sin orden: bloquear el movimiento, si está conciliado y su número. */
  movimientos: MovimientosDePagos;
  cargaInicial: CargaInicial;
  fechasDeEntrada: FechasDeEntrada;
  correlativos: Correlativos;
  auditoria: Auditoria;
  /** Se publica después de confirmar la transacción de la propia petición (o de la de Bancos, si llegó por aviso). */
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
}
