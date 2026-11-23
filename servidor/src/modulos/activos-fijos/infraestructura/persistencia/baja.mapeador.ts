import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Baja, type BajaId, type PropiedadesDeBaja } from '../../dominio/baja.js';
import type { CifrasDeBaja, DatosDeVenta } from '../../dominio/tipos-de-baja.js';
import type { bajas } from './bajas.tablas.js';

type Fila = typeof bajas.$inferSelect;
type FilaNueva = typeof bajas.$inferInsert;

const enCentavos = (monto: string | null): number | null => (monto === null ? null : aCentavos(monto));
const enTexto = (centavos: number | null): string | null => (centavos === null ? null : deCentavos(centavos));

function cifrasDeFila(fila: Fila): CifrasDeBaja {
  return {
    costoCentavos: aCentavos(fila.costo),
    depreciacionAcumuladaContableCentavos: aCentavos(fila.depreciacionAcumuladaContable),
    valorEnLibrosCentavos: aCentavos(fila.valorEnLibros),
    costoFiscalCentavos: aCentavos(fila.costoFiscal),
    baseFiscalCentavos: aCentavos(fila.baseFiscal),
    depreciacionAcumuladaFiscalCentavos: aCentavos(fila.depreciacionAcumuladaFiscal),
    valorFiscalPorDepreciarCentavos: aCentavos(fila.valorFiscalPorDepreciar),
    cuotaDelMesContableCentavos: aCentavos(fila.cuotaDelMesContable),
    cuotaDelMesFiscalCentavos: aCentavos(fila.cuotaDelMesFiscal),
  };
}

function cifrasAFila(cifras: CifrasDeBaja) {
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

function ventaDeFila(fila: Fila): DatosDeVenta | null {
  if (fila.precio === null) return null;
  return {
    comprador: fila.comprador!,
    nitDelComprador: fila.nitDelComprador!,
    precioCentavos: aCentavos(fila.precio),
    ivaCentavos: aCentavos(fila.iva ?? '0'),
    serieFel: fila.serieFel,
    numeroFel: fila.numeroFel!,
    autorizacionFel: fila.autorizacionFel!,
  };
}

const SIN_VENTA_EN_FILA = {
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

function ventaAFila(p: PropiedadesDeBaja) {
  if (!p.venta) return SIN_VENTA_EN_FILA;
  const { comprador, nitDelComprador, serieFel, numeroFel, autorizacionFel } = p.venta;
  return {
    ...{ comprador, nitDelComprador, serieFel, numeroFel, autorizacionFel },
    precio: deCentavos(p.venta.precioCentavos),
    iva: deCentavos(p.venta.ivaCentavos),
    resultadoContable: enTexto(p.resultadoContableCentavos),
    resultadoFiscal: enTexto(p.resultadoFiscalCentavos),
  };
}

function documentosYEstadoAFila(p: PropiedadesDeBaja) {
  return {
    actaArchivoId: p.acta?.archivoId ?? null,
    tipoDeActa: p.acta?.tipo ?? null,
    denunciaArchivoId: p.denunciaArchivoId,
    estado: p.estado,
    anuladaEn: p.anuladaEn,
    anuladaPor: p.anuladaPor,
    motivoDeAnulacion: p.motivoDeAnulacion,
  };
}

/** Traduce entre la fila (dinero con dos decimales) y la entidad (centavos enteros); sin marcas de tiempo ni autoría. */
export const mapeadorDeBaja = {
  aEntidad(fila: Fila): Baja {
    const { fecha, causa, descripcion, autorizadaPor, destinoDelBien, numeroDeDenuncia, inventarioId } = fila;
    return Baja.reconstruir({
      ...{ fecha, causa, descripcion, autorizadaPor, destinoDelBien, numeroDeDenuncia, inventarioId },
      id: Identificador.desde(fila.id) as BajaId,
      empresaId: Identificador.desde(fila.empresaId),
      activoId: fila.activoId,
      numero: fila.numero,
      anioDeNumero: fila.anioDeNumero,
      cifras: cifrasDeFila(fila),
      venta: ventaDeFila(fila),
      resultadoContableCentavos: enCentavos(fila.resultadoContable),
      resultadoFiscalCentavos: enCentavos(fila.resultadoFiscal),
      acta: fila.actaArchivoId ? { archivoId: fila.actaArchivoId, tipo: fila.tipoDeActa! } : null,
      denunciaArchivoId: fila.denunciaArchivoId,
      estado: fila.estado,
      anuladaEn: fila.anuladaEn,
      anuladaPor: fila.anuladaPor,
      motivoDeAnulacion: fila.motivoDeAnulacion,
    });
  },

  aFila(baja: Baja): FilaNueva {
    const p = baja.instantanea();
    const { fecha, causa, descripcion, autorizadaPor, destinoDelBien, numeroDeDenuncia, inventarioId } = p;
    return {
      ...{ fecha, causa, descripcion, autorizadaPor, destinoDelBien, numeroDeDenuncia, inventarioId },
      id: p.id.valor,
      empresaId: p.empresaId.valor,
      activoId: p.activoId,
      numero: p.numero,
      anioDeNumero: p.anioDeNumero,
      ...cifrasAFila(p.cifras),
      ...ventaAFila(p),
      ...documentosYEstadoAFila(p),
    };
  },
};
