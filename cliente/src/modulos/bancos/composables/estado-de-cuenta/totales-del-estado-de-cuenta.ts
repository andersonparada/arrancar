import type { FilaDelReporte } from '../../servicios/movimientos.api';
import { aCentavos, deCentavos } from '../comunes/centavos';
import { creditoDeFila, debitoDeFila } from '../movimientos/fila-del-reporte';

export interface TotalDeTipo {
  etiqueta: string;
  cantidad: number;
  debitos: string;
  creditos: string;
}

export interface TotalesDelEstado {
  debitos: string;
  creditos: string;
  porTipo: TotalDeTipo[];
}

/** Los cheques se agrupan aparte del resto; el saldo inicial y las notas, por su nombre. */
const ETIQUETA_DE_TIPO = { cheque: 'Cheques', credito: 'Notas de crédito', debito: 'Notas de débito' } as const;
const etiquetaDeTipo = (fila: FilaDelReporte): string =>
  fila.saldoInicial ? 'Saldo inicial' : ETIQUETA_DE_TIPO[fila.tipo];

/**
 * Los totales de débitos y créditos por tipo de documento, solo para mostrar. Un cheque anulado a la antigua
 * (con `anuladoEn`) no movió el saldo y no cuenta; un movimiento revertido y su inverso sí, y se cancelan.
 */
export function totalesDelEstado(filas: FilaDelReporte[]): TotalesDelEstado {
  const grupos = new Map<string, { cantidad: number; debitos: number; creditos: number }>();
  for (const fila of filas.filter((f) => !f.anuladoEn)) {
    const grupo = grupos.get(etiquetaDeTipo(fila)) ?? { cantidad: 0, debitos: 0, creditos: 0 };
    grupo.cantidad += 1;
    grupo.debitos += aCentavos(debitoDeFila(fila) ?? '0');
    grupo.creditos += aCentavos(creditoDeFila(fila) ?? '0');
    grupos.set(etiquetaDeTipo(fila), grupo);
  }
  const porTipo = [...grupos].map(([etiqueta, g]) => ({
    etiqueta,
    cantidad: g.cantidad,
    debitos: deCentavos(g.debitos),
    creditos: deCentavos(g.creditos),
  }));
  const suma = (clave: 'debitos' | 'creditos'): string =>
    deCentavos([...grupos.values()].reduce((total, g) => total + g[clave], 0));
  return { debitos: suma('debitos'), creditos: suma('creditos'), porTipo };
}
