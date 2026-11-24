import type { DestinoDeDocumentoDeVenta } from '../../core/contratos/libro-de-ventas.contratos.js';
import { calcularLineas, type LineaEscrita } from './calculo-de-lineas.js';
import { resolverDestino, type DestinoDelConsumidorFinal, type DestinoSolicitado } from './destino-del-documento.js';
import type { DocumentoDeVenta } from './documento-de-venta.js';
import { DocumentoInvalido } from './errores-de-documento.js';
import { avisosDeLaFechaDeInicio, exigirPosteriorALaFechaDeInicio } from './fecha-de-inicio.js';
import { primerDiaDelMes } from './fechas-del-libro.js';
import { resolverReceptor, type ClienteDelDocumento, type Receptor, type ReceptorSolicitado } from './receptor.js';
import {
  avisosDeFamiliaContraRegimen,
  cobraIva,
  tratamientoDeLaNotaSobreFacturaAnterior,
  exigirRegimenVigente,
  type RegimenDelMes,
} from './regimen-de-la-empresa.js';
import {
  avisosDeLaNota,
  exigirFacturaAnteriorValida,
  exigirFacturaQueAdmiteLaNota,
  exigirQueLaNotaNoSupereLaFactura,
  exigirReferenciaCoherente,
  type FacturaAnteriorEscrita,
  type FacturaConNotas,
  type FacturaDeLaNota,
} from './reglas-de-notas.js';
import { esNota, muestraEnReportesSat, type TipoDeDocumento, type TipoDte } from './tipos-de-documento.js';
import { totalesDelDocumento, type TotalesDelDocumento } from './totales-del-documento.js';

/** Lo que el usuario pide registrar, con el tipo ya resuelto, las líneas escritas y el dinero en centavos. */
export interface SolicitudArmada extends ReceptorSolicitado {
  tipo: TipoDeDocumento;
  tipoDte: TipoDte | null;
  clienteId: string | null;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
  localidadId: string | null;
  fechaEmision: string;
  documentoAfectadoId: string | null;
  facturaAnterior: FacturaAnteriorEscrita | null;
  destino?: DestinoSolicitado;
  /** IVA que dice el DTE, en centavos. */
  ivaDelDte: number | null;
  observaciones: string | null;
  lineas: LineaEscrita[];
}

/** La factura que corrige una nota, con lo que ya corrigieron sus notas vigentes. */
export interface FacturaAfectada extends FacturaDeLaNota, FacturaConNotas {
  id: string;
  destino: DestinoDeDocumentoDeVenta | null;
}

/** Todo lo que el armado necesita saber del mundo, ya leído: el dominio no consulta nada. */
export interface ContextoDelArmado {
  empresaId: string;
  fechaDeInicio: string | null;
  regimen: RegimenDelMes;
  /** El régimen en el mes de la factura del sistema anterior que corrige la nota; `null` si no hay historial de ese mes. */
  regimenDeLaFacturaAnterior: RegimenDelMes | null;
  /** Tasa del IVA en centésimas (12 % → 1200). */
  tasaDeIva: number;
  fechaDeDerogacion: string;
  cliente: (ClienteDelDocumento & { id: string }) | null;
  facturaAfectada: FacturaAfectada | null;
  destinosActivos: readonly DestinoDeDocumentoDeVenta[];
  consumidorFinal: DestinoDelConsumidorFinal;
}

export interface DocumentoArmado {
  documento: DocumentoDeVenta;
  avisos: string[];
}

const SIN_ESPACIOS = /\s/;

/** Serie y número en mayúsculas, sin espacios dentro (como exige la base). */
function identificadorLimpio(valor: string | null, campo: string): string | null {
  const limpio = valor?.trim().toUpperCase() ?? '';
  if (limpio.length === 0) return null;
  if (limpio.length > 40 || SIN_ESPACIOS.test(limpio)) {
    throw new DocumentoInvalido(`"${campo}" va sin espacios y hasta 40 caracteres.`);
  }
  return limpio;
}

/** Las reglas de la nota frente a su factura (la del libro o la del sistema anterior); devuelve los avisos. */
function reglasDeLaNota(
  solicitud: SolicitudArmada,
  contexto: ContextoDelArmado,
  totales: TotalesDelDocumento,
): string[] {
  const { tipo, facturaAnterior, fechaEmision } = solicitud;
  exigirReferenciaCoherente({ tipo, documentoAfectadoId: solicitud.documentoAfectadoId, facturaAnterior });
  if (!esNota(tipo)) return [];
  const { facturaAfectada } = contexto;
  if (facturaAfectada) {
    const nota = { tipo, clienteId: solicitud.clienteId, fechaEmision };
    exigirFacturaQueAdmiteLaNota(facturaAfectada, nota);
    exigirQueLaNotaNoSupereLaFactura(facturaAfectada, { tipo, total: totales.total, iva: totales.iva });
    return avisosDeLaNota(nota, facturaAfectada.fechaEmision);
  }
  if (!facturaAnterior) return [];
  exigirFacturaAnteriorValida(facturaAnterior, { fechaDeInicio: contexto.fechaDeInicio, fechaDeLaNota: fechaEmision });
  return avisosDeLaNota({ tipo, fechaEmision }, facturaAnterior.fecha);
}

