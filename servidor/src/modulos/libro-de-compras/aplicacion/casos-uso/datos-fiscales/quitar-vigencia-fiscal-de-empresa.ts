import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type {
  AccesoAEmpresas,
  RepositorioDeDatosFiscalesDeEmpresa,
} from '../../puertos/repositorios-de-datos-fiscales.js';
import type { CambiosAlHistorialFiscal } from './cambios-al-historial-fiscal.js';
import { historialParaAuditoria } from './dtos-de-datos-fiscales.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDatosFiscalesDeEmpresa;
  cambios: CambiosAlHistorialFiscal;
  acceso: AccesoAEmpresas;
  auditoria: Auditoria;
}

/** Quita una vigencia del historial fiscal de una empresa (un cambio registrado o programado por error). */
export class QuitarVigenciaFiscalDeEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Su escalón pasa a la vigencia anterior. Queda en la auditoría como `eliminar` con la vigencia quitada y el
   * historial anterior.
   * @throws RecursoNoEncontrado si la empresa o la vigencia no existen o no están al alcance.
   * @throws VigenciaBaseNoSeQuita si es la vigencia «desde el inicio».
   * @throws VigenciaFiscalEnUso si su escalón tiene documentos vigentes que cambiarían de régimen.
   */
  ejecutar(operador: Operador, empresaId: string, vigenciaId: string): Promise<void> {
    const { unidadDeTrabajo, repositorio, cambios, acceso, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId }, async () => {
      await acceso.exigirAcceso(operador, empresaId);
      await repositorio.bloquear(empresaId, 'actualizar');
      const antes = await repositorio.historial(empresaId);
      const quitada = antes.buscar(vigenciaId);
      if (!quitada) throw new RecursoNoEncontrado('La vigencia');
      const despues = antes.quitar(vigenciaId);
      await cambios.exigirSinDocumentosAfectados(empresaId, antes, despues);
      await cambios.escribir(empresaId, antes, despues);
      await auditoria.registrar({
        recurso: 'libro-de-compras.datos-fiscales-de-empresa',
        registroId: empresaId,
        accion: 'eliminar',
        anterior: {
          ...historialParaAuditoria(empresaId, antes),
          quitada: { id: quitada.id, vigenteDesde: quitada.vigenteDesde, ...quitada.datos.instantanea() },
        },
      });
    });
  }
}
