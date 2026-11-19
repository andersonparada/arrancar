import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { superaElUmbralDeBancarizacion } from '../../dominio/aplicacion-manual.js';
import { numeroDeContrasena, proponerFechaDePago } from '../../dominio/contrasena.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import { anterioresAlInicioDe, saldoDe } from '../../dominio/saldos.js';
import { estadoDePagoDe, pagadoYComprometido, posfechadosDe } from '../../dominio/pagos.js';
import { claseDe } from '../../dominio/tipos-de-documento.js';
import type { ContrasenaConDocumentos, ContrasenaGuardada } from '../puertos/puertos-de-contrasenas.js';
import type { FilaDeDocumento } from '../puertos/puertos-de-consultas.js';
import type {
  CargoDeContrasenaDto,
  ContrasenaDto,
  ContrasenaResumenDto,
  DocumentosDisponiblesDto,
  NotaDeContrasenaDto,
  NotaDisponibleDto,
  TotalesDeContrasenaDto,
} from './contrasena.dto.js';
import { aplicadoDe } from './dto-de-documento-por-pagar.js';
import { dtoDePagosDeLaContrasena } from './dto-de-pagos.js';
import type { EstadoDePagoDto } from './pagos.dto.js';
import { textoONulo } from './ficha-del-documento.dto.js';

const AL_FINAL = '9999-12-31';

/** Los saldos de la fila; con `hoy` la deuda separa lo comprometido, sin él solo es fiable lo disponible. */
const saldoDeLaFila = (fila: FilaDeDocumento, hoy?: string) => saldoDe(fila.documento, aplicadoDe(fila, hoy));

/** Lo rebajado del cargo: notas aplicadas y, en un saldo inicial, lo pagado o rebajado antes de la fecha de inicio. */
const rebajadoDe = (fila: FilaDeDocumento): number =>
  saldoDeLaFila(fila).aplicadoCentavos + (anterioresAlInicioDe(fila.documento) ?? 0);

/** Lo que hace falta para armar lo vivo de una contraseña: desde cuánto exige la ley pagar por banco y qué día es hoy. */
export interface VistaDeContrasena {
  umbralCentavos: number;
  hoy: string;
}

const pagosDeLaFila = (fila: FilaDeDocumento, hoy: string) => pagadoYComprometido(fila.pagosVigentes, hoy);

const esCargo = ({ documento }: FilaDeDocumento): boolean => claseDe(documento.tipo) === 'cargo';

/** Los cargos en el orden en que se reparten las notas: vencimiento, emisión y alta. */
function porVencimiento(a: FilaDeDocumento, b: FilaDeDocumento): number {
  return (
    (a.documento.vencimiento ?? AL_FINAL).localeCompare(b.documento.vencimiento ?? AL_FINAL) ||
    a.documento.fechaEmision.localeCompare(b.documento.fechaEmision) ||
    a.creadoEn.localeCompare(b.creadoEn)
  );
}

/** Qué documento es el cargo: su identificación y sus fechas. */
const identificacionDelCargo = (documento: DocumentoPorPagar) => ({
  documentoId: documento.id,
  tipo: documento.tipo,
  serie: documento.serie,
  numero: documento.numero,
  origen: documento.origen,
  fechaEmision: documento.fechaEmision,
  vencimiento: documento.vencimiento,
  estado: documento.estado,
});

/** Un cargo con lo fijo (total y retenciones) y lo vivo (rebajado, pagado y saldo de hoy). */
export function dtoDeCargoDeContrasena(
  fila: FilaDeDocumento,
  { umbralCentavos, hoy }: VistaDeContrasena,
): CargoDeContrasenaDto {
  const { documento } = fila;
  const saldo = saldoDeLaFila(fila, hoy);
  const { pagadoCentavos, comprometidoCentavos } = pagosDeLaFila(fila, hoy);
  return {
    ...identificacionDelCargo(documento),
    total: deCentavos(documento.totalCentavos),
    retenciones: deCentavos(documento.retencionesCentavos),
    rebajado: deCentavos(rebajadoDe(fila)),
    saldo: deCentavos(saldo.deudaCentavos),
    disponible: deCentavos(saldo.disponibleCentavos),
    pagado: deCentavos(pagadoCentavos),
    comprometido: deCentavos(comprometidoCentavos),
    comprometidoHasta: posfechadosDe(fila.pagosVigentes, hoy).comprometidoHasta,
    retencionesPorPracticar: textoONulo(documento.retencionesPorPracticarCentavos),
    sobreUmbralDeBancarizacion: superaElUmbralDeBancarizacion(documento.totalCentavos, umbralCentavos),
  };
}

function dtoDeNota(fila: FilaDeDocumento, aplicadoCentavos: number): NotaDeContrasenaDto {
  const { documento } = fila;
  return {
    documentoId: documento.id,
    serie: documento.serie,
    numero: documento.numero,
    fechaEmision: documento.fechaEmision,
    aplicadoEnLaContrasena: deCentavos(aplicadoCentavos),
    saldoLibre: deCentavos(Math.max(saldoDeLaFila(fila).disponibleCentavos, 0)),
  };
}

