import { ErrorEsperado } from '../../../../core/compartido/dominio/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DocumentoParaDestino } from '../../../../core/contratos/libro-de-compras.contratos.js';
import { avisoDeDocumentoEnLaBandeja, avisoDeRetencionEnLaBandeja } from '../../../dominio/avisos-de-gastos.js';
import {
  DocumentoYaRecibido,
  FacturaDeLaNotaNoRecibida,
  GastoNoDisponible,
} from '../../../dominio/errores-de-gastos.js';
import { montoDeLoPagado, type Gasto } from '../../../dominio/gastos.js';
import { anticipoAbiertoBloqueado } from './anticipo-abierto.js';
import { AsignadorDeGastos } from './asignador-de-gastos.js';
import type { DependenciasDeGastos } from './dependencias-de-gastos.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lo que responde la orden: los avisos que Libro de compras suma a los suyos. */
export interface ResultadoDeRecibir {
  avisos: string[];
}

/**
 * Atiende la orden `cuentas-por-liquidar.recibir_documento`: corre dentro de la transacción de Libro de compras, así que si
 * algo falla no se registra nada. Guarda el documento en la bandeja con lo que salió del anticipo (el total menos lo que
 * retiene la empresa) y lo retenido. **No rechaza por retención**: la factura con retención queda en la bandeja aunque traiga
 * referencia, porque la excepción solo se autoriza al asignar (§5.4 g). Sin retención y con `referenciaDeDestino` (el
 * anticipo) intenta asignarlo; si no se puede (anticipo cerrado, fecha, etc.) queda en la bandeja con el motivo en el aviso.
 * El permiso lo exigió la ruta de origen (Libro de compras): aquí no se vuelve a pedir.
 */
export class RecibirDocumento {
  private readonly asignador: AsignadorDeGastos;

  constructor(private readonly dependencias: DependenciasDeGastos) {
    this.asignador = new AsignadorDeGastos(dependencias);
  }

  /** @throws DocumentoYaRecibido, FacturaDeLaNotaNoRecibida */
  async ejecutar(operador: Operador, documento: DocumentoParaDestino): Promise<ResultadoDeRecibir> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { avisos, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.recibir(operador, documento));
    await publicadorEventos.publicar(eventos);
    return { avisos };
  }

  private async recibir(operador: Operador, documento: DocumentoParaDestino) {
    const { gastos } = this.dependencias;
    if (await gastos.delDocumento(documento.documentoId)) throw new DocumentoYaRecibido();
    await this.exigirLaFacturaDeLaNota(documento);
    const nuevo = this.nuevoEnLaBandeja(documento);
    await gastos.agregarDocumento(nuevo);
    const gasto = (await gastos.buscar(nuevo.id))!;
    if (gasto.conRetencion) return { avisos: [avisoDeRetencionEnLaBandeja(gasto.montoRetenidoCentavos)], eventos: [] };
    return this.asignarALaReferencia(operador, gasto, documento.referenciaDeDestino ?? null);
  }

  /** Una nota de crédito sobre una factura del libro necesita que la factura esté aquí. */
  private async exigirLaFacturaDeLaNota(documento: DocumentoParaDestino): Promise<void> {
    const afectado = documento.documentoAfectadoId;
    if (documento.tipo !== 'nota_de_credito' || afectado === null || documento.facturaAnterior) return;
    if (!(await this.dependencias.gastos.delDocumento(afectado))) throw new FacturaDeLaNotaNoRecibida();
  }

  private nuevoEnLaBandeja(documento: DocumentoParaDestino) {
    return {
      id: crypto.randomUUID(),
      documentoDeCompraId: documento.documentoId,
      resta: documento.tipo === 'nota_de_credito',
      proveedorId: documento.proveedorId,
      fecha: documento.fechaEmision,
      montoCentavos: montoDeLoPagado(documento.totalCentavos, documento.retencionesCentavos),
      montoRetenidoCentavos: documento.retencionesCentavos,
      conActivoFijo: documento.tieneActivoFijo,
    };
  }

  /** Sin referencia queda en la bandeja; con ella intenta asignar y, si no puede, lo deja allí con el porqué. */
  private async asignarALaReferencia(operador: Operador, gasto: Gasto, referencia: string | null) {
    if (referencia === null) return { avisos: [], eventos: [] };
    try {
      if (!UUID.test(referencia)) throw new GastoNoDisponible('la referencia no es un anticipo.');
      const anticipo = await anticipoAbiertoBloqueado(this.dependencias, referencia);
      const hecho = await this.asignador.asignar(operador, anticipo, { gasto, puedeConRetencion: false });
      return { avisos: hecho.avisos, eventos: [hecho.evento] };
    } catch (error) {
      if (!(error instanceof ErrorEsperado)) throw error;
      return { avisos: [avisoDeDocumentoEnLaBandeja(error.message)], eventos: [] };
    }
  }
}
