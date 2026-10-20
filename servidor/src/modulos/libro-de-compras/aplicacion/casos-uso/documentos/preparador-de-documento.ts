import { AccesoDenegado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { retencionesAjustadas } from '../../../dominio/ajuste-de-retenciones.js';
import type {
  DatosFiscalesDeProveedor,
  RegimenDeIvaDeProveedor,
} from '../../../dominio/datos-fiscales-de-proveedor.js';
import type { DestinoDeDocumento } from '../../../dominio/destinos-de-documento.js';
import {
  normalizarSerieONumero,
  type DocumentoDeCompra,
  type RetencionDeDocumento,
} from '../../../dominio/documento-de-compra.js';
import { DestinoNoDisponible } from '../../../dominio/errores-de-documento.js';
import { exigirFechaDeLaFamilia, resolverTipoDeDocumento } from '../../../dominio/familia-del-documento.js';
import type { PropuestaEnCero } from '../../../dominio/retencion-practicada.js';
import type { SolicitudDeDocumento, SolicitudSinResolver } from '../../dto/solicitud-de-documento.js';
import type {
  CatalogosParaDocumentos,
  ConsultasDeDocumentos,
  ControlDePeriodos,
  DestinosDeDocumentos,
  FacturaParaNota,
} from '../../puertos/puertos-de-documentos.js';
import {
  armarDocumento,
  calcularElDocumento,
  retencionesDelDocumento,
  type DocumentoResuelto,
} from './armado-del-documento.js';
import { avisosDelDocumento } from './avisos-del-documento.js';
import {
  CargadorDeContextoFiscal,
  type ContextoFiscal,
  type DependenciasDelCargador,
} from './cargador-de-contexto-fiscal.js';
import { resolverEncabezado, type EncabezadoResuelto } from './encabezado-del-documento.js';
import { exigirQueLaNotaNoSupereLaFactura, ResolutorDeFactura } from './resolutor-de-factura.js';
import { ResolutorDeLineas } from './resolutor-de-lineas.js';

export interface DependenciasDelPreparador extends DependenciasDelCargador {
  catalogos: CatalogosParaDocumentos;
  consultas: ConsultasDeDocumentos;
  destinos: DestinosDeDocumentos;
  control: ControlDePeriodos;
}

export interface OpcionesDePreparacion {
  /** Al registrar, la factura de la nota queda bloqueada hasta el fin de la transacción. */
  bloquearFactura: boolean;
  /** El usuario tiene `libro-de-compras.retenciones.ajustar`. */
  puedeAjustarRetenciones: boolean;
  /** Registrar exige un destino activo; la vista previa calcula sin él y, si no está activo, solo avisa. */
  exigirDestino: boolean;
}

/** El documento calculado, listo para guardar, con sus avisos y lo que falta hacerle al proveedor. */
export interface DocumentoPreparado {
  documento: DocumentoDeCompra;
  avisos: string[];
  /** El proveedor no tiene NIT: hay que mandarle `terceros.completar_nit` con este. */
  nitParaCompletar: string | null;
  /** El proveedor no tiene DPI y el vendedor de la factura especial es un CUI: hay que mandarle `terceros.completar_dpi`. */
  dpiParaCompletar: string | null;
  /** El proveedor no tenía datos fiscales y llegaron (o se dedujeron) unos: se guardan con el documento. */
  datosFiscalesPorGuardar: DatosFiscalesDeProveedor | null;
  /** El usuario confirmó que el proveedor cambió de régimen: se audita al registrar. */
  cambioDeRegimenConfirmado: boolean;
  /** El régimen de IVA con que se calculó al proveedor (el guardado, o el deducido de la familia). */
  regimenDelProveedor: RegimenDeIvaDeProveedor;
  /** Retenciones que el sistema dejó en cero por una ya practicada en un documento anulado: se auditan al registrar. */
  retencionesEnCero: PropuestaEnCero[];
}

/**
 * Los pasos 1 a 8 de `RegistrarDocumento` (diseño §5), sin escribir nada: valida, resuelve catálogos y factura,
 * calcula, evalúa retenciones y reúne los avisos. Lo comparten la vista previa y el registro, así lo que se ve
 * antes de guardar es lo que se guarda. Se llama dentro de una unidad de trabajo.
 */
export class PreparadorDeDocumento {
  private readonly cargador: CargadorDeContextoFiscal;
  private readonly lineas: ResolutorDeLineas;
  private readonly facturas: ResolutorDeFactura;

  constructor(private readonly dependencias: DependenciasDelPreparador) {
    this.cargador = new CargadorDeContextoFiscal(dependencias);
    this.lineas = new ResolutorDeLineas(dependencias.catalogos);
    this.facturas = new ResolutorDeFactura(dependencias.consultas);
  }

  /**
   * @throws DestinoNoDisponible si se pide exigir el destino y su módulo no está activo en la cuenta.
   * @throws AccesoDenegado si cambia una retención sin el permiso de ajustarlas.
   * @throws las reglas del dominio de cada paso (NIT, tipo, líneas, nota de crédito, retenciones...).
   */
  async preparar(
    operador: Operador,
    pedida: SolicitudSinResolver,
    opciones: OpcionesDePreparacion,
  ): Promise<DocumentoPreparado> {
    const solicitud = normalizar(pedida);
    const contexto = await this.cargador.cargar(operador, solicitud, { bloquear: opciones.bloquearFactura });
    const avisoDelDestino = await this.revisarDestino(operador, solicitud.destino, opciones.exigirDestino);
    await this.dependencias.control.exigirAbierto(contexto.periodo);
    const resuelto = await this.resolver(solicitud, contexto, opciones);
    const documento = armarDocumento(operador, solicitud, { contexto, ...resuelto });
    return {
      documento,
      avisos: [...avisosDelDocumento(solicitud, contexto, resuelto), ...avisoDelDestino],
      nitParaCompletar: resuelto.encabezado.emisor.nitParaCompletar,
      dpiParaCompletar: resuelto.encabezado.dpiParaCompletar,
      datosFiscalesPorGuardar: contexto.datosDelProveedorPorGuardar,
      cambioDeRegimenConfirmado: resuelto.encabezado.cambioDeRegimenConfirmado,
      regimenDelProveedor: contexto.datosDelProveedor.instantanea().regimenIva,
      retencionesEnCero: resuelto.practicada.enCero,
    };
  }

  /** Encabezado, líneas, factura de la nota, cálculo y retenciones, en ese orden. */
  private async resolver(
    solicitud: SolicitudDeDocumento,
    contexto: ContextoFiscal,
    opciones: OpcionesDePreparacion,
  ): Promise<DocumentoResuelto> {
    const encabezado = resolverEncabezado(solicitud, contexto);
    const lineas = await this.lineas.resolver(solicitud.lineas, solicitud.fechaEmision);
    const factura = await this.facturas.resolver(solicitud, opciones.bloquearFactura);
    exigirLaFechaDeLaFamilia(solicitud, contexto, factura);
    const calculado = calcularElDocumento(solicitud, contexto, { encabezado, lineas, factura });
    if (factura) exigirQueLaNotaNoSupereLaFactura(factura, calculado.totales.total);
    const anulado = await this.buscarAnulado(solicitud, encabezado);
    const { retenciones, practicada } = retencionesDelDocumento(solicitud, contexto, {
      encabezado,
      lineas,
      calculado,
      anulado,
    });
    exigirPermisoDeAjuste(retenciones, opciones);
    return { encabezado, lineas, factura, calculado, retenciones, practicada };
  }

  /** El documento anulado con la misma FEL (o NIT, tipo, serie y número) que ya retuvo algo; las notas no retienen. */
  private async buscarAnulado(solicitud: SolicitudDeDocumento, encabezado: EncabezadoResuelto) {
    if (solicitud.tipo === 'nota_de_credito') return null;
    return this.dependencias.consultas.buscarAnuladoConRetenciones({
      tipo: solicitud.tipo,
      proveedorId: solicitud.proveedorId,
      muestraEnReportesSat: encabezado.muestraEnReportesSat,
      nitEmisor: encabezado.emisor.nitEmisor,
      serie: solicitud.serie,
      numero: solicitud.numero,
      autorizacionFel: solicitud.autorizacionFel,
    });
  }

  /** Registrar exige el destino activo; la vista previa sin destino no dice nada y con uno inactivo avisa. */
  private async revisarDestino(
    operador: Operador,
    destino: DestinoDeDocumento | null,
    exigir: boolean,
  ): Promise<string[]> {
    if (destino === null && !exigir) return [];
    const activos = await this.dependencias.destinos.activos(operador);
    if (destino !== null && activos.includes(destino)) return [];
    if (exigir || destino === null) throw new DestinoNoDisponible(destino ?? 'sin elegir');
    return [new DestinoNoDisponible(destino).message];
  }
}

/**
 * Resuelve la familia y el código de la SAT, y deja la serie y el número en mayúsculas y sin espacios, como los guarda
 * la tabla; la serie vacía es ninguna.
 */
function normalizar(solicitud: SolicitudSinResolver): SolicitudDeDocumento {
  const serie = solicitud.serie ? normalizarSerieONumero(solicitud.serie) : '';
  const tipo = resolverTipoDeDocumento(solicitud);
  return { ...solicitud, ...tipo, serie: serie || null, numero: normalizarSerieONumero(solicitud.numero) };
}

/** El documento se mide con su fecha; la nota de crédito, con la familia y la fecha de su factura. */
function exigirLaFechaDeLaFamilia(
  solicitud: SolicitudDeDocumento,
  contexto: ContextoFiscal,
  factura: FacturaParaNota | null,
): void {
  const medido = factura
    ? { tipo: factura.tipo, fechaDeEmision: factura.fechaEmision }
    : { tipo: solicitud.tipo, fechaDeEmision: solicitud.fechaEmision };
  exigirFechaDeLaFamilia(medido, contexto.configuracion.fechaDeDerogacion);
}

function exigirPermisoDeAjuste(retenciones: RetencionDeDocumento[], opciones: OpcionesDePreparacion): void {
  if (retencionesAjustadas(retenciones).length > 0 && !opciones.puedeAjustarRetenciones) {
    throw new AccesoDenegado('No tiene permiso para cambiar o quitar retenciones.');
  }
}
