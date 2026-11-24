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
 * nueva o si alguna capa propia de saldo inicial tendría fecha igual o posterior al nuevo día anterior (se confundiría con la capa que se mueve con el documento). Si no, mueve los documentos de saldo inicial
 * al nuevo día anterior (de todas las bodegas, vea o no quien cambia la fecha todas).
 */
export class ValidarFechaDeInicioEnInventarios {
  constructor(private readonly dependencias: Lectura) {}

  /** @throws InventarioConFechaFueraDeLaCarga si un cierre, un movimiento o una capa impiden el cambio. */
  ejecutar(operador: Operador, aviso: AvisoDeFechaDeInicio): Promise<void> {
    const { unidadDeTrabajo, saldos, cierres } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId: aviso.empresaId }, async () => {
      if (await cierres.hayAlgunoSinCandado())
        throw new InventarioConFechaFueraDeLaCarga('ya hay meses de inventario cerrados.');
      const conflictos = await saldos.conflictosConLaFechaDeInicio(aviso.fechaDeInicio);
      if (conflictos.movimientosAnteriores > 0) {
        throw new InventarioConFechaFueraDeLaCarga(
          `${conflictos.movimientosAnteriores} movimientos de inventario tienen fecha anterior a la nueva y no son saldo inicial.`,
        );
      }
      if (conflictos.capasPosteriores > 0) {
        throw new InventarioConFechaFueraDeLaCarga(
          `${conflictos.capasPosteriores} saldos iniciales de inventario tienen una fecha de capa propia igual o posterior al día anterior a esa fecha; quedaría confundida con la capa sin fecha propia. Corrija la fecha de capa de esos renglones.`,
        );
      }
      if (conflictos.llavesQueSeJuntarian > 0) {
        throw new InventarioConFechaFueraDeLaCarga(
          `${conflictos.llavesQueSeJuntarian} artículos con varios saldos iniciales en la misma bodega y lote quedarían con la misma fecha de capa. Corrija la fecha de capa de esos renglones o elimine los repetidos.`,
        );
      }
      await saldos.reubicar(aviso.fechaDeInicio);
    });
  }
}
