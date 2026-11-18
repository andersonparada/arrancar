import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearFechaHora, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { FichaDePago, LineaDeLaFicha, SolicitudDeDiferencia } from '../../servicios/tipos-de-pagos';
import { tituloDeDocumento } from '../detalles-de-documento';
import { centavosDe } from '../dinero';
import { AVISO_DE_DIFERENCIA_CON_RETENCION } from './avisos-del-pago';
import { textoDeRetenciones } from './comprobante-de-pago';
import { documentoDelPago, nombreDeLaForma } from './detalles-de-pago';

export const AVISO_DE_COBRADO = 'Cobrado: el banco ya pagó este cheque o nota. Reaplíquelo o registre un reintegro.';

const hayDinero = (texto: string | null | undefined): boolean => (centavosDe(texto ?? '0') ?? 0) > 0;

/** El cheque o la nota ya está conciliado y el pago sigue vigente: no se anula, se reaplica o se reintegra. */
export const estaCobrado = (ficha: Pick<FichaDePago, 'conciliado' | 'estado'>): boolean =>
  ficha.conciliado && ficha.estado === 'vigente';

/** Un cheque o una nota de débito mueven dinero en Bancos: al anular, Bancos decide el inverso y su fecha. */
export const mueveDinero = (ficha: Pick<FichaDePago, 'forma'>): boolean =>
  ficha.forma === 'cheque' || ficha.forma === 'nota_de_debito';

const textoDelMovimiento = (ficha: FichaDePago): string | null => {
  const { movimiento } = ficha;
  if (!movimiento) return null;
  const estado = movimiento.anulado ? 'anulado' : movimiento.conciliado ? 'conciliado' : 'sin conciliar';
  return `${documentoDelPago({ forma: ficha.forma, movimiento })} · ${movimiento.cuentaBancariaNombre} · ${formatearFecha(movimiento.fecha)} · ${estado}`;
};

const opcional = (etiqueta: string, valor: string | null | undefined): DetalleDeRegistro[] =>
  valor ? [{ etiqueta, valor }] : [];

/** Los datos del pago en su ficha; lo que no aplica a la forma no sale. */
export function detallesDeFichaDePago(ficha: FichaDePago): DetalleDeRegistro[] {
  const contrasenas = ficha.contrasenas.map(({ numero }) => numero).join(', ');
  return [
    { etiqueta: 'Proveedor', valor: ficha.proveedor.nombre },
    { etiqueta: 'Beneficiario', valor: ficha.beneficiario },
    { etiqueta: 'Forma', valor: nombreDeLaForma(ficha.forma) },
    { etiqueta: 'Fecha', valor: `${formatearFecha(ficha.fecha)}${ficha.posfechado ? ' (posfechado)' : ''}` },
    { etiqueta: 'Monto', valor: formatearMonto(ficha.monto) },
    ...opcional(ficha.contrasenas.length > 1 ? 'Contraseñas' : 'Contraseña', contrasenas),
    ...opcional('Documento en Bancos', textoDelMovimiento(ficha)),
    ...opcional(
      'Retiro de efectivo',
      ficha.retiro ? `${ficha.retiro.numero} · custodio ${ficha.retiro.custodio}` : null,
    ),
    ...opcional('Recibió por el proveedor', ficha.recibidoPor),
    ...opcional('Referencia', ficha.referencia),
    ...opcional('Motivo', ficha.motivo),
    ...opcional('Sin bancarizar porque', ficha.motivoSinBancarizar),
    ...opcional('Observaciones', ficha.observaciones),
    ...opcional('Registrado por', ficha.creadoPorNombre),
    { etiqueta: 'Registrado el', valor: formatearFechaHora(ficha.creadoEn) },
  ];
}

export function detallesDeAnulacionDePago(ficha: FichaDePago): DetalleDeRegistro[] {
  if (!ficha.anulacion) return [];
  return [
    { etiqueta: 'Fecha de la anulación', valor: formatearFecha(ficha.anulacion.fecha) },
    { etiqueta: 'Motivo', valor: ficha.anulacion.motivo },
  ];
}

/** Lo que Bancos hace al anular, para decirlo antes de confirmar. */
function efectoEnBancos(ficha: FichaDePago): string {
  if (ficha.forma === 'cheque')
    return 'Bancos anulará el cheque o, si su mes ya está conciliado, creará un movimiento inverso.';
  if (ficha.forma === 'nota_de_debito') return 'Bancos creará el movimiento inverso de la nota de débito.';
  if (ficha.forma === 'nota_ligada') return 'La nota de Bancos no se anula: vuelve a quedar disponible para otro pago.';
  return 'No se mueve dinero en Bancos.';
}

/** Qué pasará al anular, en una frase por efecto. */
export function resumenDeAnularPago(ficha: FichaDePago): string {
  const documentos = ficha.aplicaciones.length;
  const diferencias =
    ficha.diferencias.length > 0 ? ' Las diferencias que se dieron por saldadas también se anulan.' : '';
  return (
    `Se anulará el pago ${ficha.numero} de ${formatearMonto(ficha.monto)} a ${ficha.proveedor.nombre}. ` +
    `${documentos === 1 ? 'El documento que cubría recupera' : `Los ${documentos} documentos que cubría recuperan`} su saldo. ` +
    `${efectoEnBancos(ficha)}${diferencias} Esto no se puede deshacer.`
  );
}

/** Lo que se confirma al dar por saldada la diferencia de una línea. */
export function resumenDeSaldarDiferencia(ficha: FichaDePago, linea: LineaDeLaFicha): string {
  const aviso = hayDinero(linea.retenciones) ? ` ${AVISO_DE_DIFERENCIA_CON_RETENCION}` : '';
  return (
    `Se da por saldada la diferencia de ${formatearMonto(linea.diferenciaOfrecible)} de ${tituloDeDocumento(linea)}: ` +
    `el documento quedará en Q0.00 con el pago ${ficha.numero}. No es un descuento del proveedor.${aviso}`
  );
}

/** El cuerpo para saldar la diferencia que el servidor ofrece en esa línea. */
export const solicitudDeSaldarDiferencia = (linea: LineaDeLaFicha): SolicitudDeDiferencia => ({
  cargoId: linea.documentoId,
  monto: linea.diferenciaOfrecible,
});

/** «Saldar la diferencia» se ofrece solo si el servidor dice que se puede y la línea tiene un residuo. */
export const sePuedeSaldar = (ficha: Pick<FichaDePago, 'puedeSaldarDiferencia'>, linea: LineaDeLaFicha): boolean =>
  ficha.puedeSaldarDiferencia && hayDinero(linea.diferenciaOfrecible);

/** La diferencia ya saldada de un cargo del pago, o `null`. */
export const diferenciaSaldadaDe = (ficha: FichaDePago, documentoId: string): string | null =>
  ficha.diferencias.find(({ cargoId }) => cargoId === documentoId)?.monto ?? null;

/** Las constancias de la línea como se leen: «IVA Q120.00 · constancia por emitir». */
export const textoDeConstancias = (linea: LineaDeLaFicha): string[] => textoDeRetenciones(linea.retencionesDelLibro);
