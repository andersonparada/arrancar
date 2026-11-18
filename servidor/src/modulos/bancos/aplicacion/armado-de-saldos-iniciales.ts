import { avisosDeLaPartida } from '../dominio/apertura.js';
import { aCentavos } from '../dominio/centavos.js';
import { calcularCuadre, compararConLibros } from '../dominio/cuadre-de-apertura.js';
import { hallazgosDeCierre, type CuentaParaLaRevision } from '../dominio/hallazgos-de-cierre.js';
import { esSaldoPrincipal } from '../dominio/partes-de-apertura.js';
import type { AvisoDeApertura, PartidaDeAperturaDto, SaldoInicialResumenDto } from './dto/saldo-inicial.dto.js';
import type { CuentaConSuCabecera, PartidaDeLaBase } from './puertos/consultas-de-saldos-iniciales.js';

/** Lo que cambia el armado según la empresa: la fecha de corte, si la carga está cerrada y la antigüedad de los cheques. */
export interface ContextoDeLaFicha {
  corte: string | null;
  cerrada: boolean;
  mesesDeVencimiento: number;
  permiteSobregiro: boolean;
}

/** Corregir o eliminar una partida: con la carga abierta y sin que el banco ya la haya visto ni se haya anulado. */
function sePuedeCambiar(partida: PartidaDeLaBase, { corte, cerrada }: ContextoDeLaFicha): boolean {
  if (cerrada || corte === null || esSaldoPrincipal(partida.parte)) return false;
  return partida.conciliadaEn === null && !partida.anulada && !partida.revertida;
}

const AVISO_EN_LA_FICHA = { cheque_antiguo: 'antiguo', deposito_viejo: 'deposito_viejo' } as const;

/** Las insignias de la ficha («Antiguo», «Revisar»): los mismos avisos que se dan al guardar. */
function avisosDeLaFicha(partida: PartidaDeLaBase, { corte, mesesDeVencimiento }: ContextoDeLaFicha) {
  if (corte === null) return [];
  return avisosDeLaPartida(partida, { corte, mesesDeVencimiento }).map(({ codigo }) => AVISO_EN_LA_FICHA[codigo]);
}

/** La partida como la ve la pantalla; `puedeAnular` llega con BS-3. */
export function partidaDeApertura(partida: PartidaDeLaBase, contexto: ContextoDeLaFicha): PartidaDeAperturaDto {
  const { conciliacionId: _conciliacionId, cuentaBancariaId: _cuentaBancariaId, ...datos } = partida;
  const esPosfechado = partida.parte === 'cheque_posfechado';
  const puedeCambiar = sePuedeCambiar(partida, contexto);
  return {
    ...datos,
    conceptoId: esPosfechado ? partida.conceptoId : null,
    conceptoNombre: esPosfechado ? partida.conceptoNombre : null,
    avisos: avisosDeLaFicha(partida, contexto),
    puedeCorregir: puedeCambiar,
    puedeEliminar: puedeCambiar,
    puedeAnular: false,
  };
}

const formaDe = (cuenta: CuentaConSuCabecera, partidas: PartidaDeLaBase[]) => {
  if (cuenta.cabeceraId === null) return 'sin_saldo' as const;
  return partidas.some((p) => p.parte === 'saldo_global' && !p.anulada)
    ? ('global' as const)
    : ('con_partidas' as const);
};

/** El cuadre de una cuenta con las partidas que tiene (las de todas las partes, el posfechado incluido). */
export function resumenDeLaCuenta(
  cuenta: CuentaConSuCabecera,
  partidas: PartidaDeLaBase[],
  contexto: ContextoDeLaFicha,
): SaldoInicialResumenDto {
  const cuadre = calcularCuadre(partidas);
  const comparacion = compararConLibros(cuadre.saldoEnLibrosAlCorte, cuenta.saldoSegunLibrosAnteriores);
  const { corte, cerrada } = contexto;
  return {
    cuentaBancariaId: cuenta.cuentaBancariaId,
    cuentaNombre: cuenta.cuentaNombre,
    bancoNombre: cuenta.bancoNombre,
    forma: formaDe(cuenta, partidas),
    fechaDeCorte: corte,
    ...cuadre,
    saldoSegunLibrosAnteriores: cuenta.saldoSegunLibrosAnteriores,
    ...comparacion,
    tieneEvidencia: cuenta.tieneEvidencia,
    tieneConciliaciones: cuenta.tieneConciliaciones,
    puedeEditar: !cerrada && corte !== null,
    puedeEliminar: cuenta.cabeceraId !== null && !cerrada && !cuenta.tieneConciliaciones,
  };
}

/** Los hallazgos de §5.6 a partir de los resúmenes de las cuentas. */
export function hallazgosDeLosResumenes(resumenes: SaldoInicialResumenDto[], permiteSobregiro: boolean) {
  const cuentas: CuentaParaLaRevision[] = resumenes.map((resumen) => ({ ...resumen }));
  return hallazgosDeCierre(cuentas, permiteSobregiro);
}

/** Avisos de la cuenta al guardar (no bloquean): saldo negativo sin permiso de sobregiro y diferencia con los libros. */
export function avisosDeLaCuenta(resumen: SaldoInicialResumenDto, permiteSobregiro: boolean): AvisoDeApertura[] {
  const avisos: AvisoDeApertura[] = [];
  if (resumen.forma !== 'sin_saldo' && aCentavos(resumen.saldoEnLibrosAlCorte) < 0 && !permiteSobregiro) {
    avisos.push({
      codigo: 'saldo_negativo_sin_sobregiro',
      mensaje: 'El saldo en libros al corte es negativo y la empresa no permite sobregiro: revise las partidas.',
    });
  }
  if (resumen.saldoSegunLibrosAnteriores !== null && !resumen.cuadra) {
    avisos.push({
      codigo: 'no_cuadra',
      mensaje: `El saldo en libros al corte difiere del saldo de los libros anteriores en ${resumen.diferencia}.`,
    });
  }
  return avisos;
}
