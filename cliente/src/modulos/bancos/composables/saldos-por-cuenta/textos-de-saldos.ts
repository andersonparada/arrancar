import type { CategoriaEnTransito, SaldoDeCuenta } from '../../servicios/saldos-por-cuenta.api';
import { textoDeMes } from '../comunes/mes-de-conciliacion';

export const TEXTO_FONDOS_INSUFICIENTES = 'Fondos insuficientes para los posfechados';

export const ETIQUETA_DE_CATEGORIA: Record<CategoriaEnTransito, string> = {
  cheque_en_circulacion: 'Cheque en circulación',
  deposito_en_transito: 'Depósito en tránsito',
  debito_en_transito: 'Débito en tránsito',
  error_del_banco: 'Error del banco',
};

/** Qué decir de la última conciliación de una cuenta, y si hay que llamar la atención. */
export function estadoDeConciliacion(cuenta: Pick<SaldoDeCuenta, 'ultimaConciliacion' | 'atrasada'>): {
  texto: string;
  atrasada: boolean;
} {
  const mes = textoDeMes(cuenta.ultimaConciliacion);
  return { texto: mes ? `Conciliada hasta ${mes}` : 'Sin conciliar', atrasada: cuenta.atrasada };
}

/** Banco y número, para identificar la cuenta bajo su nombre. */
export const detalleDeCuenta = (cuenta: Pick<SaldoDeCuenta, 'bancoNombre' | 'numero'>): string =>
  [cuenta.bancoNombre, cuenta.numero].filter(Boolean).join(' · ');
