import type { HistorialFiscalDeEmpresa } from '../../../dominio/historial-fiscal-de-empresa.js';
import { primerPeriodoEnRangos } from '../../../dominio/historial-fiscal-de-empresa.js';
import { VigenciaFiscalEnPeriodoDeclarado } from '../../errores-de-periodos.js';
import { VigenciaFiscalEnUso } from '../../errores.js';
import type { ControlDePeriodos } from '../../puertos/puertos-de-periodos.js';
import type {
  ConsultaDePeriodosConDocumentos,
  RepositorioDeDatosFiscalesDeEmpresa,
} from '../../puertos/repositorios-de-datos-fiscales.js';

interface Dependencias {
  repositorio: RepositorioDeDatosFiscalesDeEmpresa;
  documentos: ConsultaDePeriodosConDocumentos;
  control: ControlDePeriodos;
}

/** Lo que tienen en común guardar y quitar vigencias: no tocar lo que usan documentos, y escribir las diferencias. */
export class CambiosAlHistorialFiscal {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Una vigencia usada no cambia: si en los períodos donde cambia alguno de los cuatro datos fiscales hay
   * documentos vigentes, no se deja; tampoco si alguno está declarado con el bloqueo encendido (aunque no tenga
   * documentos: cambiaría el tipo de libro).
   * @throws VigenciaFiscalEnPeriodoDeclarado con el primer período declarado y bloqueado.
   * @throws VigenciaFiscalEnUso con el primer período con documentos.
   */
  async exigirSinDocumentosAfectados(
    empresaId: string,
    antes: HistorialFiscalDeEmpresa,
    despues: HistorialFiscalDeEmpresa,
  ): Promise<void> {
    const rangos = antes.rangosAfectados(despues);
    if (rangos.length === 0) return;
    const declarado = primerPeriodoEnRangos(await this.dependencias.control.bloqueados(), rangos);
    if (declarado) throw new VigenciaFiscalEnPeriodoDeclarado(declarado);
    const periodos = await this.dependencias.documentos.periodosConDocumentosVigentes(empresaId);
    const afectado = primerPeriodoEnRangos(periodos, rangos);
    if (afectado) throw new VigenciaFiscalEnUso(afectado);
  }

  /** Lleva lo guardado de `antes` a `despues`: primero lo que sobra, luego lo que cambió y al final lo nuevo. */
  async escribir(empresaId: string, antes: HistorialFiscalDeEmpresa, despues: HistorialFiscalDeEmpresa): Promise<void> {
    const { repositorio } = this.dependencias;
    const { eliminar, actualizar, insertar } = antes.diferenciasCon(despues);
    for (const id of eliminar) await repositorio.eliminar(id);
    for (const vigencia of actualizar) await repositorio.actualizar(vigencia);
    for (const vigencia of insertar) await repositorio.insertar(empresaId, vigencia);
  }
}
