import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ValeProvisionalDto, ValeProvisionalResumenDto } from '../../dto/vales-provisionales.dto.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import type { DependenciasDeVales } from './dependencias-de-vales.js';
import { LectorDeVales } from './lector-de-vales.js';

/** Los vales provisionales de un fondo (`fondos.ver`), el más reciente primero, con el aviso de vale viejo. */
export class ListarVales {
  private readonly lectorDelFondo: LectorDelFondo;
  private readonly lector: LectorDeVales;

  constructor(private readonly dependencias: DependenciasDeVales) {
    this.lectorDelFondo = new LectorDelFondo({
      fondos: dependencias.fondos,
      consultas: dependencias.consultasDeFondos,
    });
    this.lector = new LectorDeVales(dependencias);
  }

  /** @throws RecursoNoEncontrado si el fondo no existe o el usuario no lo tiene asignado. */
  ejecutar(operador: Operador, fondoId: string): Promise<ValeProvisionalResumenDto[]> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      await this.lectorDelFondo.buscar(fondoId);
      return this.lector.resumir(operador, await this.dependencias.consultasDeVales.delFondo(fondoId));
    });
  }
}

/** Un vale completo, con sus comprobantes, para imprimir y liquidar (`fondos.ver`). */
export class ObtenerVale {
  private readonly lector: LectorDeVales;

  constructor(private readonly dependencias: DependenciasDeVales) {
    this.lector = new LectorDeVales(dependencias);
  }

  /** @throws RecursoNoEncontrado si no existe o su fondo no está asignado al usuario. */
  ejecutar(operador: Operador, valeId: string): Promise<ValeProvisionalDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () =>
      this.lector.leer(operador, await this.lector.buscar(valeId)),
    );
  }
}
