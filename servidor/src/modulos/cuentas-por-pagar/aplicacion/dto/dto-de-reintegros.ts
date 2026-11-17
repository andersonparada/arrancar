import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { montoEnLetras } from '../../../core/compartido/dominio/monto-en-letras.js';
import { LEYENDA_DEL_RECIBO_DE_REINTEGRO } from '../../dominio/avisos-de-reintegros.js';
import { numeroDelReintegro, type Reintegro } from '../../dominio/reintegros.js';
import type { EmpresaDeLaImpresion } from '../puertos/puertos-de-impresion-de-contrasenas.js';
import type {
  MovimientoDelReintegroDto,
  NotaDelReintegroDto,
  ReciboDeReintegroDto,
  ReintegroDto,
} from './reintegros.dto.js';

/** Cómo se nombra una nota de crédito en el reintegro. */
export interface EtiquetaDeNota {
  serie: string | null;
  numero: string;
}

/** Lo que se necesita, además del reintegro guardado, para armar su ficha. */
export interface DatosParaElDto {
  reintegro: Reintegro;
  proveedor: { id: string; nombre: string; nit: string | null };
  /** Serie y número de cada nota, por su id. */
  etiquetas: ReadonlyMap<string, EtiquetaDeNota>;
  movimiento: MovimientoDelReintegroDto | null;
  avisos?: readonly string[];
}

const notasDelDto = (reintegro: Reintegro, etiquetas: ReadonlyMap<string, EtiquetaDeNota>): NotaDelReintegroDto[] =>
  reintegro.notas.map(({ notaId, montoCentavos }) => ({
    notaId,
    serie: etiquetas.get(notaId)?.serie ?? null,
    numero: etiquetas.get(notaId)?.numero ?? '',
    monto: deCentavos(montoCentavos),
  }));

export function dtoDelReintegro({
  reintegro,
  proveedor,
  etiquetas,
  movimiento,
  avisos = [],
}: DatosParaElDto): ReintegroDto {
  const anulado = reintegro.estado === 'anulado';
  return {
    id: reintegro.id,
    numero: numeroDelReintegro(reintegro.numero, reintegro.anioDeNumero),
    proveedor,
    forma: reintegro.forma,
    fecha: reintegro.fecha,
    monto: deCentavos(reintegro.montoCentavos),
    movimiento,
    referencia: reintegro.referencia,
    observaciones: reintegro.observaciones,
    estado: reintegro.estado,
    notas: notasDelDto(reintegro, etiquetas),
    anulacion: anulado ? { fecha: reintegro.fechaDeAnulacion!, motivo: reintegro.motivoDeAnulacion! } : null,
    avisos: [...avisos],
    puedeAnular: !anulado,
  };
}

/** El recibo que la empresa le extiende al proveedor: lo que recibió, de qué notas y las firmas. */
export function dtoDelRecibo(
  dto: ReintegroDto,
  datos: { empresa: EmpresaDeLaImpresion; nombreDelNit: string; cuentaBancaria: string | null; totalCentavos: number },
): ReciboDeReintegroDto {
  return {
    numero: dto.numero,
    fecha: dto.fecha,
    estado: dto.estado,
    empresa: datos.empresa,
    proveedor: { nombre: datos.nombreDelNit, nit: dto.proveedor.nit },
    forma: dto.forma,
    cuentaBancaria: datos.cuentaBancaria,
    referencia: dto.referencia,
    notas: dto.notas.map(({ serie, numero, monto }) => ({ serie, numero, monto })),
    total: dto.monto,
    totalEnLetras: montoEnLetras(datos.totalCentavos),
    recibidoPor: datos.empresa.razonSocial ?? datos.empresa.nombre,
    entregadoPor: datos.nombreDelNit,
    leyenda: LEYENDA_DEL_RECIBO_DE_REINTEGRO,
  };
}
