import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { superaElUmbralDeBancarizacion } from '../../dominio/aplicacion-manual.js';
import { numeroDeContrasena, proponerFechaDePago } from '../../dominio/contrasena.js';
import { anterioresAlInicioDe, saldoDe } from '../../dominio/saldos.js';
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
import { textoONulo } from './ficha-del-documento.dto.js';

const AL_FINAL = '9999-12-31';

const saldoDeLaFila = (fila: FilaDeDocumento) => saldoDe(fila.documento, aplicadoDe(fila));

/** Lo rebajado del cargo: notas aplicadas y, en un saldo inicial, lo pagado o rebajado antes de la fecha de inicio. */
const rebajadoDe = (fila: FilaDeDocumento): number =>
  saldoDeLaFila(fila).aplicadoCentavos + (anterioresAlInicioDe(fila.documento) ?? 0);

const esCargo = ({ documento }: FilaDeDocumento): boolean => claseDe(documento.tipo) === 'cargo';

/** Los cargos en el orden en que se reparten las notas: vencimiento, emisión y alta. */
function porVencimiento(a: FilaDeDocumento, b: FilaDeDocumento): number {
  return (
    (a.documento.vencimiento ?? AL_FINAL).localeCompare(b.documento.vencimiento ?? AL_FINAL) ||
    a.documento.fechaEmision.localeCompare(b.documento.fechaEmision) ||
    a.creadoEn.localeCompare(b.creadoEn)
  );
}

/** Un cargo con lo fijo (total y retenciones) y lo vivo (rebajado y saldo de hoy). */
export function dtoDeCargoDeContrasena(fila: FilaDeDocumento, umbralCentavos: number): CargoDeContrasenaDto {
  const { documento } = fila;
  const saldo = saldoDeLaFila(fila);
  return {
    documentoId: documento.id,
    tipo: documento.tipo,
    serie: documento.serie,
    numero: documento.numero,
    origen: documento.origen,
    fechaEmision: documento.fechaEmision,
    vencimiento: documento.vencimiento,
    estado: documento.estado,
    total: deCentavos(documento.totalCentavos),
    retenciones: deCentavos(documento.retencionesCentavos),
    rebajado: deCentavos(rebajadoDe(fila)),
    saldo: deCentavos(saldo.saldoCentavos),
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
    saldoLibre: deCentavos(Math.max(saldoDeLaFila(fila).saldoCentavos, 0)),
  };
}

function totalesDe(cargos: readonly FilaDeDocumento[]): TotalesDeContrasenaDto {
  const suma = (valor: (fila: FilaDeDocumento) => number) => deCentavos(cargos.reduce((s, fila) => s + valor(fila), 0));
  return {
    total: suma(({ documento }) => documento.totalCentavos),
    retenciones: suma(({ documento }) => documento.retencionesCentavos),
    rebajado: suma(rebajadoDe),
    saldo: suma((fila) => saldoDeLaFila(fila).saldoCentavos),
  };
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
  { contrasena, documentos, aplicadoPorNota }: ContrasenaConDocumentos,
  umbralCentavos: number,
): ContrasenaDto {
  const cargos = documentos.filter(esCargo).sort(porVencimiento);
  const vigente = contrasena.estado === 'vigente';
  return {
    ...datosDe(contrasena),
    cargos: cargos.map((fila) => dtoDeCargoDeContrasena(fila, umbralCentavos)),
    notas: documentos
      .filter((fila) => !esCargo(fila))
      .map((fila) => dtoDeNota(fila, aplicadoPorNota.get(fila.documento.id) ?? 0)),
    totales: totalesDe(cargos),
    puedeEditar: vigente,
    puedeAnular: vigente,
  };
}

/** Una línea de la lista; `hoy` decide si el pago prometido ya venció. */
export function dtoResumenDeContrasena(
  { contrasena, documentos }: ContrasenaConDocumentos,
  hoy: string,
): ContrasenaResumenDto {
  const saldoCentavos = documentos.filter(esCargo).reduce((suma, fila) => suma + saldoDeLaFila(fila).saldoCentavos, 0);
  return {
    id: contrasena.id,
    numero: numeroDeContrasena(contrasena.numero, contrasena.anioDeNumero),
    fecha: contrasena.fecha,
    fechaDePago: contrasena.fechaDePago,
    proveedorNombre: contrasena.proveedorNombre,
    documentos: documentos.length,
    saldo: deCentavos(saldoCentavos),
    estado: contrasena.estado,
    pagoVencido: contrasena.estado === 'vigente' && saldoCentavos > 0 && contrasena.fechaDePago < hoy,
  };
}

function dtoDeNotaDisponible(fila: FilaDeDocumento): NotaDisponibleDto {
  const { documento } = fila;
  return {
    documentoId: documento.id,
    serie: documento.serie,
    numero: documento.numero,
    fechaEmision: documento.fechaEmision,
    saldoLibre: deCentavos(saldoDeLaFila(fila).saldoCentavos),
  };
}

/** Lo que el proveedor puede meter en una contraseña de hoy: sus cargos con saldo y sus notas con saldo libre. */
export function dtoDeDisponibles(
  filas: readonly FilaDeDocumento[],
  { umbralCentavos, hoy }: { umbralCentavos: number; hoy: string },
): DocumentosDisponiblesDto {
  const cargos = filas.filter(esCargo).sort(porVencimiento);
  return {
    cargos: cargos.map((fila) => dtoDeCargoDeContrasena(fila, umbralCentavos)),
    notas: filas.filter((fila) => !esCargo(fila)).map(dtoDeNotaDisponible),
    fechaDePagoPropuesta: proponerFechaDePago(
      cargos.map(({ documento }) => documento.vencimiento),
      hoy,
    ),
  };
}
