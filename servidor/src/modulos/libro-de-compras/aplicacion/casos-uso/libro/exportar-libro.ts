import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { LibroDeExcel } from '../../../../core/intercambio/aplicacion/puertos/libro-de-excel.js';
import type { AnuladoDelLibro } from '../../../dominio/libro/documento-del-libro.js';
import { armarLibro, periodoDelLibro, type DependenciasParaArmarElLibro, type LibroArmado } from './consultar-libro.js';
import { hojasDelLibro } from './hojas-del-libro.js';

interface Dependencias extends DependenciasParaArmarElLibro {
  unidadDeTrabajo: UnidadDeTrabajo;
  excel: Pick<LibroDeExcel, 'escribirVarias'>;
}

/** El libro del período en un solo Excel de tres hojas: Libro, Resumen y Anulados. */
export class ExportarLibro {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(operador: Operador, periodo: string): Promise<Buffer> {
    const primerDia = periodoDelLibro(periodo);
    const { armado, anulados } = await this.dependencias.unidadDeTrabajo.ejecutar(operador, () =>
      this.leer(operador, primerDia),
    );
    return this.dependencias.excel.escribirVarias(hojasDelLibro(armado, anulados));
  }

  private async leer(
    operador: Operador,
    primerDia: string,
  ): Promise<{ armado: LibroArmado; anulados: AnuladoDelLibro[] }> {
    const armado = await armarLibro(this.dependencias, operador, primerDia);
    const anulados = await this.dependencias.consultas.anuladosDelPeriodo(operador.empresaId, primerDia);
    return { armado, anulados };
  }
}
