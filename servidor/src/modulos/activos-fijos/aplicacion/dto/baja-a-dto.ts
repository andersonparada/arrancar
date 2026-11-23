import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { avisosDeBaja, type DatosParaLosAvisos } from '../../dominio/avisos-de-baja.js';
import type { PropiedadesDeBaja } from '../../dominio/baja.js';
import type { CifrasDeBaja } from '../../dominio/tipos-de-baja.js';
import type { ActivoDeBajaDto, BajaDto, ComponenteDeBajaDto } from './baja.dto.js';

/** Lo que la baja no sabe de sí misma: el activo, sus componentes y datos de la empresa para los avisos. */
export interface ContextoDeBajaDto {
  activo: ActivoDeBajaDto;
  componentes: ComponenteDeBajaDto[];
  incisoFiscal: DatosParaLosAvisos['incisoFiscal'];
  tipoDePersona: DatosParaLosAvisos['tipoDePersona'];
}

const dinero = (centavos: number | null): string | null => (centavos === null ? null : deCentavos(centavos));

function cifrasADto(cifras: CifrasDeBaja) {
  return {
    costo: deCentavos(cifras.costoCentavos),
    depreciacionAcumuladaContable: deCentavos(cifras.depreciacionAcumuladaContableCentavos),
    valorEnLibros: deCentavos(cifras.valorEnLibrosCentavos),
    costoFiscal: deCentavos(cifras.costoFiscalCentavos),
    baseFiscal: deCentavos(cifras.baseFiscalCentavos),
    depreciacionAcumuladaFiscal: deCentavos(cifras.depreciacionAcumuladaFiscalCentavos),
    valorFiscalPorDepreciar: deCentavos(cifras.valorFiscalPorDepreciarCentavos),
    cuotaDelMesContable: deCentavos(cifras.cuotaDelMesContableCentavos),
    cuotaDelMesFiscal: deCentavos(cifras.cuotaDelMesFiscalCentavos),
  };
}

const SIN_VENTA = {
  comprador: null,
  nitDelComprador: null,
  precio: null,
  iva: null,
  serieFel: null,
  numeroFel: null,
  autorizacionFel: null,
  resultadoContable: null,
  resultadoFiscal: null,
};

function ventaADto({ venta, resultadoContableCentavos, resultadoFiscalCentavos }: PropiedadesDeBaja) {
  if (!venta) return SIN_VENTA;
  const { comprador, nitDelComprador, serieFel, numeroFel, autorizacionFel } = venta;
  return {
    ...{ comprador, nitDelComprador, serieFel, numeroFel, autorizacionFel },
    precio: dinero(venta.precioCentavos),
    iva: dinero(venta.ivaCentavos),
    resultadoContable: dinero(resultadoContableCentavos),
    resultadoFiscal: dinero(resultadoFiscalCentavos),
  };
}

function avisosDe(baja: PropiedadesDeBaja, contexto: ContextoDeBajaDto): BajaDto['avisos'] {
  if (baja.estado === 'anulada') return [];
  return avisosDeBaja({
    causa: baja.causa,
    fecha: baja.fecha,
    tieneActa: baja.acta !== null,
    tieneDenuncia: baja.denunciaArchivoId !== null || baja.numeroDeDenuncia !== null,
    componentes: contexto.componentes.length,
    incisoFiscal: contexto.incisoFiscal,
    tipoDePersona: contexto.tipoDePersona,
    resultadoFiscalCentavos: baja.resultadoFiscalCentavos,
  });
}

/** Arma el DTO de la baja con sus avisos (§6.8); el dinero sale con dos decimales. */
export function bajaADto(baja: PropiedadesDeBaja, contexto: ContextoDeBajaDto): BajaDto {
  const { id, numero, anioDeNumero, fecha, causa, descripcion, autorizadaPor, destinoDelBien } = baja;
  return {
    ...{ id: id.valor, numero, anioDeNumero, fecha, causa, descripcion, autorizadaPor, destinoDelBien },
    activo: contexto.activo,
    numeroDeDenuncia: baja.numeroDeDenuncia,
    inventarioId: baja.inventarioId,
    tipoDeActa: baja.acta?.tipo ?? null,
    tieneActa: baja.acta !== null,
    tieneDenuncia: baja.denunciaArchivoId !== null,
    ...cifrasADto(baja.cifras),
    ...ventaADto(baja),
    estado: baja.estado,
    anuladaEn: baja.anuladaEn?.toISOString() ?? null,
    motivoDeAnulacion: baja.motivoDeAnulacion,
    componentes: contexto.componentes,
    avisos: avisosDe(baja, contexto),
  };
}
