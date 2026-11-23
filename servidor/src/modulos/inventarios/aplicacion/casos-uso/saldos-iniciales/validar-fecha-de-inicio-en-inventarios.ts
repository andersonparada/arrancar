import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { InventarioConFechaFueraDeLaCarga } from '../../../dominio/errores-de-saldo-inicial.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';

type Lectura = Pick<DependenciasDeSaldosIniciales, 'unidadDeTrabajo' | 'saldos' | 'cierres'>;

/** Lo que trae el aviso `empresas.fecha_de_inicio_por_cambiar`. */
export interface AvisoDeFechaDeInicio {
  empresaId: string;
  /** La fecha nueva, `AAAA-MM-DD`. */
  fechaDeInicio: string;
}

/**
 * Responde al aviso `empresas.fecha_de_inicio_por_cambiar`, que llega dentro de la transacción de Empresas (§8). Rechaza
 * el cambio si ya hay un cierre de inventario, si algún movimiento que no es de saldo inicial tiene fecha anterior a la
 * nueva o si alguna capa de saldo inicial tendría fecha igual o posterior. Si no, mueve los documentos de saldo inicial
 * al nuevo día anterior (de todas las bodegas, vea o no quien cambia la fecha todas).
 */
export class ValidarFechaDeInicioEnInventarios {
  constructor(private readonly dependencias: Lectura) {}

  /** @throws InventarioConFechaFueraDeLaCarga si un cierre, un movimiento o una capa impiden el cambio. */
  ejecutar(operador: Operador, aviso: AvisoDeFechaDeInicio): Promise<void> {
    const { unidadDeTrabajo, saldos, cierres } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId: aviso.empresaId }, async () => {
      if (await cierres.hayAlguno()) throw new InventarioConFechaFueraDeLaCarga('ya hay meses de inventario cerrados.');
      const conflictos = await saldos.conflictosConLaFechaDeInicio(aviso.fechaDeInicio);
      if (conflictos.movimientosAnteriores > 0) {
        throw new InventarioConFechaFueraDeLaCarga(
          `${conflictos.movimientosAnteriores} movimientos de inventario tienen fecha anterior a la nueva y no son saldo inicial.`,
        );
      }
      if (conflictos.capasPosteriores > 0) {
        throw new InventarioConFechaFueraDeLaCarga(
          `${conflictos.capasPosteriores} saldos iniciales de inventario tienen la fecha de su capa desde esa fecha.`,
        );
      }
      await saldos.reubicar(aviso.fechaDeInicio);
    });
  }
}
