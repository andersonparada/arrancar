import { AccesoDenegado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { retencionesAjustadas } from '../../../dominio/ajuste-de-retenciones.js';
import type { DestinoDeDocumento } from '../../../dominio/destinos-de-documento.js';
import {
  normalizarSerieONumero,
  type DocumentoDeCompra,
  type RetencionDeDocumento,
} from '../../../dominio/documento-de-compra.js';
import { DestinoNoDisponible } from '../../../dominio/errores-de-documento.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type {
  CatalogosParaDocumentos,
  ConsultasDeDocumentos,
  ControlDePeriodos,
  DestinosDeDocumentos,
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
import { resolverEncabezado } from './encabezado-del-documento.js';
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
}

/** El documento calculado, listo para guardar, con sus avisos y lo que falta hacerle al proveedor. */
export interface DocumentoPreparado {
  documento: DocumentoDeCompra;
  avisos: string[];
  /** El proveedor no tiene NIT: hay que mandarle `terceros.completar_nit` con este. */
  nitParaCompletar: string | null;
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
   * @throws DestinoNoDisponible si el módulo del destino no está activo en la cuenta.
   * @throws AccesoDenegado si cambia una retención sin el permiso de ajustarlas.
   * @throws las reglas del dominio de cada paso (NIT, tipo, líneas, nota de crédito, retenciones...).
   */
  async preparar(
    operador: Operador,
    pedida: SolicitudDeDocumento,
    opciones: OpcionesDePreparacion,
  ): Promise<DocumentoPreparado> {
    const solicitud = normalizar(pedida);
    const contexto = await this.cargador.cargar(operador, solicitud);
    await this.exigirDestinoActivo(operador, solicitud.destino);
    await this.dependencias.control.exigirAbierto(contexto.periodo);
    const resuelto = await this.resolver(solicitud, contexto, opciones);
    const documento = armarDocumento(operador, solicitud, { contexto, ...resuelto });
    return {
      documento,
      avisos: avisosDelDocumento(solicitud, contexto, resuelto),
      nitParaCompletar: resuelto.encabezado.emisor.nitParaCompletar,
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
    const calculado = calcularElDocumento(solicitud, contexto, { encabezado, lineas, factura });
    if (factura) exigirQueLaNotaNoSupereLaFactura(factura, calculado.totales.total);
    const retenciones = retencionesDelDocumento(solicitud, contexto, { encabezado, lineas, calculado });
    exigirPermisoDeAjuste(retenciones, opciones);
    return { encabezado, lineas, factura, calculado, retenciones };
  }

  private async exigirDestinoActivo(operador: Operador, destino: DestinoDeDocumento): Promise<void> {
    const activos = await this.dependencias.destinos.activos(operador);
    if (!activos.includes(destino)) throw new DestinoNoDisponible(destino);
  }
}

/** Serie y número en mayúsculas y sin espacios, como los guarda la tabla; la serie vacía es ninguna. */
function normalizar(solicitud: SolicitudDeDocumento): SolicitudDeDocumento {
  const serie = solicitud.serie ? normalizarSerieONumero(solicitud.serie) : '';
  return { ...solicitud, serie: serie || null, numero: normalizarSerieONumero(solicitud.numero) };
}

function exigirPermisoDeAjuste(retenciones: RetencionDeDocumento[], opciones: OpcionesDePreparacion): void {
  if (retencionesAjustadas(retenciones).length > 0 && !opciones.puedeAjustarRetenciones) {
    throw new AccesoDenegado('No tiene permiso para cambiar o quitar retenciones.');
  }
}
