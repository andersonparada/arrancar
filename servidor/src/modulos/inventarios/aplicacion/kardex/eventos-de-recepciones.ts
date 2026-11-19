import { CostoAjustado, DevolucionAProveedorRegistrada, EntradaRegistrada } from '../../dominio/eventos.js';
import { comunes, type DatosParaEventos } from './eventos-del-kardex.js';

/** El evento de una recepción: entró mercadería de una factura del libro (`causa = 'compra'`). */
export function eventoDeRecepcion(datos: DatosParaEventos): EntradaRegistrada {
  return new EntradaRegistrada({
    ...comunes(datos),
    documentoDeCompraId: datos.documento.documentoDeCompraId,
    causa: 'compra',
    valorRazonableCentavos: null,
  });
}

/** El evento de una devolución: las entradas de las que salió y la nota de crédito que la respalda. */
export function eventoDeDevolucion(datos: DatosParaEventos): DevolucionAProveedorRegistrada {
  return new DevolucionAProveedorRegistrada({
    ...comunes(datos),
    documentoDeCompraId: datos.documento.documentoDeCompraId!,
    entradasDevueltas: [
      ...new Set(datos.movimientos.flatMap((m) => (m.movimientoDeOrigenId ? [m.movimientoDeOrigenId] : []))),
    ],
  });
}

/** El evento de una rebaja: lo que absorbió cada entrada y lo que fue a resultados (con signo, en negativo). */
export function eventoDeCostoAjustado(datos: DatosParaEventos): CostoAjustado {
  return new CostoAjustado({
    ...comunes(datos),
    documentoDeCompraId: datos.documento.documentoDeCompraId!,
    repartos: datos.movimientos.map((m) => ({
      movimientoDeEntradaId: m.movimientoDeOrigenId!,
      absorbidoCentavos: Number(m.costoTotal),
      aResultadosCentavos: Number(m.montoAResultados),
    })),
  });
}
