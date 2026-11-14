import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DocumentoConAplicaciones } from '../../../dominio/documento-por-pagar.js';
import { exigirNotaFueraDeContrasena } from '../../../dominio/nota-en-contrasena.js';
import { noTenerPagosVigentes } from '../../../dominio/reglas-de-baja.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { AplicacionNoSeQuita } from '../../../dominio/errores-de-aplicaciones.js';
import { dtoDeAplicacion } from '../../dto/dto-de-documento-por-pagar.js';
import type { AplicacionConDatos } from '../../puertos/puertos-de-consultas.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import { RECURSO_DE_APLICACIONES, type DependenciasParaQuitar } from './dependencias-de-aplicaciones.js';

/** La nota y el cargo de la aplicación, ya bloqueados. */
export interface ParDeLaAplicacion {
  nota: DocumentoConAplicaciones;
  cargo: DocumentoConAplicaciones;
}

/**
 * Una regla que puede rechazar que se quite una aplicación lanzando su error. Las listas se arman al componer el
 * módulo: las contraseñas (CP3) y los pagos (CP4) sumaron las suyas sin tocar el caso de uso.
 */
export type ReglaParaQuitar = (aplicacion: AplicacionConDatos, par: ParDeLaAplicacion) => void | Promise<void>;

/** La nota de la aplicación no puede estar en una contraseña vigente: su saldo libre ya está repartido. */
export const notaFueraDeContrasena: ReglaParaQuitar = (_aplicacion, { nota }) =>
  exigirNotaFueraDeContrasena(nota.documento, nota.contrasenaVigente);

/** Con pagos vigentes, quitar la aplicación haría que lo pagado pase de lo que se debía (`DocumentoConPagos`). */
export const cargoSinPagosVigentes: ReglaParaQuitar = (_aplicacion, { cargo }) => noTenerPagosVigentes(cargo);

/** Además de que la aplicación sea manual (lo revisa el caso de uso): la nota fuera de contraseña y el cargo sin pagos. */
export const REGLAS_PARA_QUITAR_APLICACION: readonly ReglaParaQuitar[] = [notaFueraDeContrasena, cargoSinPagosVigentes];

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
   * @throws NotaEnContrasena si su nota está en una contraseña vigente.
   * @throws DocumentoConPagos si el cargo tiene pagos vigentes.
   */
  async ejecutar(operador: Operador, { aplicacionId, motivo }: PeticionParaQuitar): Promise<void> {
    const motivoLimpio = motivoValido(motivo);
    const { unidadDeTrabajo, aplicaciones, auditoria } = this.dependencias;
    await unidadDeTrabajo.ejecutar(operador, async () => {
      const { aplicacion, ...par } = await this.bloqueada(aplicacionId);
      if (aplicacion.forma !== 'manual') throw new AplicacionNoSeQuita();
      for (const regla of this.reglas) await regla(aplicacion, par);
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
  private async bloqueada(aplicacionId: string): Promise<ParDeLaAplicacion & { aplicacion: AplicacionConDatos }> {
    const { documentos } = this.dependencias;
    const previa = await this.buscar(aplicacionId);
    const nota = await bloquear(documentos, previa.notaId);
    const cargo = await bloquear(documentos, previa.cargoId);
    return { aplicacion: await this.buscar(aplicacionId), nota, cargo };
  }

  private async buscar(aplicacionId: string): Promise<AplicacionConDatos> {
    const aplicacion = await this.dependencias.consultas.aplicacion(aplicacionId);
    if (!aplicacion) throw new RecursoNoEncontrado('La aplicación');
    return aplicacion;
  }
}
