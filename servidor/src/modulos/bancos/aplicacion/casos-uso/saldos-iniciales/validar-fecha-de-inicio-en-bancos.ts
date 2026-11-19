import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { FechaDeInicioConSaldosDeBancos } from '../../../dominio/errores-de-apertura.js';
import type { ConsultasDeSaldosIniciales, SaldoPrincipal } from '../../puertos/consultas-de-saldos-iniciales.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeSaldosIniciales;
}

/** Lo que trae el aviso `empresas.fecha_de_inicio_por_cambiar`. */
export interface AvisoDeFechaDeInicio {
  empresaId: string;
  /** La fecha nueva, `AAAA-MM-DD`. */
  fechaDeInicio: string;
}

/**
 * Responde al aviso `empresas.fecha_de_inicio_por_cambiar`, que llega dentro de la transacción de Empresas. Con saldo
 * del estado de cuenta cargado, mover la fecha cambiaría su significado: se rechaza (P-4). Un saldo global de antes
 * que quedaría con fecha posterior a la fecha nueva también se rechaza; uno de la misma fecha de inicio pasa (el diseño pedía
 * rechazar también el igual, pero los saldos de antes se cargan con la fecha de inicio y es lo que ya hay en uso).
 */
export class ValidarFechaDeInicioEnBancos {
  constructor(private readonly dependencias: Dependencias) {}

  /** Cuántas cuentas tienen su cabecera y un saldo del estado de cuenta de cero (sin movimiento que lo diga). */
  private async cuentasConSaldoEnCero(principales: SaldoPrincipal[]): Promise<number> {
    const conSaldo = new Set(principales.map((saldo) => saldo.cuentaBancariaId));
    const cuentas = await this.dependencias.consultas.cuentas();
    return cuentas.filter((cuenta) => cuenta.cabeceraId !== null && !conSaldo.has(cuenta.cuentaBancariaId)).length;
  }

  /** @throws FechaDeInicioConSaldosDeBancos si algún saldo inicial de Bancos impide el cambio. */
  ejecutar(operador: Operador, aviso: AvisoDeFechaDeInicio): Promise<void> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId: aviso.empresaId }, async () => {
      const principales = await consultas.saldosPrincipales();
      const delBanco = principales.filter((saldo) => saldo.parte === 'saldo_del_banco');
      const enCero = await this.cuentasConSaldoEnCero(principales);
      if (delBanco.length + enCero > 0) {
        const fecha = delBanco[0]?.fecha ?? null;
        throw new FechaDeInicioConSaldosDeBancos({ cantidad: delBanco.length + enCero, fecha, global: false });
      }
      const globales = principales.filter((s) => s.parte === 'saldo_global' && s.fecha > aviso.fechaDeInicio);
      if (globales[0]) {
        throw new FechaDeInicioConSaldosDeBancos({ cantidad: globales.length, fecha: globales[0].fecha, global: true });
      }
    });
  }
}
