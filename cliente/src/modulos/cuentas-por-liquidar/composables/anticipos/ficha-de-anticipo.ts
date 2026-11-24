import type { RouteLocationRaw } from 'vue-router';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto, formatearSiNo } from '@/modulos/core/utilidades/formato';
import type { Anticipo, DestinoDeNoLiquidado } from '../../servicios/tipos-de-anticipos';
import {
  documentoDelAnticipo,
  NOMBRES_DE_CLASE,
  nombreDelEstadoDeAnticipo,
  textoDePorJustificar,
} from './lista-de-anticipos';

export const NOMBRES_DE_DESTINO: Record<DestinoDeNoLiquidado, string> = {
  cobrar: 'Cobrarlo en cuotas',
  renta_del_trabajo: 'Renta del trabajo (empleado)',
  perdida: 'Pérdida para la empresa',
};

/** El destino de lo no liquidado dicho en una frase; si se cobra, con sus cuotas («Cobrarlo en 6 cuotas»). */
export function textoDelDestino(destino: DestinoDeNoLiquidado, cuotas: number | null): string {
  if (destino !== 'cobrar' || !cuotas) return NOMBRES_DE_DESTINO[destino];
  return `Cobrarlo en ${cuotas} ${cuotas === 1 ? 'cuota' : 'cuotas'}`;
}

/** Los datos del anticipo en su ficha. */
export function detallesDelAnticipo(anticipo: Anticipo): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Beneficiario', valor: anticipo.beneficiario },
    { etiqueta: 'Es empleado', valor: formatearSiNo(anticipo.esEmpleado) },
    { etiqueta: 'Clase', valor: NOMBRES_DE_CLASE[anticipo.clase] },
    { etiqueta: 'Estado', valor: nombreDelEstadoDeAnticipo(anticipo.estado) },
    { etiqueta: 'Entrega', valor: formatearFecha(anticipo.fecha) },
    { etiqueta: 'Fecha límite', valor: formatearFecha(anticipo.fechaLimite) },
    { etiqueta: 'Documento en Bancos', valor: documentoDelAnticipo(anticipo.forma, anticipo.movimiento.numero) },
    { etiqueta: 'Para qué es', valor: anticipo.descripcion, largo: true },
  ];
  if (anticipo.motivoConVencidos) {
    detalles.push({ etiqueta: 'Entregado con vencidos, por', valor: anticipo.motivoConVencidos, largo: true });
  }
  return detalles;
}

/** Las tres cifras que importan: lo entregado, lo gastado y lo que falta por justificar. */
export function cifrasDelAnticipo(anticipo: Pick<Anticipo, 'monto' | 'gastado' | 'porJustificar'>) {
  const deMas = anticipo.porJustificar.startsWith('-');
  return [
    { etiqueta: 'Entregado', valor: formatearMonto(anticipo.monto), enfasis: false },
    { etiqueta: 'Gastado', valor: formatearMonto(anticipo.gastado), enfasis: false },
    {
      etiqueta: deMas ? 'Gastado de más' : 'Por justificar',
      valor: formatearMonto(deMas ? anticipo.porJustificar.slice(1) : anticipo.porJustificar),
      enfasis: true,
    },
  ];
}

/** Qué pasará con el dinero según lo que falta por justificar (solo lo explica; las cuentas las hace el servidor). */
export function explicacionDelSaldo(anticipo: Pick<Anticipo, 'porJustificar'>): string {
  if (anticipo.porJustificar.startsWith('-')) {
    return 'Se gastó más de lo entregado: al liquidar, la empresa reembolsa la diferencia al beneficiario.';
  }
  if (anticipo.porJustificar === '0.00') return 'Todo el dinero está justificado: ya se puede liquidar.';
  return `Faltan ${textoDePorJustificar(anticipo.porJustificar)} por justificar: se agregan facturas o gastos, o al liquidar se devuelve o se deja sin liquidar.`;
}

type Liquidacion = NonNullable<Anticipo['liquidacion']>;

