import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import type { DocumentoDeVentaFichaDto } from '../aplicacion/dto/documento-de-venta.dto.js';
import type {
  ClaveDeDocumentoDeVenta,
  DatosDeAnulacionGuardada,
  DocumentoGuardadoDeVenta,
  FacturaConNotasGuardada,
  RepositorioDeDocumentosDeVenta,
} from '../aplicacion/puertos/puertos-de-documentos.js';
import { accionesDeDocumento } from '../dominio/baja-de-documento.js';
import type { DocumentoDeVenta } from '../dominio/documento-de-venta.js';

interface Guardado {
  documento: DocumentoDeVenta;
  estado: 'vigente' | 'anulado';
  procesado: boolean;
  anulacion: DatosDeAnulacionGuardada | null;
}

const texto = (centavos: number) => deCentavos(centavos);

/** Como los índices únicos: lo anulado por error de captura o por no ser de la empresa deja libre su número. */
const ocupaSuNumero = ({ estado, anulacion }: Guardado): boolean =>
  estado === 'vigente' || anulacion?.causa === 'fel_anulada_en_la_sat';

function esElMismoDocumento(documento: DocumentoDeVenta, clave: ClaveDeDocumentoDeVenta): boolean {
  const mismoNumero =
    (documento.tipoDte ?? documento.tipo) === clave.tipoOTipoDte &&
    (documento.serie ?? '') === (clave.serie ?? '') &&
    documento.numero === clave.numero;
  return mismoNumero || (clave.autorizacionFel !== null && documento.autorizacionFel === clave.autorizacionFel);
}

/** La ficha de un documento tal como la armaría la base, para comprobar los casos de uso sin PostgreSQL. */
function fichaDe(guardado: Guardado, notas: Guardado[]): DocumentoDeVentaFichaDto {
  const { documento, estado } = guardado;
  const hechos = {
    anulado: estado === 'anulado',
    procesadoEnElDestino: guardado.procesado,
    notasVigentes: notas.filter((nota) => nota.estado === 'vigente').length,
    notasEnTotal: notas.length,
  };
  const { totales } = documento;
  return {
    id: documento.id,
    tipo: documento.tipo,
    tipoDte: documento.tipoDte,
    clienteId: documento.clienteId,
    tipoDeIdentificacion: documento.receptor.tipoDeIdentificacion,
    nitReceptor: documento.receptor.nitReceptor,
    nombreReceptor: documento.receptor.nombreReceptor,
    serie: documento.serie,
    numero: documento.numero,
    fechaEmision: documento.fechaEmision,
    periodo: documento.periodo,
    destino: documento.destino,
    estado,
    muestraEnReportesSat: documento.muestraEnReportesSat,
    regimenIvaDeLaEmpresa: documento.regimenIvaDeLaEmpresa,
    documentoAfectadoId: documento.documentoAfectadoId,
    total: texto(totales.total),
    iva: texto(totales.iva),
    procesado: guardado.procesado,
    ...accionesDeDocumento(hechos),
    origen: documento.origen,
    autorizacionFel: documento.autorizacionFel,
    localidadId: documento.localidadId,
    regimenIsrDeLaEmpresa: documento.regimenIsrDeLaEmpresa,
    facturaAnterior: documento.facturaAnterior,
    moneda: 'GTQ',
    observaciones: documento.observaciones,
    totales: {
      total: texto(totales.total),
      gravadoBienes: texto(totales.gravadoBienes),
      gravadoServicios: texto(totales.gravadoServicios),
      exento: texto(totales.exento),
      exportacion: texto(totales.exportacion),
      iva: texto(totales.iva),
      otrosImpuestos: texto(totales.otrosImpuestos),
    },
    lineas: documento.lineas.map((linea) => ({
      id: `${documento.id}-${linea.orden}`,
      orden: linea.orden,
      conceptoDeIngresoId: linea.conceptoDeIngresoId,
      conceptoDeIngresoNombre: 'Concepto',
      tipo: linea.tipo,
      claseFiscal: linea.claseFiscal,
      descripcion: linea.descripcion,
      total: texto(linea.total),
      base: texto(linea.base),
      iva: texto(linea.iva),
      otrosImpuestos: texto(linea.otrosImpuestos),
    })),
    notas: notas.map((nota) => ({
      id: nota.documento.id,
      tipo: nota.documento.tipo,
      serie: nota.documento.serie,
      numero: nota.documento.numero,
      fechaEmision: nota.documento.fechaEmision,
      total: texto(nota.documento.totales.total),
      estado: nota.estado,
    })),
    anulacion: guardado.anulacion
      ? {
          anuladoEn: '2026-01-01T00:00:00.000Z',
          anuladoPor: guardado.anulacion.anuladoPor,
          motivo: guardado.anulacion.motivo,
          causa: guardado.anulacion.causa,
          fecha: guardado.anulacion.fecha,
        }
      : null,
  };
}

