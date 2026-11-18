/**
 * Un monto como lo muestra la pantalla, para los mensajes del servidor: `12270.5` → «Q 12,270.50» y
 * `-16010` → «-Q 16,010.00» (con separador de miles, dos decimales y un espacio tras la Q).
 */
export function montoLegible(monto: string | number): string {
  const valor = Number(monto);
  const texto = Math.abs(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${valor < 0 ? '-' : ''}Q ${texto}`;
}
