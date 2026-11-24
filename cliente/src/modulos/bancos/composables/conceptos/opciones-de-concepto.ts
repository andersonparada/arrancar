import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { Concepto } from '../../servicios/conceptos.api';

/** Lo que clasifica un concepto: una nota de crédito, una de débito o un cheque (que cuenta como débito). */
export type TipoDeMovimiento = 'credito' | 'debito' | 'cheque';

const direccionDe = (tipo: TipoDeMovimiento): 'credito' | 'debito' => (tipo === 'credito' ? 'credito' : 'debito');

/** Un concepto sirve a todos los tipos si es «ambos» o si coincide con la dirección de cada uno. */
function sirveParaTodos(concepto: Concepto, tipos: readonly TipoDeMovimiento[]): boolean {
  return concepto.aplicaA === 'ambos' || tipos.every((tipo) => direccionDe(tipo) === concepto.aplicaA);
}

/**
 * Concepto de sistema de Caja chica, Cuentas por liquidar o Cuentas por cobrar → su módulo (como `CONCEPTOS_RESERVADOS_POR_MODULO` del
 * servidor). «Pago a proveedores» no está aquí: solo lo eligen los cheques (`opcionesDeConceptoDeCheque`).
 */
const MODULO_DE_CONCEPTO_RESERVADO: Readonly<Record<string, string>> = {
  fondo_de_caja_chica: 'caja-chica',
  devolucion_de_fondo_de_caja_chica: 'caja-chica',
  reintegro_de_caja_chica: 'caja-chica',
  reintegro_de_caja_chica_de_activo: 'caja-chica',
  anticipo_por_liquidar: 'cuentas-por-liquidar',
  gasto_de_anticipo: 'cuentas-por-liquidar',
  gasto_de_anticipo_de_activo: 'cuentas-por-liquidar',
  anticipo_no_liquidado: 'cuentas-por-liquidar',
  devolucion_de_anticipo: 'cuentas-por-liquidar',
  // «Cobros a clientes» no está: marca la nota y solo se pone al marcarla (como «Pago a proveedores»).
  cobro_a_cliente_de_activo: 'cuentas-por-cobrar',
  devolucion_a_cliente: 'cuentas-por-cobrar',
  cheque_rechazado: 'cuentas-por-cobrar',
};

/**
 * Los conceptos reservados por un módulo que **no** está activo se vuelven elegibles a mano (el servidor los acepta
 * igual): se les quita la clave de sistema para que las opciones no los descarten. Con el módulo activo siguen
 * ocultos, porque ese módulo los registra.
 */
export function liberarReservados(
  conceptos: readonly Concepto[],
  moduloActivo: (modulo: string) => boolean,
): Concepto[] {
  return conceptos.map((concepto) => {
    const modulo = concepto.claveDeSistema ? MODULO_DE_CONCEPTO_RESERVADO[concepto.claveDeSistema] : undefined;
    return modulo !== undefined && !moduloActivo(modulo) ? { ...concepto, claveDeSistema: null } : concepto;
  });
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

/**
 * Las opciones de siempre, pero el concepto guardado cuenta como elegible (aunque hoy esté inactivo) mientras siga
 * siendo compatible con los tipos: sirve para decidir si al cambiar de tipo se conserva o se limpia.
 */
export function opcionesCompatiblesConElGuardado(
  conceptos: readonly Concepto[],
  tipos: readonly TipoDeMovimiento[],
  guardado: string | null,
): OpcionDeRegistro[] {
  const revivido = conceptos.map((c) => (c.id === guardado ? { ...c, activo: true, claveDeSistema: null } : c));
  return opcionesDeConcepto(revivido, tipos);
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
