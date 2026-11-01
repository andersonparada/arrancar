import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CondicionesDeProveedor, SaldoDelProveedor } from '../servicios/tipos';

/** Lo que vale para un proveedor que nunca guardó sus condiciones. */
export const condicionesPorOmision = (): CondicionesDeProveedor => ({
  diasDeCredito: null,
  contarDesdeLaRecepcion: false,
});

/** Lo que se escribió en el campo de días: vacío es el plazo por omisión; lo demás lo valida el servidor. */
export function diasDesdeTexto(texto: string | number | null): number | null {
  if (texto === null || texto === '') return null;
  return Number(texto);
}

export const textoDeDias = (dias: number | null): string => (dias === null ? '' : String(dias));

/** El plazo como lo lee una persona: «30 días desde la emisión», «De contado» o «Un mes (por omisión)». */
export function textoDelPlazo({ diasDeCredito, contarDesdeLaRecepcion }: CondicionesDeProveedor): string {
  const desde = contarDesdeLaRecepcion ? 'la recepción' : 'la emisión';
  if (diasDeCredito === null) return `Un mes desde ${desde} (plazo por omisión)`;
  if (diasDeCredito === 0) return 'De contado';
  return `${diasDeCredito} ${diasDeCredito === 1 ? 'día' : 'días'} desde ${desde}`;
}

const hayMonto = (monto: string): boolean => Number(monto) > 0;

/** Los datos de la ficha del proveedor: el plazo y, si se puede ver, lo que se le debe con la empresa activa. */
export function detallesDeCondiciones(
  condiciones: CondicionesDeProveedor,
  saldo: SaldoDelProveedor | null,
): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [{ etiqueta: 'Plazo de pago', valor: textoDelPlazo(condiciones) }];
  if (!saldo) return detalles;
  detalles.push({ etiqueta: 'Por pagar', valor: formatearMonto(saldo.porPagar) });
  detalles.push({ etiqueta: 'Vencido', valor: formatearMonto(saldo.vencido) });
  if (hayMonto(saldo.saldosDeudores)) {
    detalles.push({
      etiqueta: 'A favor de la empresa (notas de crédito)',
      valor: formatearMonto(saldo.saldosDeudores),
    });
  }
  return detalles;
}
