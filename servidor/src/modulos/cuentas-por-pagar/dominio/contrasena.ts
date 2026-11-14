/** El estado de una contraseña; «pagada» y «pagada en parte» no son estados: salen de los pagos. */
export type EstadoDeContrasena = 'vigente' | 'anulada';

/** Cuántos documentos lleva una contraseña, como máximo. */
export const MAXIMO_DE_DOCUMENTOS_EN_CONTRASENA = 100;

export const MAXIMO_DE_OBSERVACIONES = 500;

/** Clave del correlativo de las contraseñas en `core.correlativos`. */
export const CLAVE_DE_CONTRASENAS = 'cuentas-por-pagar.contrasenas';

/** El número como se lee en el papel: `15`, o `2026-15` si la empresa reinicia sus correlativos cada año. */
export function numeroDeContrasena(numero: number, anioDeNumero: number): string {
  return anioDeNumero > 0 ? `${anioDeNumero}-${numero}` : String(numero);
}

/**
 * La fecha de pago que se propone: la mayor fecha de vencimiento de los cargos o, si es anterior a la fecha de la
 * contraseña (o ninguno vence todavía), la fecha de la contraseña. No cambia el vencimiento de nadie.
 */
export function proponerFechaDePago(vencimientos: ReadonlyArray<string | null>, fecha: string): string {
  return vencimientos.reduce<string>(
    (mayor, vencimiento) => (vencimiento !== null && vencimiento > mayor ? vencimiento : mayor),
    fecha,
  );
}