/** Si el documento carga IVA y los avisos de ese tratamiento (la nota de una factura anterior no tiene familia que heredar). */
function tratamientoDelIva(solicitud: SolicitudArmada, contexto: ContextoDelArmado) {
  const { tipo, facturaAnterior } = solicitud;
  const regimen = contexto.regimen.regimenIva;
  if (esNota(tipo) && facturaAnterior && !contexto.facturaAfectada) {
    return tratamientoDeLaNotaSobreFacturaAnterior({
      ivaDelDte: solicitud.ivaDelDte,
      regimenDeLaFactura: contexto.regimenDeLaFacturaAnterior?.regimenIva ?? null,
      regimenDelMesDeLaNota: regimen,
    });
  }
  const tipoDeLaFactura = contexto.facturaAfectada?.tipo ?? null;
  return { cobraIva: cobraIva({ regimen, tipo, tipoDeLaFactura }), avisos: [] as string[] };
}

/** El destino que se pide y lo que lo decide, junto. */
function destinoDelDocumento(solicitud: SolicitudArmada, contexto: ContextoDelArmado, receptor: Receptor) {
  return resolverDestino({
    solicitado: solicitud.destino,
    tipo: solicitud.tipo,
    tipoDeIdentificacion: receptor.tipoDeIdentificacion,
    tieneCliente: contexto.cliente !== null,
    activos: contexto.destinosActivos,
    consumidorFinal: contexto.consumidorFinal,
    destinoDeLaFactura: contexto.facturaAfectada ? contexto.facturaAfectada.destino : undefined,
  });
}

type Encabezado = Omit<DocumentoDeVenta, 'destino' | 'totales' | 'lineas'>;

/** Quién es el documento: su identidad, el cliente y cómo se numera (serie, número y FEL). */
function identidadDelDocumento(solicitud: SolicitudArmada, contexto: ContextoDelArmado) {
  const numero = identificadorLimpio(solicitud.numero, 'Número');
  if (numero === null) throw new DocumentoInvalido('Escriba el número del documento.');
  return {
    id: crypto.randomUUID(),
    empresaId: contexto.empresaId,
    tipo: solicitud.tipo,
    tipoDte: solicitud.tipoDte,
    origen: 'manual' as const,
    clienteId: contexto.cliente?.id ?? null,
    serie: identificadorLimpio(solicitud.serie, 'Serie'),
    numero,
    autorizacionFel: solicitud.autorizacionFel,
    localidadId: solicitud.localidadId,
  };
}

/** Lo que el documento guarda de su encabezado: identidad, fechas, la foto del régimen y lo que corrige. */
function encabezadoDelDocumento(
  solicitud: SolicitudArmada,
  contexto: ContextoDelArmado,
  receptor: Receptor,
): Encabezado {
  return {
    ...identidadDelDocumento(solicitud, contexto),
    receptor,
    fechaEmision: solicitud.fechaEmision,
    periodo: primerDiaDelMes(solicitud.fechaEmision),
    regimenIvaDeLaEmpresa: contexto.regimen.regimenIva,
    regimenIsrDeLaEmpresa: contexto.regimen.regimenIsr,
    documentoAfectadoId: solicitud.documentoAfectadoId,
    facturaAnterior: solicitud.facturaAnterior,
    muestraEnReportesSat: muestraEnReportesSat(solicitud.tipo),
    observaciones: solicitud.observaciones,
  };
}

/**
 * Arma el documento de venta que se registra: valida la derogación del régimen, la fecha de inicio, el receptor, las
 * notas (§7.1 paso 6) y el destino, calcula líneas y totales con el régimen del mes y junta los avisos que no
 * bloquean. Las retenciones esperadas llegan en LV-3. Puro: el período declarado y los repetidos los revisa el caso
 * de uso, que sí consulta.
 * @throws las reglas de la sección 7.1 del diseño (RegimenDerogado, DocumentoAnteriorALaFechaDeInicio, nota sin
 *   factura, nota que excede la factura, destino inválido…).
 */
export function armarDocumentoDeVenta(solicitud: SolicitudArmada, contexto: ContextoDelArmado): DocumentoArmado {
  const { tipo, fechaEmision } = solicitud;
  const { regimenIva } = contexto.regimen;
  exigirRegimenVigente({ regimenIva, tipo, fechaDeEmision: fechaEmision }, contexto.fechaDeDerogacion);
  exigirPosteriorALaFechaDeInicio(fechaEmision, contexto.fechaDeInicio);
  const receptor = resolverReceptor(solicitud, contexto.cliente);
  const iva = tratamientoDelIva(solicitud, contexto);
  const opciones = {
    cobraIva: iva.cobraIva,
    tasaDeIva: contexto.tasaDeIva,
    ivaDelDte: solicitud.ivaDelDte,
  };
  const lineas = calcularLineas(solicitud.lineas, opciones);
  const totales = totalesDelDocumento(lineas);
  const avisosDeNota = reglasDeLaNota(solicitud, contexto, totales);
  const destino = destinoDelDocumento(solicitud, contexto, receptor);
  const encabezado = encabezadoDelDocumento(solicitud, contexto, receptor);
  const avisos = [
    ...avisosDeLaFechaDeInicio(fechaEmision, contexto.fechaDeInicio),
    ...avisosDeFamiliaContraRegimen(regimenIva, tipo),
    ...iva.avisos,
    ...avisosDeNota,
  ];
  return { documento: { ...encabezado, destino, totales, lineas }, avisos };
}
