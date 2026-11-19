import type { MovimientoDelKardex } from '../../dominio/costeo/movimientos-del-kardex.js';
import { deDiezmilesimas } from '../../dominio/decimales.js';
import {
  CostoRecalculado,
  DocumentoDeInventarioAnulado,
  EntradaRegistrada,
  SalidaRegistrada,
} from '../../dominio/eventos.js';
import type { ArticuloParaMovimiento } from '../puertos/catalogos-del-kardex.js';
import type { DocumentoGuardado } from '../puertos/repositorio-de-documentos.js';
import type { DiferenciaDeSalida } from './recalculador-de-articulo.js';

export interface DatosParaEventos {
  empresaId: string;
  documento: DocumentoGuardado;
  movimientos: readonly MovimientoDelKardex[];
  articulos: ReadonlyMap<string, ArticuloParaMovimiento>;
}

const magnitud = (valor: bigint): bigint => (valor < 0n ? -valor : valor);

function comunes({ empresaId, documento, movimientos, articulos }: DatosParaEventos) {
  return {
    empresaId,
    documentoId: documento.id,
    clase: documento.clase,
    numero: documento.numero,
    fecha: documento.fecha,
    bodegaId: documento.bodegaId,
    renglones: movimientos.map((m) => ({
      movimientoId: m.id,
      articuloId: m.articuloId,
      tipoDeInventario: articulos.get(m.articuloId)?.tipoDeInventario ?? '',
      cantidad: deDiezmilesimas(magnitud(m.cantidad)),
      costoCentavos: Number(magnitud(m.costoTotal)),
    })),
  };
}

/** El evento de una entrada manual; con donación recibida lleva el valor razonable para que Contabilidad abone el ingreso. */
export function eventoDeEntrada(datos: DatosParaEventos): EntradaRegistrada {
  const { documento, movimientos } = datos;
  const esDonacion = documento.causa === 'donacion_recibida';
  const total = movimientos.reduce((suma, m) => suma + m.costoTotal, 0n);
  return new EntradaRegistrada({
    ...comunes(datos),
    documentoDeCompraId: null,
    causa: documento.causa ?? '',
    valorRazonableCentavos: esDonacion ? Number(total) : null,
  });
}

export function eventoDeSalida(datos: DatosParaEventos): SalidaRegistrada {
  const { documento } = datos;
  return new SalidaRegistrada({
    ...comunes(datos),
    destino: documento.destino ?? '',
    conceptoDeGastoId: documento.conceptoDeGastoId,
    localidadId: documento.localidadId,
    departamentoId: documento.departamentoId,
    activoFijoId: documento.activoFijoId,
  });
}

export function eventoDeAnulacion(empresaId: string, documento: DocumentoGuardado): DocumentoDeInventarioAnulado {
  const { id, clase, numero } = documento;
  return new DocumentoDeInventarioAnulado({ empresaId, documentoId: id, clase, numero });
}

/** El evento de un recálculo, solo si alguna salida cambió de costo. */
export function eventoDeRecalculo(datos: {
  empresaId: string;
  causa: string;
  documentoId: string;
  diferencias: readonly DiferenciaDeSalida[];
}): CostoRecalculado | null {
  const { empresaId, causa, documentoId, diferencias } = datos;
  if (diferencias.length === 0) return null;
  const resumidas = diferencias.map(({ movimientoId, documentoId: deLaSalida, diferenciaCentavos }) => ({
    movimientoId,
    documentoId: deLaSalida,
    diferenciaCentavos,
  }));
  return new CostoRecalculado({ empresaId, causa, documentoId, diferencias: resumidas, repartos: [] });
}
