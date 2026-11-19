import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { Anticipo } from '../../../dominio/anticipos.js';
import { avisoDeFueraDelLibro } from '../../../dominio/avisos-de-gastos.js';
import { eventoDeGastoAsignado } from '../../../dominio/eventos-de-gastos.js';
import { RECURSO_DE_GASTOS, type Gasto } from '../../../dominio/gastos.js';
import {
  etiquetaDelDocumento,
  exigirFechaDelGasto,
  motivoDeLaRetencion,
  retenidoLegible,
} from '../../../dominio/reglas-del-gasto.js';
import { RetencionSinPermiso } from '../../errores-de-gastos.js';
import { dtoDelGasto } from '../../dto/gastos.dto.js';
import type { DatosDelDocumentoDelLibro } from '../../puertos/puertos-de-gastos.js';
import { BancarizadorDelGasto, type BancarizacionDelGasto } from './bancarizador-del-gasto.js';
import type { DependenciasDeGastos } from './dependencias-de-gastos.js';

/** Un documento de la bandeja que se asigna a un anticipo. */
export interface DocumentoPorAsignar {
  /** El gasto de la bandeja, ya bloqueado. */
  gasto: Gasto;
  /** Por omisión, la fecha del documento. */
  fecha?: string | undefined;
  motivoConRetencion?: string | null | undefined;
  /** El usuario tiene `gastos.con-retencion`. */
  puedeConRetencion: boolean;
}

/** Lo que dejó asignar un documento. */
export interface DocumentoAsignado {
  gasto: Gasto;
  avisos: string[];
  evento: EventoDominio;
}

/** Lo ya revisado de un documento, listo para escribir. */
interface AsignacionRevisada {
  fecha: string;
  documento: DatosDelDocumentoDelLibro;
  motivoConRetencion: string | null;
  bancarizacion: BancarizacionDelGasto;
}

type Dependencias = Pick<DependenciasDeGastos, 'gastos' | 'documentos' | 'bancarizacion' | 'auditoria' | 'reloj'>;

/**
 * Asigna un documento de la bandeja a un anticipo abierto (§7.2), para la ventana de asignar y para recibir un documento con
 * referencia. Revisa todo antes de escribir (si algo falla no queda nada a medias): la fecha, la excepción de retención
 * (permiso y motivo) y la bancarización. Con retención guarda quién autorizó (`asignado_por`) y lo audita como `autorizar`.
 */
export class AsignadorDeGastos {
  private readonly bancarizador: BancarizadorDelGasto;

  constructor(private readonly dependencias: Dependencias) {
    this.bancarizador = new BancarizadorDelGasto(dependencias);
  }

  /** @throws FechaDelGastoInvalida, RetencionSinPermiso, MotivoConRetencionObligatorio, MotivoConRetencionNoAplica */
  async asignar(operador: Operador, anticipo: Anticipo, pedido: DocumentoPorAsignar): Promise<DocumentoAsignado> {
    const { gastos } = this.dependencias;
    const revisada = await this.revisar(operador, anticipo, pedido);
    await gastos.asignar(pedido.gasto.id, {
      anticipoId: anticipo.id,
      fecha: revisada.fecha,
      asignadoPor: operador.usuarioId,
      motivoConRetencion: revisada.motivoConRetencion,
      sinBancarizar: revisada.bancarizacion.sinBancarizar,
    });
    await this.auditarLaExcepcion(pedido.gasto, revisada);
    const asignado = (await gastos.buscar(pedido.gasto.id))!;
    const avisoDelLibro = avisoDeFueraDelLibro(revisada.documento.motivoFueraDelLibro);
    return {
      gasto: asignado,
      avisos: [...revisada.bancarizacion.avisos, ...(avisoDelLibro === null ? [] : [avisoDelLibro])],
      evento: eventoDeGastoAsignado(operador.empresaId, asignado),
    };
  }

  /** Todo lo que puede rechazar la asignación, antes de escribir nada. */
  private async revisar(operador: Operador, anticipo: Anticipo, pedido: DocumentoPorAsignar) {
    const { gasto } = pedido;
    const documento = await this.dependencias.documentos.datosDe(gasto.documentoDeCompraId!);
    const fecha = pedido.fecha ?? gasto.fecha;
    exigirFechaDelGasto(fecha, { entrega: anticipo.fecha, hoy: await this.dependencias.reloj.hoy(operador) });
    const motivoConRetencion = this.motivoDeLaExcepcion(pedido, etiquetaDelDocumento(documento));
    const bancarizacion = await this.bancarizador.evaluar(operador, { gasto, documento, fecha });
    const revisada: AsignacionRevisada = { fecha, documento, motivoConRetencion, bancarizacion };
    return revisada;
  }

  /** Sin el permiso de excepción un documento con retención no se asigna; con él, hace falta un motivo. */
  private motivoDeLaExcepcion({ gasto, motivoConRetencion, puedeConRetencion }: DocumentoPorAsignar, etiqueta: string) {
    if (gasto.conRetencion && !puedeConRetencion) throw new RetencionSinPermiso(etiqueta, retenidoLegible(gasto));
    return motivoDeLaRetencion({ gasto, etiqueta, motivo: motivoConRetencion });
  }

  /** Quién autorizó la retención queda en `asignado_por` y en la auditoría, con el documento como estaba en la bandeja. */
  private async auditarLaExcepcion(gasto: Gasto, { documento, motivoConRetencion }: AsignacionRevisada): Promise<void> {
    if (motivoConRetencion === null) return;
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_GASTOS,
      registroId: gasto.id,
      accion: 'autorizar',
      anterior: dtoDelGasto({ gasto, documento }),
      motivo: motivoConRetencion,
    });
  }
}
