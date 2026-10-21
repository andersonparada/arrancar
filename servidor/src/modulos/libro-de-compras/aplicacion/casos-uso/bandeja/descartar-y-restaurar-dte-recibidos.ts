import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { DteRecibido } from '../../../dominio/dte-recibido.js';
import { DteNoEstaDescartado } from '../../../dominio/errores-de-bandeja.js';
import type { DteRecibidoDto } from '../../dto/dte-recibido.dto.js';
import type { AutorizacionesRegistradasFuera } from '../../puertos/puertos-de-la-bandeja.js';
import type { RepositorioDeDteRecibidos } from '../../puertos/repositorio-de-dte-recibidos.js';
import { dtoDeDteRecibido } from './dto-de-dte-recibido.js';

const RECURSO = 'libro-de-compras.dte-recibidos';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  filas: RepositorioDeDteRecibidos;
  autorizaciones: AutorizacionesRegistradasFuera;
  auditoria: Auditoria;
}

async function filaBloqueada(filas: RepositorioDeDteRecibidos, id: string): Promise<DteRecibido> {
  const fila = await filas.bloquear(Identificador.desde<'DteRecibido'>(id));
  if (!fila) throw new RecursoNoEncontrado('El DTE recibido');
  return fila;
}

export interface PeticionDeDescarte {
  ids: readonly string[];
  motivo: string;
}

/**
 * Aparta filas de la bandeja sin registrarlas (no son de la empresa, ya se registraron por otro lado...). Solo las
 * pendientes o bloqueadas; cada una queda auditada (`descartar`, con su motivo y cómo estaba) en la misma transacción.
 * Todas las filas se descartan o ninguna.
 */
export class DescartarDteRecibidos {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si una fila no existe.
   * @throws MotivoDeDescarteInvalido si el motivo está vacío o pasa de 300 caracteres.
   * @throws TransicionDeDteInvalida si una fila ya está registrada o descartada.
   */
  ejecutar(operador: Operador, peticion: PeticionDeDescarte): Promise<DteRecibidoDto[]> {
    const { unidadDeTrabajo, filas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const descartadas: DteRecibidoDto[] = [];
      for (const id of new Set(peticion.ids)) {
        const fila = await filaBloqueada(filas, id);
        const anterior = dtoDeDteRecibido(fila);
        fila.descartar({ motivo: peticion.motivo, por: operador.usuarioId, en: new Date() });
        await filas.guardar(fila);
        await auditoria.registrar({
          recurso: RECURSO,
          registroId: id,
          accion: 'descartar',
          anterior,
          motivo: peticion.motivo,
        });
        descartadas.push(dtoDeDteRecibido(fila));
      }
      return descartadas;
    });
  }
}

/**
 * Devuelve una fila descartada a `pendiente` (o a `bloqueado` si su DTE sigue registrado en otra empresa de la cuenta) y
 * lo deja auditado (`reactivar`, con cómo estaba).
 */
export class RestaurarDteRecibido {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si no existe; DteNoEstaDescartado si la fila no está descartada. */
  ejecutar(operador: Operador, id: string): Promise<DteRecibidoDto> {
    const { unidadDeTrabajo, filas, autorizaciones, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const fila = await filaBloqueada(filas, id);
      if (fila.estado !== 'descartado') throw new DteNoEstaDescartado();
      const anterior = dtoDeDteRecibido(fila);
      fila.devolverAPendiente();
      if (await autorizaciones.estaRegistrada(fila.instantanea().autorizacionFel)) {
        fila.bloquear('registrado_en_otra_empresa');
      }
      await filas.guardar(fila);
      await auditoria.registrar({ recurso: RECURSO, registroId: id, accion: 'reactivar', anterior });
      return dtoDeDteRecibido(fila);
    });
  }
}
