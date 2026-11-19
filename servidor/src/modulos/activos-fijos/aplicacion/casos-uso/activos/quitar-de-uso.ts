import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ActivoConLibrosUsados } from '../../../dominio/errores-de-depreciacion.js';
import { ActivoDeSaldoInicial } from '../../../dominio/errores-de-saldo-inicial.js';
import type { ActivoFichaDto } from '../../dto/activo.dto.js';
import type { DependenciasDeUso } from './dependencias-de-uso.js';

export class QuitarDeUso {
  constructor(private readonly dependencias: DependenciasDeUso) {}

  /**
   * Deshace «poner en uso»: el activo vuelve a construcción y se borran sus tramos. Queda en la auditoría como
   * `devolver`, con la ficha como estaba (con sus tramos).
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws ActivoDeSaldoInicial si viene de un saldo inicial (sus libros se corrigen en Saldos iniciales).
   * @throws ActivoSinLibros si no es un activo del balance en uso.
   * @throws ActivoConLibrosUsados si un cierre mensual ya usó sus tramos.
   */
  ejecutar(operador: Operador, activoId: string): Promise<ActivoFichaDto> {
    const { unidadDeTrabajo, repositorio, consultas, tramos, cierres, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await cierres.bloquear('compartido');
      const [activo] = await repositorio.buscarBloqueando([activoId]);
      if (!activo) throw new RecursoNoEncontrado('El activo');
      if (activo.instantanea().origen === 'saldo_inicial') throw new ActivoDeSaldoInicial();
      const anterior = await consultas.obtener(activoId);
      if (await cierres.usaronTramosDelActivo(activoId)) throw new ActivoConLibrosUsados();
      activo.quitarDeUso();
      await tramos.eliminarDeActivo(activoId);
      await repositorio.guardar(activo);
      await auditoria.registrar({
        recurso: 'activos-fijos.activos',
        registroId: activoId,
        accion: 'devolver',
        anterior,
      });
      return consultas.obtener(activoId);
    });
  }
}
