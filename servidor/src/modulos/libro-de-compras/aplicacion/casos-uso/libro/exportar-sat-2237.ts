import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LibroDeExcel } from '../../../../core/intercambio/aplicacion/puertos/libro-de-excel.js';
import { Sat2237NoAplica } from '../../../dominio/libro/errores-del-sat-2237.js';
import { periodoDelLibro } from './consultar-libro.js';
import { armarSat2237, type DependenciasDelSat2237 } from './consultar-sat-2237.js';
import { hojasDelSat2237 } from './hojas-del-sat-2237.js';

interface Dependencias extends DependenciasDelSat2237 {
  excel: Pick<LibroDeExcel, 'escribirVarias'>;
}

/** Los datos del SAT-2237 en un Excel de tres hojas: Rubros, Operaciones y Proveedores. */
export class ExportarSat2237 {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(operador: Operador, periodo: string): Promise<Buffer> {
    const armado = await this.dependencias.unidadDeTrabajo.ejecutar(operador, () =>
      armarSat2237(this.dependencias, operador, periodoDelLibro(periodo)),
    );
    if (!armado.datos) throw new Sat2237NoAplica(armado.forma.mensaje);
    return this.dependencias.excel.escribirVarias(hojasDelSat2237(armado.datos));
  }
}
