/** De qué proveedor y de qué mes (`AAAA-MM`) es la suma pagada que se pidió. */
export interface ClaveDeSuma {
  proveedorId: string;
  mes: string;
}

/** La clave a partir de lo que hay en el formulario: el mes sale de la fecha (`AAAA-MM-DD`). */
export const claveDeSuma = (proveedorId: string, fecha: string): ClaveDeSuma => ({
  proveedorId,
  mes: fecha.slice(0, 7),
});

/**
 * Evita que una respuesta vieja pise a una nueva: cada pedido de suma lleva un número, y al llegar la respuesta solo
 * vale si fue el último pedido y su proveedor y mes siguen siendo los vigentes.
 */
export function crearControlDeSuma() {
  let ultimo = 0;
  return {
    /** Anota un pedido nuevo; los anteriores dejan de valer. */
    nuevo: (): number => ++ultimo,
    /** Si una respuesta del pedido `numero` pedida para `pedida` todavía sirve ante lo `vigente`. */
    sirve: (numero: number, pedida: ClaveDeSuma, vigente: ClaveDeSuma): boolean =>
      numero === ultimo && pedida.proveedorId === vigente.proveedorId && pedida.mes === vigente.mes,
  };
}
