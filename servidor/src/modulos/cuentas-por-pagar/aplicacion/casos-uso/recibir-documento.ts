import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { DocumentoParaDestino } from '../../../core/contratos/libro-de-compras.contratos.js';
import { avisoDeSaldoALaFavor, avisosDeNotaSobreFacturaAnterior } from '../../dominio/avisos.js';
import { DocumentoYaRecibido, FacturaDeLaNotaNoRecibida } from '../../dominio/errores.js';
import { fechaBaseDelPlazo, proponerVencimiento } from '../../dominio/propuesta-de-vencimiento.js';
import { repartirNotaDeCredito } from '../../dominio/reparto-de-nota-de-credito.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import { claseDe } from '../../dominio/tipos-de-documento.js';
import type {
  CondicionesDeProveedores,
  ConsultasDeCargos,
  DocumentoNuevo,
  DocumentosDeCompra,
  PlazoPorOmision,
  RepositorioDeAplicaciones,
  RepositorioDeDocumentos,
} from '../puertos/puertos-de-documentos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  documentos: RepositorioDeDocumentos;
  aplicaciones: RepositorioDeAplicaciones;
  cargos: ConsultasDeCargos;
  condiciones: CondicionesDeProveedores;
  documentosDeCompra: DocumentosDeCompra;
  plazo: PlazoPorOmision;
}

/** La factura a la que apunta la nota que se recibe. */
interface FacturaDeLaNota {
  /** El id de aquí de la factura (del libro o saldo inicial); `null` si no hay. */
  documentoAfectadoId: string | null;
  /** El saldo inicial bloqueado, en las notas sobre una factura del sistema anterior que sí está cargada. */
  saldoInicial: DocumentoPorPagar | null;
  sistemaAnterior: boolean;
}

/** Lo que de la orden se guarda tal cual en el documento nuevo. */
function datosPropiosDe(
  documento: DocumentoParaDestino,
  factura: FacturaDeLaNota,
): Omit<DocumentoNuevo, 'serie' | 'numero' | 'vencimiento'> {
  return {
    documentoId: documento.documentoId,
    tipo: documento.tipo,
    proveedorId: documento.proveedorId,
    documentoAfectadoId: factura.documentoAfectadoId,
    facturaDelSistemaAnterior: factura.sistemaAnterior,
    fechaEmision: documento.fechaEmision,
    totalCentavos: documento.totalCentavos,
    retencionesCentavos: documento.retencionesCentavos,
    tieneActivoFijo: documento.tieneActivoFijo,
  };
}

/** Lo que responde la orden: los avisos que Libro de compras suma a los suyos. */
export interface ResultadoDeRecibir {
  avisos: string[];
}

/**
 * Atiende la orden `cuentas-por-pagar.recibir_documento`: corre dentro de la transacción de Libro de compras, así que
 * si algo falla no se registra nada. Guarda el documento como `pendiente` (todo tipo entra) y, si es un cargo, le propone
 * el vencimiento (la fecha de emisión, o la de recepción si el proveedor así lo pactó, más sus días de crédito, o el plazo por omisión). Una nota de crédito no vence:
 * se aplica sola a su factura y, si sobra, a las notas de débito de esa factura; lo que quede es su saldo libre. Una nota
 * de débito es un cargo más, con su propio vencimiento. No audita (es un alta) ni marca el documento como procesado.
 */
