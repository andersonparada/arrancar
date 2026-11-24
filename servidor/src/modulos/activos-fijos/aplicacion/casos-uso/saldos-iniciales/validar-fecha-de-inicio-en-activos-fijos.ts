import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ActivosConFechaFueraDeLaCarga } from '../../../dominio/errores-de-saldo-inicial.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';

type Lectura = Pick<DependenciasDeSaldosIniciales, 'unidadDeTrabajo' | 'consultas' | 'saldos'>;

/** Lo que trae el aviso `empresas.fecha_de_inicio_por_cambiar`. */
export interface AvisoDeFechaDeInicio {
  empresaId: string;
  /** La fecha nueva, `AAAA-MM-DD`. */
  fechaDeInicio: string;
}

/**
 * Responde al aviso `empresas.fecha_de_inicio_por_cambiar`, que llega dentro de la transacción de Empresas (§8). Rechaza
 * el cambio si algún saldo inicial tendría adquisición o inicio de uso igual o posterior a la fecha nueva, si algún
 * activo de otro origen quedaría con adquisición anterior a ella, si algún saldo tiene una división vigente (sus tramos
 * no se reubican) o si ya hay un cierre de depreciación. Si no,
 * actualiza el día de corte de los saldos y el mes de arranque de sus tramos (en la misma transacción de Empresas).
 */
export class ValidarFechaDeInicioEnActivosFijos {
  constructor(private readonly dependencias: Lectura) {}

  /** @throws ActivosConFechaFueraDeLaCarga si algún activo o cierre impide el cambio. */
  ejecutar(operador: Operador, aviso: AvisoDeFechaDeInicio): Promise<void> {
    const { unidadDeTrabajo, consultas, saldos } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId: aviso.empresaId }, async () => {
      const conflictos = await consultas.conflictosConLaFechaDeInicio(aviso.fechaDeInicio);
      if (conflictos.hayCierres) throw new ActivosConFechaFueraDeLaCarga('ya hay meses de depreciación cerrados.');
      if (conflictos.saldosConFechaPosterior > 0)
        throw new ActivosConFechaFueraDeLaCarga(
          `${conflictos.saldosConFechaPosterior} saldos iniciales de activos fijos tienen adquisición o inicio de uso desde esa fecha.`,
        );
      if (conflictos.saldosConDivisiones > 0)
        throw new ActivosConFechaFueraDeLaCarga(
          `${conflictos.saldosConDivisiones} saldos iniciales de activos fijos ya se dividieron: anule esas divisiones antes de cambiar la fecha.`,
        );
      if (conflictos.otrosConAdquisicionAnterior > 0)
        throw new ActivosConFechaFueraDeLaCarga(
          `${conflictos.otrosConAdquisicionAnterior} activos fijos tienen adquisición anterior a esa fecha y no son saldo inicial.`,
        );
      await saldos.reubicar(aviso.fechaDeInicio);
    });
  }
}
