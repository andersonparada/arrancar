import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { FechaDeInicioConSaldosDeBancos } from '../../../dominio/errores-de-apertura.js';
import type { ConsultasDeSaldosIniciales } from '../../puertos/consultas-de-saldos-iniciales.js';

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

  /** @throws FechaDeInicioConSaldosDeBancos si algún saldo inicial de Bancos impide el cambio. */
  ejecutar(operador: Operador, aviso: AvisoDeFechaDeInicio): Promise<void> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId: aviso.empresaId }, async () => {
      const principales = await consultas.saldosPrincipales();
      const delBanco = principales.filter((saldo) => saldo.parte === 'saldo_del_banco');
      if (delBanco[0]) {
        throw new FechaDeInicioConSaldosDeBancos({
          cantidad: delBanco.length,
          fecha: delBanco[0].fecha,
          global: false,
        });
      }
      const globales = principales.filter((s) => s.parte === 'saldo_global' && s.fecha > aviso.fechaDeInicio);
      if (globales[0]) {
        throw new FechaDeInicioConSaldosDeBancos({ cantidad: globales.length, fecha: globales[0].fecha, global: true });
      }
    });
  }
}
