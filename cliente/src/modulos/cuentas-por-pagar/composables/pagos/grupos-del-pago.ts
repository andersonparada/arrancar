import type { CargoParaPagar, ParaPagar } from '../../servicios/tipos-de-pagos';
import { centavosDe, textoDeCentavos } from '../dinero';
import { sirveParaLaForma, type EdicionDePago } from './edicion-de-pago';

/** Los cargos de una contraseña vigente del proveedor, tal como se ven agrupados en el pago. */
export interface GrupoDelPago {
  id: string;
  numero: string;
  fecha: string;
  cargos: CargoParaPagar[];
  /** Lo que el pago entrega dentro de esta contraseña, en centavos. */
  pagando: number;
  /** Lo que se puede pagar de sus cargos (lo disponible, sin lo comprometido), con dos decimales. */
  porPagar: string;
}

const sumar = (cargos: readonly CargoParaPagar[], valor: (cargo: CargoParaPagar) => number): number =>
  cargos.reduce((total, cargo) => total + valor(cargo), 0);

function grupoDe(edicion: EdicionDePago, contrasena: ParaPagar['contrasenas'][number], datos: ParaPagar): GrupoDelPago {
  const cargos = datos.cargos.filter(
    (cargo) => cargo.contrasenaId === contrasena.id && sirveParaLaForma(cargo, edicion.forma),
  );
  return {
    ...contrasena,
    cargos,
    pagando: sumar(cargos, (cargo) => centavosDe(edicion.montos[cargo.id] ?? '') ?? 0),
    porPagar: textoDeCentavos(sumar(cargos, (cargo) => centavosDe(cargo.disponible) ?? 0)),
  };
}

/** Los grupos con algo que pagar con esta forma, en el orden del servidor (la contraseña abierta primero). */
function gruposConCargos(edicion: EdicionDePago, datos: ParaPagar): GrupoDelPago[] {
  return datos.contrasenas
    .map((contrasena) => grupoDe(edicion, contrasena, datos))
    .filter(({ cargos }) => cargos.length > 0);
}

/** Las contraseñas que entran en el pago. */
export function gruposIncluidos(edicion: EdicionDePago, datos: ParaPagar): GrupoDelPago[] {
  return gruposConCargos(edicion, datos).filter(({ id }) => edicion.contrasenasIncluidas.includes(id));
}

/** Las otras contraseñas del proveedor que se pueden sumar al pago («Agregar otra contraseña»). */
export function gruposPorAgregar(edicion: EdicionDePago, datos: ParaPagar): GrupoDelPago[] {
  return gruposConCargos(edicion, datos).filter(({ id }) => !edicion.contrasenasIncluidas.includes(id));
}
