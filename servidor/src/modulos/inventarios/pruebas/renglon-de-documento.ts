import type { RenglonDeDocumentoDto } from '../aplicacion/dto/documento.dto.js';
import type { ArticuloParaMovimiento } from '../aplicacion/puertos/catalogos-del-kardex.js';
import type { MovimientoDelKardex } from '../dominio/costeo/movimientos-del-kardex.js';
import { deCentavosEnteros, deDiezmilesimas, deMillonesimas } from '../dominio/decimales.js';

const abs = (valor: bigint): bigint => (valor < 0n ? -valor : valor);

/** El renglón de un documento tal como lo muestran las pantallas, a partir de su movimiento y su artículo. */
export function renglonDeDocumento(m: MovimientoDelKardex, articulo?: ArticuloParaMovimiento): RenglonDeDocumentoDto {
  return {
    movimientoId: m.id,
    articuloId: m.articuloId,
    articuloCodigo: articulo?.codigo ?? '',
    articuloNombre: articulo?.nombre ?? '',
    loteId: m.loteId,
    loteCodigo: null,
    cantidad: deDiezmilesimas(abs(m.cantidad)),
    unidadBaseNombre: 'Libra',
    cantidadEscrita: null,
    unidadEscritaSimbolo: null,
    costoUnitario: deMillonesimas(m.costoUnitario),
    costoTotal: deCentavosEnteros(abs(m.costoTotal)),
  };
}