export class RecibirDocumento {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Devuelve los avisos que no bloquean: el de una nota de crédito que deja saldo libre (a favor de la empresa) y, en las
   * notas sobre una factura del sistema anterior, los de §4.3 del diseño U8l.
   * @throws DocumentoYaRecibido si el documento ya había llegado.
   * @throws FacturaDeLaNotaNoRecibida si la factura del libro que cita la nota no está aquí.
   */
  ejecutar(operador: Operador, documento: DocumentoParaDestino): Promise<ResultadoDeRecibir> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      if (await this.dependencias.documentos.existe(documento.documentoId)) throw new DocumentoYaRecibido();
      const factura = await this.facturaDeLaNota(documento);
      const { guardado, fechaRecepcion } = await this.guardar(operador, documento, factura);
      const saldoLibreCentavos =
        guardado.tipo === 'nota_de_credito' ? await this.aplicarALaFactura(guardado, fechaRecepcion) : 0;
      return { avisos: this.avisosDe({ guardado, documento, factura, saldoLibreCentavos }) };
    });
  }

  /**
   * A qué factura de aquí apunta la nota: la del libro (por su id propio), el saldo inicial que cita (bloqueado) o
   * ninguna.
   */
  private async facturaDeLaNota(documento: DocumentoParaDestino): Promise<FacturaDeLaNota> {
    const { facturaAnterior } = documento;
    if (facturaAnterior) {
      const { proveedorId } = documento;
      const saldoInicial = await this.dependencias.documentos.buscarSaldoInicialDeLaFactura({
        proveedorId,
        serie: facturaAnterior.serie,
        numero: facturaAnterior.numero,
      });
      return { documentoAfectadoId: saldoInicial?.id ?? null, saldoInicial, sistemaAnterior: true };
    }
    return {
      documentoAfectadoId: await this.facturaPropiaDe(documento.documentoAfectadoId),
      saldoInicial: null,
      sistemaAnterior: false,
    };
  }

  private avisosDe(datos: {
    guardado: DocumentoPorPagar;
    documento: DocumentoParaDestino;
    factura: FacturaDeLaNota;
    saldoLibreCentavos: number;
  }): string[] {
    const { guardado, documento, factura, saldoLibreCentavos } = datos;
    const { facturaAnterior } = documento;
    if (facturaAnterior && (guardado.tipo === 'nota_de_credito' || guardado.tipo === 'nota_de_debito')) {
      return avisosDeNotaSobreFacturaAnterior({
        tipo: guardado.tipo,
        saldoInicial: factura.saldoInicial,
        citada: facturaAnterior,
        saldoLibreCentavos,
      });
    }
    return saldoLibreCentavos > 0 ? [avisoDeSaldoALaFavor(saldoLibreCentavos)] : [];
  }

  private async guardar(
    operador: Operador,
    documento: DocumentoParaDestino,
    factura: FacturaDeLaNota,
  ): Promise<{ guardado: DocumentoPorPagar; fechaRecepcion: string }> {
    const { fechaRecepcion, serie, numero } = await this.dependencias.documentosDeCompra.datosDeRecepcion(
      documento.documentoId,
    );
    const esCargo = claseDe(documento.tipo) === 'cargo';
    const vencimiento = esCargo ? await this.vencimientoPara(operador, documento, fechaRecepcion) : null;
    const nuevo = { serie, numero, vencimiento, ...datosPropiosDe(documento, factura) };
    const guardado = await this.dependencias.documentos.agregar(nuevo);
    return { guardado, fechaRecepcion };
  }

  /** Traduce el id de la factura en Libro de compras al id propio de aquí (siempre existe: nota y factura comparten destino). */
  private async facturaPropiaDe(facturaDeCompraId: string | null): Promise<string | null> {
    if (facturaDeCompraId === null) return null;
    const factura = await this.dependencias.documentos.buscarPorDocumentoDeCompra(facturaDeCompraId, false);
    if (!factura) throw new FacturaDeLaNotaNoRecibida();
    return factura.documento.id;
  }

  private async vencimientoPara(
    operador: Operador,
    documento: DocumentoParaDestino,
    fechaRecepcion: string,
  ): Promise<string> {
    const { condiciones, plazo } = this.dependencias;
    const { diasDeCredito, contarDesdeLaRecepcion } = await condiciones.deProveedor(documento.proveedorId);
    const fechaBase = fechaBaseDelPlazo({
      fechaEmision: documento.fechaEmision,
      fechaRecepcion,
      contarDesdeLaRecepcion,
    });
    return proponerVencimiento({ fechaBase, diasDeCredito, mesesPorOmision: await plazo.meses(operador) });
  }

  /**
   * Aplica la nota a su factura y a las notas de débito de esa factura, con la fecha de recepción de la nota; devuelve
   * lo que quedó libre, en centavos.
   */
  private async aplicarALaFactura(nota: DocumentoPorPagar, fechaRecepcion: string): Promise<number> {
    const { cargos, aplicaciones } = this.dependencias;
    if (nota.documentoAfectadoId === null) return nota.totalCentavos;
    const posibles = await cargos.paraAplicarUnaNota(nota.documentoAfectadoId);
    const reparto = repartirNotaDeCredito(nota.totalCentavos, posibles);
    if (reparto.aplicaciones.length > 0) {
      await aplicaciones.agregar(nota, reparto.aplicaciones, {
        forma: 'automatica',
        fecha: fechaRecepcion,
        referencia: null,
      });
    }
    return reparto.saldoLibreCentavos;
  }
}