function totalesDe(cargos: readonly FilaDeDocumento[], hoy: string): TotalesDeContrasenaDto {
  const suma = (valor: (fila: FilaDeDocumento) => number) => deCentavos(cargos.reduce((s, fila) => s + valor(fila), 0));
  return {
    total: suma(({ documento }) => documento.totalCentavos),
    retenciones: suma(({ documento }) => documento.retencionesCentavos),
    rebajado: suma(rebajadoDe),
    pagado: suma((fila) => pagosDeLaFila(fila, hoy).pagadoCentavos),
    comprometido: suma((fila) => pagosDeLaFila(fila, hoy).comprometidoCentavos),
    saldo: suma((fila) => saldoDeLaFila(fila, hoy).deudaCentavos),
    disponible: suma((fila) => saldoDeLaFila(fila, hoy).disponibleCentavos),
  };
}

/** Cómo va el pago de la contraseña: el de la suma de sus cargos. */
function estadoDePagoDeLaContrasena(cargos: readonly FilaDeDocumento[], hoy: string): EstadoDePagoDto {
  const suma = (valor: (fila: FilaDeDocumento) => number) => cargos.reduce((s, fila) => s + valor(fila), 0);
  return estadoDePagoDe({
    deudaCentavos: suma((fila) => saldoDeLaFila(fila, hoy).deudaCentavos),
    pagadoCentavos: suma((fila) => pagosDeLaFila(fila, hoy).pagadoCentavos),
    comprometidoCentavos: suma((fila) => pagosDeLaFila(fila, hoy).comprometidoCentavos),
  });
}

const datosDe = (c: ContrasenaGuardada) => ({
  id: c.id,
  numero: numeroDeContrasena(c.numero, c.anioDeNumero),
  numeroCorrelativo: c.numero,
  anioDeNumero: c.anioDeNumero,
  fecha: c.fecha,
  fechaDePago: c.fechaDePago,
  proveedorId: c.proveedorId,
  proveedorNombre: c.proveedorNombre,
  proveedorNit: c.proveedorNit,
  observaciones: c.observaciones,
  estado: c.estado,
  impresa: c.impresaEn !== null,
  impresaEn: c.impresaEn,
  anulacion: c.anulacion,
  creadoPorNombre: c.creadoPorNombre,
  creadoEn: c.creadoEn,
});

/** La contraseña con sus cargos y notas y los montos de hoy. */
export function dtoDeContrasena(
  { contrasena, documentos, aplicadoPorNota, pagos }: ContrasenaConDocumentos,
  vista: VistaDeContrasena,
): ContrasenaDto {
  const cargos = documentos.filter(esCargo).sort(porVencimiento);
  const vigente = contrasena.estado === 'vigente';
  return {
    ...datosDe(contrasena),
    cargos: cargos.map((fila) => dtoDeCargoDeContrasena(fila, vista)),
    notas: documentos
      .filter((fila) => !esCargo(fila))
      .map((fila) => dtoDeNota(fila, aplicadoPorNota.get(fila.documento.id) ?? 0)),
    totales: totalesDe(cargos, vista.hoy),
    puedeEditar: vigente,
    puedeAnular: vigente && !pagos.some(({ estado }) => estado === 'vigente'),
    pagos: dtoDePagosDeLaContrasena(pagos, vista.hoy),
    estadoDePago: vigente ? estadoDePagoDeLaContrasena(cargos, vista.hoy) : null,
  };
}

/** Una línea de la lista; `hoy` decide si el pago prometido ya venció. */
export function dtoResumenDeContrasena(
  { contrasena, documentos }: ContrasenaConDocumentos,
  hoy: string,
): ContrasenaResumenDto {
  const cargos = documentos.filter(esCargo);
  const saldos = cargos.map((fila) => saldoDeLaFila(fila, hoy));
  const saldoCentavos = saldos.reduce((suma, { deudaCentavos }) => suma + deudaCentavos, 0);
  const disponibleCentavos = saldos.reduce((suma, { disponibleCentavos }) => suma + disponibleCentavos, 0);
  return {
    id: contrasena.id,
    numero: numeroDeContrasena(contrasena.numero, contrasena.anioDeNumero),
    fecha: contrasena.fecha,
    fechaDePago: contrasena.fechaDePago,
    proveedorNombre: contrasena.proveedorNombre,
    documentos: documentos.length,
    saldo: deCentavos(saldoCentavos),
    disponible: deCentavos(disponibleCentavos),
    estado: contrasena.estado,
    pagoVencido: contrasena.estado === 'vigente' && saldoCentavos > 0 && contrasena.fechaDePago < hoy,
    estadoDePago: contrasena.estado === 'vigente' ? estadoDePagoDeLaContrasena(cargos, hoy) : null,
  };
}

function dtoDeNotaDisponible(fila: FilaDeDocumento): NotaDisponibleDto {
  const { documento } = fila;
  return {
    documentoId: documento.id,
    serie: documento.serie,
    numero: documento.numero,
    fechaEmision: documento.fechaEmision,
    saldoLibre: deCentavos(saldoDeLaFila(fila).disponibleCentavos),
  };
}

/** Lo que el proveedor puede meter en una contraseña de hoy: sus cargos con saldo y sus notas con saldo libre. */
export function dtoDeDisponibles(
  filas: readonly FilaDeDocumento[],
  vista: VistaDeContrasena,
): DocumentosDisponiblesDto {
  const { umbralCentavos, hoy } = vista;
  const cargos = filas.filter(esCargo).sort(porVencimiento);
  return {
    cargos: cargos.map((fila) => dtoDeCargoDeContrasena(fila, vista)),
    notas: filas.filter((fila) => !esCargo(fila)).map(dtoDeNotaDisponible),
    fechaDePagoPropuesta: proponerFechaDePago(
      cargos.map(({ documento }) => documento.vencimiento),
      hoy,
    ),
    umbralDeBancarizacion: deCentavos(umbralCentavos),
  };
}
