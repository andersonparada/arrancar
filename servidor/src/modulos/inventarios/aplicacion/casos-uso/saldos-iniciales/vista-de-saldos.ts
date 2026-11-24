import type {
  SaldoInicialDto,
  SaldoInicialVisible,
  SaldosInicialesDto,
  SaldosInicialesVisibles,
} from '../../dto/saldo-inicial.dto.js';
import type { VistaDelKardex } from '../../dto/documento.dto.js';

/** Sin `costos.ver`, el renglón solo lleva cantidades: el servidor no manda el dinero que no se debe ver (INV-A7). */
export function saldoSegunLaVista(
  saldo: SaldoInicialDto,
  vista: Pick<VistaDelKardex, 'verCostos'>,
): SaldoInicialVisible {
  return vista.verCostos ? saldo : { ...saldo, costoTotal: null, costoUnitario: null };
}

/** Lo mismo para la pantalla entera: renglones sin costo y totales sin valor. */
export function pantallaSegunLaVista(
  pantalla: SaldosInicialesDto,
  vista: Pick<VistaDelKardex, 'verCostos'>,
): SaldosInicialesVisibles {
  if (vista.verCostos) return pantalla;
  return {
    ...pantalla,
    totales: { ...pantalla.totales, valor: null },
    saldos: pantalla.saldos.map((saldo) => saldoSegunLaVista(saldo, vista)),
  };
}
