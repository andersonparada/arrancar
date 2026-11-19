import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../core/compartido/aplicacion/reloj.js';
import type { AvisoDeBancos } from '../../core/contratos/bancos.contratos.js';
import { aCentavos } from '../dominio/centavos.js';
import type { ConsultasMovimientos } from './puertos/consultas-movimientos.js';

interface Dependencias {
  consultas: ConsultasMovimientos;
  reloj: Reloj;
}

interface ChequePorEmitir {
  cuentaBancariaId: string;
  fecha: string;
  monto: string;
}

export const CODIGO_DE_POSFECHADO_SIN_FONDOS = 'cheque_posfechado_sin_fondos';

const MENSAJE =
  'El cheque se paga a la vista aunque tenga fecha posterior: si el beneficiario lo presenta hoy, el banco lo paga hoy ' +
  '(Código de Comercio, art. 501), y la cuenta no tiene fondos para cubrirlo. ' +
  'Dar en pago un cheque sin fondos, o retirar los fondos antes de que venza el plazo para cobrarlo, puede ser estafa ' +
  '(Código Penal, art. 268).';

/**
 * Aviso que no bloquea al emitir un cheque con fecha posterior a hoy (CP4, C-CP4-1): saldo de hoy menos los cheques
 * posfechados vigentes de la cuenta menos este; si es negativo, avisa. Va tanto desde Bancos como desde Cuentas por
 * pagar. Se calcula antes de guardar el cheque nuevo.
 */
export class AvisoDeFondosDePosfechados {
  constructor(private readonly dependencias: Dependencias) {}

  async avisos(operador: Operador, { cuentaBancariaId, fecha, monto }: ChequePorEmitir): Promise<AvisoDeBancos[]> {
    const { consultas, reloj } = this.dependencias;
    const hoy = await reloj.hoy(operador);
    if (fecha <= hoy) return [];
    const saldoDeHoy = aCentavos(await consultas.saldoAlFinDe(cuentaBancariaId, hoy));
    const posfechados = aCentavos(await consultas.chequesPosfechados(cuentaBancariaId, hoy));
    const queda = saldoDeHoy - posfechados - aCentavos(monto);
    return queda < 0 ? [{ codigo: CODIGO_DE_POSFECHADO_SIN_FONDOS, mensaje: MENSAJE }] : [];
  }
}
