import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import { ComprobanteAsignado, ComprobanteQuitado } from '../../../dominio/eventos-de-comprobantes.js';
import { esDeducible } from '../../../dominio/reglas-de-reportes.js';
import { efectivoEsperado } from '../../../dominio/monto-del-fondo.js';
import type { ConsultasDeFondos } from '../../puertos/puertos-de-fondos.js';

/** El efectivo que debe haber ahora en la caja del fondo (lee la transacción en curso). */
export async function efectivoEsperadoDelFondo(consultas: ConsultasDeFondos, fondoId: string): Promise<number> {
  const lectura = (await consultas.datosDeLectura([fondoId])).get(fondoId);
  if (!lectura) throw new RecursoNoEncontrado('El fondo');
  return efectivoEsperado(lectura);
}

/** El comprobante entró al fondo (`comprobante.fondoId` ya está puesto). Un vale de gasto nunca es deducible. */
export function eventoDeAsignado(operador: Operador, comprobante: Comprobante): EventoDominio {
  return new ComprobanteAsignado({
    empresaId: operador.empresaId,
    fondoId: comprobante.fondoId!,
    comprobanteId: comprobante.id,
    clase: comprobante.clase === 'vale_de_gasto' ? 'vale_de_gasto' : 'documento',
    documentoDeCompraId: comprobante.documentoDeCompraId,
    fecha: comprobante.fecha,
    montoCentavos: comprobante.montoCentavos,
    montoRetenidoCentavos: comprobante.montoRetenidoCentavos,
    resta: comprobante.resta,
    conceptoDeGastoId: comprobante.conceptoDeGastoId,
    deducible: esDeducible(comprobante),
    conActivoFijo: comprobante.conActivoFijo,
  });
}

/** El comprobante salió del fondo; recibe el comprobante como estaba (con su `fondoId`). */
export function eventoDeQuitado(
  operador: Operador,
  por: { comprobante: Comprobante; motivo: 'devuelto_a_la_bandeja' | 'anulado' },
): EventoDominio {
  const { comprobante, motivo } = por;
  return new ComprobanteQuitado({
    empresaId: operador.empresaId,
    fondoId: comprobante.fondoId!,
    comprobanteId: comprobante.id,
    clase: comprobante.clase === 'vale_de_gasto' ? 'vale_de_gasto' : 'documento',
    fecha: comprobante.fecha,
    montoCentavos: comprobante.montoCentavos,
    resta: comprobante.resta,
    motivo,
  });
}