/** Lo no liquidado: cuánto, a dónde va (con las cuotas si se cobra) y por qué. */
function detallesDeLoNoLiquidado(liquidacion: Liquidacion): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [{ etiqueta: 'Sin liquidar', valor: formatearMonto(liquidacion.noLiquidado) }];
  if (liquidacion.destinoDeNoLiquidado) {
    const valor = textoDelDestino(liquidacion.destinoDeNoLiquidado, liquidacion.cuotas);
    detalles.push({ etiqueta: 'Destino de lo no liquidado', valor });
  }
  if (liquidacion.motivoDeNoLiquidado) {
    detalles.push({ etiqueta: 'Motivo', valor: liquidacion.motivoDeNoLiquidado, largo: true });
  }
  return detalles;
}

/** Lo que dejó la liquidación, solo lo que pasó (sin líneas en cero). */
export function detallesDeLaLiquidacion(anticipo: Anticipo): DetalleDeRegistro[] {
  const { liquidacion } = anticipo;
  if (!liquidacion) return [];
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Fecha de liquidación', valor: formatearFecha(liquidacion.fecha) },
  ];
  if (liquidacion.devuelto !== '0.00') {
    detalles.push({ etiqueta: 'Devuelto a la empresa', valor: formatearMonto(liquidacion.devuelto) });
  }
  if (liquidacion.reembolsado !== '0.00') {
    detalles.push({ etiqueta: 'Reembolsado al beneficiario', valor: formatearMonto(liquidacion.reembolsado) });
  }
  return liquidacion.noLiquidado !== '0.00' ? [...detalles, ...detallesDeLoNoLiquidado(liquidacion)] : detalles;
}

export function detallesDeLaAnulacion(anticipo: Anticipo): DetalleDeRegistro[] {
  if (!anticipo.anulacion) return [];
  return [
    { etiqueta: 'Fecha de anulación', valor: formatearFecha(anticipo.anulacion.fecha) },
    { etiqueta: 'Motivo', valor: anticipo.anulacion.motivo, largo: true },
  ];
}

/** Qué pasará al anular: lo que se hace en Bancos con el cheque o la nota. */
export function resumenDeAnular(anticipo: Pick<Anticipo, 'numero' | 'forma' | 'monto' | 'beneficiario'>): string {
  const documento = anticipo.forma === 'cheque' ? 'el cheque' : 'la nota de débito';
  return (
    `Se anulará el anticipo ${anticipo.numero} de ${formatearMonto(anticipo.monto)} a ${anticipo.beneficiario}. ` +
    `Bancos anulará ${documento} (o creará su movimiento inverso). Solo se puede anular un anticipo sin gastos.`
  );
}

/** Qué pasará al reabrir una liquidación. */
export function resumenDeReabrir(anticipo: Pick<Anticipo, 'numero' | 'liquidacion'>): string {
  const mueveDinero = Boolean(
    anticipo.liquidacion && (anticipo.liquidacion.devuelto !== '0.00' || anticipo.liquidacion.reembolsado !== '0.00'),
  );
  const banco = mueveDinero ? ' Bancos anulará el depósito o el reembolso que se hizo al liquidar.' : '';
  return `El anticipo ${anticipo.numero} vuelve a estar por liquidar y se borra su liquidación.${banco}`;
}

/** Si la anulación o la reapertura mueve dinero en Bancos, se puede escribir la fecha del movimiento. */
export const reabrirConFecha = (anticipo: Pick<Anticipo, 'liquidacion'>): boolean =>
  Boolean(
    anticipo.liquidacion && (anticipo.liquidacion.devuelto !== '0.00' || anticipo.liquidacion.reembolsado !== '0.00'),
  );

/** Los avisos de la ficha sin repetir: el servidor manda el de los vencidos en `aviso` y también dentro de `avisos`. */
export const avisosDeLaFicha = (anticipo: Pick<Anticipo, 'avisos' | 'aviso'>): string[] => [
  ...new Set([...anticipo.avisos, ...(anticipo.aviso ? [anticipo.aviso] : [])]),
];

/** Ingreso de facturas con el anticipo como destino: al guardar vuelve a la ficha. */
export function rutaDeIngresoDeFactura(anticipo: Pick<Anticipo, 'id' | 'numero' | 'beneficiario'>): RouteLocationRaw {
  return {
    name: 'libro-de-compras.documentos.nuevo',
    query: {
      destino: 'cuentas-por-liquidar',
      referencia: anticipo.id,
      etiqueta: `Anticipo ${anticipo.numero} · ${anticipo.beneficiario}`,
      volver: `/cuentas-por-liquidar/anticipos/${anticipo.id}`,
    },
  };
}
