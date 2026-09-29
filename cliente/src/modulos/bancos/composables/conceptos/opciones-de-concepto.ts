import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { Concepto } from '../../servicios/conceptos.api';

/** Lo que clasifica un concepto: una nota de crédito, una de débito o un cheque (que cuenta como débito). */
export type TipoDeMovimiento = 'credito' | 'debito' | 'cheque';

const direccionDe = (tipo: TipoDeMovimiento): 'credito' | 'debito' => (tipo === 'credito' ? 'credito' : 'debito');

/** Un concepto sirve a todos los tipos si es «ambos» o si coincide con la dirección de cada uno. */
function sirveParaTodos(concepto: Concepto, tipos: readonly TipoDeMovimiento[]): boolean {
  return concepto.aplicaA === 'ambos' || tipos.every((tipo) => direccionDe(tipo) === concepto.aplicaA);
}

const porNombre = (a: Concepto, b: Concepto): number => a.nombre.localeCompare(b.nombre, 'es');

const comoOpcion = (concepto: Concepto): OpcionDeRegistro => ({ valor: concepto.id, texto: concepto.nombre });

/**
 * Los conceptos que se pueden elegir al registrar una nota o un cheque (o, en la bandeja, varios a la vez):
 * activos, propios de la empresa (no de sistema), compatibles con **todos** los tipos dados y por nombre. Si la
 * pantalla ya tenía elegido uno (`actual`) que dejó de cumplir, se conserva para que se vea lo guardado.
 */
export function opcionesDeConcepto(
  conceptos: readonly Concepto[],
  tipos: readonly TipoDeMovimiento[],
  actual: string | null = null,
): OpcionDeRegistro[] {
  const elegibles = conceptos.filter(
    (concepto) =>
      concepto.id === actual || (concepto.activo && !concepto.claveDeSistema && sirveParaTodos(concepto, tipos)),
  );
  return [{ valor: null, texto: 'Elija un concepto' }, ...elegibles.sort(porNombre).map(comoOpcion)];
}

/** La clave del concepto de sistema «Pago a proveedores» (lo fija Cuentas por pagar cuando está activo). */
export const CLAVE_DE_PAGO_A_PROVEEDORES = 'pago_a_proveedor';

/**
 * Las opciones de un cheque emitido a mano: las de siempre y, solo si Cuentas por pagar **no** está activo,
 * también «Pago a proveedores». Con Cuentas por pagar activo el servidor lo rechazaría (422).
 */
export function opcionesDeConceptoDeCheque(
  conceptos: readonly Concepto[],
  cuentasPorPagarActivo: boolean,
): OpcionDeRegistro[] {
  const base = opcionesDeConcepto(conceptos, ['cheque']);
  const pago = conceptos.find((c) => c.claveDeSistema === CLAVE_DE_PAGO_A_PROVEEDORES && c.activo);
  if (cuentasPorPagarActivo || !pago) return base;
  const [primera, ...resto] = base;
  return [primera!, ...[...resto, comoOpcion(pago)].sort((a, b) => a.texto.localeCompare(b.texto, 'es'))];
}

/**
 * Con qué conceptos se puede clasificar lo marcado en la bandeja: si son solo cheques, los de un cheque (que suman
 * «Pago a proveedores» cuando Cuentas por pagar no está activo); si no, los de siempre. Nunca lo adivina el cliente:
 * el servidor valida igual.
 */
export function opcionesParaClasificar(
  conceptos: readonly Concepto[],
  tipos: readonly TipoDeMovimiento[],
  cuentasPorPagarActivo: boolean,
): OpcionDeRegistro[] {
  const soloCheques = tipos.length > 0 && tipos.every((tipo) => tipo === 'cheque');
  return soloCheques
    ? opcionesDeConceptoDeCheque(conceptos, cuentasPorPagarActivo)
    : opcionesDeConcepto(conceptos, tipos);
}

/** Las opciones del filtro del reporte: todos los conceptos (también los de sistema), por nombre, y «Todos». */
export function opcionesDeFiltroDeConcepto(conceptos: readonly Concepto[]): OpcionDeRegistro[] {
  return [{ valor: null, texto: 'Todos' }, ...[...conceptos].sort(porNombre).map(comoOpcion)];
}

/** El concepto elegido si sigue entre las opciones; si ya no sirve (p. ej. cambió el tipo), ninguno. */
export function conceptoVigente(opciones: readonly OpcionDeRegistro[], elegido: string | null): string | null {
  return elegido !== null && opciones.some((opcion) => opcion.valor === elegido) ? elegido : null;
}

/** El concepto de sistema «Sin clasificar», si el catálogo ya lo trae. */
export const conceptoSinClasificar = (conceptos: readonly Concepto[]): Concepto | null =>
  conceptos.find((concepto) => concepto.claveDeSistema === 'sin_clasificar') ?? null;
