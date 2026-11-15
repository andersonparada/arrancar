/** Lo que Terceros sabe del nombre de un proveedor, y el nombre más reciente que la SAT dio al NIT en sus documentos. */
export interface FuenteDelNombreDelNit {
  tipoDePersona: 'individual' | 'juridica';
  razonSocial: string | null;
  nombres: string | null;
  apellidos: string | null;
  /** El `nombre_emisor` del DTE más reciente de los cargos del pago; `null` en un saldo inicial. */
  nombreDelDte: string | null;
}

const limpio = (texto: string | null): string | null => {
  const sinEspacios = texto?.trim().replace(/\s+/g, ' ') ?? '';
  return sinEspacios === '' ? null : sinEspacios;
};

/**
 * El nombre del NIT del proveedor, que es el beneficiario del cheque o de la nota (nunca el nombre comercial): la razón
 * social de una persona jurídica, o los nombres y apellidos de una individual. Si Terceros no lo tiene (deja vacía la
 * razón social cuando hay un nombre comercial), el del DTE más reciente; si tampoco hay, `null`.
 */
export function nombreDelNit(fuente: FuenteDelNombreDelNit): string | null {
  const propio =
    fuente.tipoDePersona === 'juridica'
      ? limpio(fuente.razonSocial)
      : limpio([fuente.nombres, fuente.apellidos].filter(Boolean).join(' '));
  return propio ?? limpio(fuente.nombreDelDte);
}