/** Documentos de venta en memoria, con las mismas reglas de lectura que el repositorio de PostgreSQL. */
export class RepositorioDeDocumentosDeVentaEnMemoria implements RepositorioDeDocumentosDeVenta {
  readonly guardados = new Map<string, Guardado>();
  /** Con qué id y modo de bloqueo se leyó cada fila, para comprobar que las bajas y las notas bloquean la factura. */
  readonly lecturas: Array<{ id: string; bloquear: boolean }> = [];

  async agregar(documento: DocumentoDeVenta): Promise<void> {
    this.guardados.set(documento.id, { documento, estado: 'vigente', procesado: false, anulacion: null });
  }

  async buscarRepetido(clave: ClaveDeDocumentoDeVenta): Promise<{ id: string } | null> {
    const ocupan = [...this.guardados.values()].filter(ocupaSuNumero);
    const repetido = ocupan.find(({ documento }) => esElMismoDocumento(documento, clave));
    return repetido ? { id: repetido.documento.id } : null;
  }

  async buscar(documentoId: string, bloquear: boolean): Promise<DocumentoGuardadoDeVenta | null> {
    this.lecturas.push({ id: documentoId, bloquear });
    const guardado = this.guardados.get(documentoId);
    if (!guardado) return null;
    const notas = this.notasDe(documentoId);
    const ficha = fichaDe(guardado, notas);
    const hechos = {
      anulado: guardado.estado === 'anulado',
      procesadoEnElDestino: guardado.procesado,
      notasVigentes: notas.filter((nota) => nota.estado === 'vigente').length,
      notasEnTotal: notas.length,
    };
    return { ficha, hechos, clienteId: guardado.documento.clienteId };
  }

  async facturaConNotas(facturaId: string, bloquear: boolean): Promise<FacturaConNotasGuardada | null> {
    this.lecturas.push({ id: facturaId, bloquear });
    const factura = this.guardados.get(facturaId);
    if (!factura) return null;
    const vigentes = (tipo: string) =>
      this.notasDe(facturaId).filter((nota) => nota.estado === 'vigente' && nota.documento.tipo === tipo);
    const suma = (tipo: string, campo: 'total' | 'iva') =>
      vigentes(tipo).reduce((acumulado, nota) => acumulado + nota.documento.totales[campo], 0);
    const { documento } = factura;
    return {
      id: documento.id,
      tipo: documento.tipo,
      estado: factura.estado,
      clienteId: documento.clienteId,
      fechaEmision: documento.fechaEmision,
      destino: documento.destino,
      total: documento.totales.total,
      iva: documento.totales.iva,
      totalDeNotasDeCredito: suma('nota_de_credito', 'total'),
      ivaDeNotasDeCredito: suma('nota_de_credito', 'iva'),
      cantidadDeNotasDeCredito: vigentes('nota_de_credito').length,
      totalDeNotasDeDebito: suma('nota_de_debito', 'total'),
      ivaDeNotasDeDebito: suma('nota_de_debito', 'iva'),
    };
  }

  async anular(documentoId: string, datos: DatosDeAnulacionGuardada): Promise<void> {
    const guardado = this.guardados.get(documentoId)!;
    guardado.estado = 'anulado';
    guardado.anulacion = datos;
  }

  async eliminar(documentoId: string): Promise<void> {
    this.guardados.delete(documentoId);
  }

  async marcarProcesado(documentoId: string, procesado: boolean): Promise<void> {
    this.guardados.get(documentoId)!.procesado = procesado;
  }

  private notasDe(documentoId: string): Guardado[] {
    return [...this.guardados.values()].filter(({ documento }) => documento.documentoAfectadoId === documentoId);
  }
}
