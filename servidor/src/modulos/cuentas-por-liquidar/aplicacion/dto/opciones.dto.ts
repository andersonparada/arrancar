import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { MediosDePago } from '../../../core/contratos/bancos.contratos.js';

export interface ChequeraParaElegirDto {
  chequeraId: string;
  serie: string | null;
  siguienteChequeId: string | null;
  siguienteNumero: number | null;
}

/** Una cuenta activa con su saldo (texto con dos decimales) y sus chequeras activas. */
export interface CuentaParaElegirDto {
  cuentaBancariaId: string;
  nombre: string;
  bancoNombre: string | null;
  numero: string;
  saldo: string;
  chequeras: ChequeraParaElegirDto[];
}

export interface MediosParaElegirDto {
  cuentas: CuentaParaElegirDto[];
}

/** Los medios de Bancos con el saldo como texto (el dinero nunca viaja como número). */
export function dtoDeMedios({ cuentas }: MediosDePago): MediosParaElegirDto {
  return {
    cuentas: cuentas.map(({ saldoCentavos, ...cuenta }) => ({ ...cuenta, saldo: deCentavos(saldoCentavos) })),
  };
}
