import type { CargoDeContrasena, NotaDisponible } from '../../servicios/tipos-de-contrasenas';
import { centavosDe } from '../dinero';

/** Lo que una nota rebajaría de un cargo; es una vista previa, el servidor hace el reparto definitivo al guardar. */
export interface RepartoPrevio {
  notaId: string;
  cargoId: string;
  centavos: number;
}

export interface ResultadoDelReparto {
  aplicaciones: RepartoPrevio[];
  /** Lo que queda por pagar de cada cargo (por id), en centavos. */
  saldoPorCargo: Record<string, number>;
  /** Lo que sobra de cada nota (por id), en centavos. */
  libreDeNota: Record<string, number>;
}

export const centavosOCero = (monto: string): number => centavosDe(monto) ?? 0;

const porEmision = (a: { fechaEmision: string; documentoId: string }, b: typeof a): number =>
  a.fechaEmision.localeCompare(b.fechaEmision) || a.documentoId.localeCompare(b.documentoId);

const AL_FINAL = '9999-12-31';

const porVencimiento = (a: CargoDeContrasena, b: CargoDeContrasena): number =>
  (a.vencimiento ?? AL_FINAL).localeCompare(b.vencimiento ?? AL_FINAL) || porEmision(a, b);

/**
 * La misma regla del servidor: las notas por fecha de emisión, los cargos por vencimiento y emisión; cada nota rebaja
 * los saldos que van quedando y lo que sobra sigue libre. El orden exacto de dos documentos con la misma fecha puede
 * diferir (el servidor desempata por hora de alta), por eso es solo una vista previa.
 */
export function repartirEnVivo(
  cargos: readonly CargoDeContrasena[],
  notas: readonly NotaDisponible[],
): ResultadoDelReparto {
  const ordenados = [...cargos].sort(porVencimiento);
  const saldoPorCargo = Object.fromEntries(ordenados.map((cargo) => [cargo.documentoId, centavosOCero(cargo.saldo)]));
  const libreDeNota: Record<string, number> = {};
  const aplicaciones: RepartoPrevio[] = [];
  for (const nota of [...notas].sort(porEmision)) {
    let porAplicar = centavosOCero(nota.saldoLibre);
    for (const { documentoId } of ordenados) {
      const centavos = Math.min(porAplicar, Math.max(saldoPorCargo[documentoId] ?? 0, 0));
      if (centavos <= 0) continue;
      aplicaciones.push({ notaId: nota.documentoId, cargoId: documentoId, centavos });
      saldoPorCargo[documentoId] = (saldoPorCargo[documentoId] ?? 0) - centavos;
      porAplicar -= centavos;
    }
    libreDeNota[nota.documentoId] = porAplicar;
  }
  return { aplicaciones, saldoPorCargo, libreDeNota };
}
