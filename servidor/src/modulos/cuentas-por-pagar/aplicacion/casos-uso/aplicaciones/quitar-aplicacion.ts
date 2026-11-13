import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { AplicacionNoSeQuita } from '../../../dominio/errores-de-aplicaciones.js';
import { dtoDeAplicacion } from '../../dto/dto-de-documento-por-pagar.js';
import type { AplicacionConDatos } from '../../puertos/puertos-de-consultas.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import { RECURSO_DE_APLICACIONES, type DependenciasParaQuitar } from './dependencias-de-aplicaciones.js';

/**
 * Una regla que puede rechazar que se quite una aplicación lanzando su error. Las listas se arman al componer el
 * módulo: las contraseñas (CP3) y los pagos (CP4) sumarán las suyas sin tocar el caso de uso.
 */
export type ReglaParaQuitar = (aplicacion: AplicacionConDatos) => void | Promise<void>;

/** Hoy solo cuenta que la aplicación sea manual (lo revisa el caso de uso); CP3 y CP4 sumarán aquí las suyas. */
export const REGLAS_PARA_QUITAR_APLICACION: readonly ReglaParaQuitar[] = [];

export interface PeticionParaQuitar {
  aplicacionId: string;
  motivo: string;
}

/**
 * Quita una aplicación hecha a mano: el monto vuelve al saldo libre de la nota y al saldo del cargo. Bloquea la nota y
 * luego el cargo (el mismo orden que al aplicar) y audita `quitar` con la aplicación como estaba y el motivo, en la
 * misma transacción.
 */
export class QuitarAplicacion {
  constructor(
    private readonly dependencias: DependenciasParaQuitar,
    private readonly reglas: readonly ReglaParaQuitar[] = REGLAS_PARA_QUITAR_APLICACION,
  ) {}

  /**
   * @throws MotivoInvalido si falta el motivo o pasa de 300 caracteres.
   * @throws RecursoNoEncontrado si la aplicación no existe.
   * @throws AplicacionNoSeQuita si es automática o de una contraseña.
   */
  async ejecutar(operador: Operador, { aplicacionId, motivo }: PeticionParaQuitar): Promise<void> {
    const motivoLimpio = motivoValido(motivo);
    const { unidadDeTrabajo, aplicaciones, auditoria } = this.dependencias;
    await unidadDeTrabajo.ejecutar(operador, async () => {
      const aplicacion = await this.bloqueada(aplicacionId);
      if (aplicacion.forma !== 'manual') throw new AplicacionNoSeQuita();
      for (const regla of this.reglas) await regla(aplicacion);
      await auditoria.registrar({
        recurso: RECURSO_DE_APLICACIONES,
        registroId: aplicacionId,
        accion: 'quitar',
        anterior: dtoDeAplicacion(aplicacion),
        motivo: motivoLimpio,
      });
      await aplicaciones.borrar(aplicacionId);
    });
  }

  /** La aplicación con la nota y el cargo bloqueados; se vuelve a leer ya bloqueada por si otra petición la quitó. */
  private async bloqueada(aplicacionId: string): Promise<AplicacionConDatos> {
    const { documentos } = this.dependencias;
    const previa = await this.buscar(aplicacionId);
    await bloquear(documentos, previa.notaId);
    await bloquear(documentos, previa.cargoId);
    return this.buscar(aplicacionId);
  }

  private async buscar(aplicacionId: string): Promise<AplicacionConDatos> {
    const aplicacion = await this.dependencias.consultas.aplicacion(aplicacionId);
    if (!aplicacion) throw new RecursoNoEncontrado('La aplicación');
    return aplicacion;
  }
}
