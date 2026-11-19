import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { RepositorioDeAjustes } from '../../puertos/puertos-de-ajustes.js';
import type { RepositorioDeContrasenas } from '../../puertos/puertos-de-contrasenas.js';
import type {
  ConsultasDeChequesDeApertura,
  ConsultasDeDocumentos,
  FilaDeDocumento,
} from '../../puertos/puertos-de-consultas.js';
import type {
  FechasDeEntrada,
  RepositorioDeDocumentos,
  UmbralDeBancarizacion,
} from '../../puertos/puertos-de-documentos.js';
import type {
  ConsultasDePagos,
  DatosFiscalesDeLaEmpresa,
  MovimientosDePagos,
  NombreDelNit,
  PagosEnBancos,
  RepositorioDePagos,
  RetencionesDelLibro,
  TopeDeDiferenciaDelPago,
} from '../../puertos/puertos-de-pagos.js';
import type { NotasParaLigar } from '../../puertos/puertos-de-notas-para-ligar.js';
import type { ConsultasDeRetiros, RepositorioDeRetiros } from '../../puertos/puertos-de-retiros.js';
import type { CargaInicial } from '../../puertos/puertos-de-saldos-iniciales.js';
import type { ReglaDePago } from '../../../dominio/reglas-de-anulacion-de-pagos.js';

/** El recurso con que se audita la diferencia de un cargo (el mismo de los ajustes de notas). */
export { RECURSO_DE_AJUSTES } from '../ajustes/dependencias-de-ajustes.js';

/** Lo que necesita registrar un pago con cheque o con nota de débito. */
export interface DependenciasDeRegistrarPago {
  unidadDeTrabajo: UnidadDeTrabajo;
  documentos: RepositorioDeDocumentos;
  consultas: ConsultasDeDocumentos;
  contrasenas: RepositorioDeContrasenas;
  pagos: RepositorioDePagos;
  consultasDePagos: ConsultasDePagos;
  ajustes: RepositorioDeAjustes;
  bancos: PagosEnBancos;
  /** Las notas de Bancos que se pueden ligar a un pago (se bloquean antes que las contraseñas y los cargos). */
  notas: NotasParaLigar;
  retenciones: RetencionesDelLibro;
  nombreDelNit: NombreDelNit;
  fiscal: DatosFiscalesDeLaEmpresa;
  umbral: UmbralDeBancarizacion;
  topeDeDiferencia: TopeDeDiferenciaDelPago;
  cargaInicial: CargaInicial;
  fechasDeEntrada: FechasDeEntrada;
  correlativos: Correlativos;
  auditoria: Auditoria;
  /** Se publica después de confirmar la transacción de la propia petición. */
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
}

/** Lo que necesitan las consultas de la ventana de pago: los cargos del proveedor y los proveedores por pagar. */
export interface DependenciasParaPagar {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeDocumentos;
  consultasDePagos: ConsultasDePagos;
  retenciones: RetencionesDelLibro;
  nombreDelNit: NombreDelNit;
  pagos: RepositorioDePagos;
  umbral: UmbralDeBancarizacion;
  topeDeDiferencia: TopeDeDiferenciaDelPago;
  cargaInicial: CargaInicial;
  fechasDeEntrada: FechasDeEntrada;
  chequesDeApertura: ConsultasDeChequesDeApertura;
  reloj: Reloj;
}

/** Un cargo del pago con lo que se necesita de él: su fila, lo que se le paga y la contraseña de su línea. */
export interface LineaRevisada {
  indice: number;
  fila: FilaDeDocumento;
  saldoCentavos: number;
  montoCentavos: number;
  contrasena: { id: string; numero: string };
}

/** Lo que necesitan anular un pago, reaplicarlo y saldar la diferencia de un cargo desde su ficha (CP4-4). */
export interface DependenciasDeCambiarPagos {
  unidadDeTrabajo: UnidadDeTrabajo;
  documentos: RepositorioDeDocumentos;
  consultas: ConsultasDeDocumentos;
  contrasenas: RepositorioDeContrasenas;
  pagos: RepositorioDePagos;
  consultasDePagos: ConsultasDePagos;
  ajustes: RepositorioDeAjustes;
  bancos: PagosEnBancos;
  notas: NotasParaLigar;
  /** Lo que se lee de Bancos sin orden: si el movimiento está conciliado, su fecha, su número. */
  movimientos: MovimientosDePagos;
  /** El retiro de un pago en efectivo: se bloquea antes que el pago, y su desglose se vuelve a fijar al anular o reaplicar. */
  retiros: RepositorioDeRetiros;
  consultasDeRetiros: ConsultasDeRetiros;
  topeDeDiferencia: TopeDeDiferenciaDelPago;
  cargaInicial: CargaInicial;
  auditoria: Auditoria;
  /** Se publica después de confirmar la transacción de la propia petición (o de la de Bancos, si llegó por aviso). */
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
  /** Contabilidad sumará la del mes cerrado sin tocar los casos de uso. */
  reglasParaAnular: readonly ReglaDePago[];
  reglasParaReaplicar: readonly ReglaDePago[];
}
