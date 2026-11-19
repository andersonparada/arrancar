import { CupoDeCorreosAgotado, type LimiteDeCorreos } from './errores-de-la-bandeja.js';

/** Topes de envío (C5); los fija la instalación. */
export interface TopesDeCorreo {
  readonly porHoraPorCuenta: number;
  readonly porDiaPorCuenta: number;
  readonly porDiaPorDestinatario: number;
  readonly porHoraDeLaInstalacion: number;
}

/** Lo ya encolado, según `core.reservar_cupo_de_correo`: sin contar el correo que se va a agregar. */
export interface UsoDeCupos {
  readonly porHora: number;
  readonly porDia: number;
  readonly deLaInstalacionPorHora: number;
  /** Dirección en minúsculas → correos que recibió de esta cuenta en 24 horas. */
  readonly porDestinatario: Readonly<Record<string, number>>;
}

/**
 * Comprueba que un correo más cabe en los topes. El orden importa para el mensaje: primero lo que depende de la
 * cuenta, después lo de la dirección y al final lo de la instalación (que no revela datos de otras cuentas).
 * @throws CupoDeCorreosAgotado
 */
export function verificarCupos(uso: UsoDeCupos, topes: TopesDeCorreo, direcciones: readonly string[]): void {
  const pasados: ReadonlyArray<readonly [boolean, LimiteDeCorreos]> = [
    [uso.porHora + 1 > topes.porHoraPorCuenta, 'hora'],
    [uso.porDia + 1 > topes.porDiaPorCuenta, 'dia'],
    [
      direcciones.some((d) => (uso.porDestinatario[d.toLowerCase()] ?? 0) + 1 > topes.porDiaPorDestinatario),
      'destinatario',
    ],
    [uso.deLaInstalacionPorHora + 1 > topes.porHoraDeLaInstalacion, 'instalacion'],
  ];
  const excedido = pasados.find(([paso]) => paso);
  if (excedido) throw new CupoDeCorreosAgotado(excedido[1]);
}
