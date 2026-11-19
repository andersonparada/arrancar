import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FondoDto, PaginaDeFondosDto } from '../../dto/fondos.dto.js';
import type { FiltroDeFondos } from '../../puertos/puertos-de-fondos.js';
import { resumenDelFondo } from './armado-del-fondo.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { LectorDelFondo } from './lector-del-fondo.js';

/** La lista de los fondos que ve el usuario (`fondos.ver`), con sus cifras; por omisión los abiertos. */
export class ListarFondos {
  constructor(private readonly dependencias: Pick<DependenciasDeFondos, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, filtro: FiltroDeFondos): Promise<PaginaDeFondosDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { filas, total } = await consultas.listar(filtro);
      const lecturas = await consultas.datosDeLectura(filas.map(({ id }) => id));
      const elementos = filas.flatMap((fondo) => {
        const lectura = lecturas.get(fondo.id);
        return lectura ? [resumenDelFondo(fondo, lectura)] : [];
      });
      return { elementos, total };
    });
  }
}

/** La ficha de un fondo con su historial de custodios y de cambios de monto (`fondos.ver`). */
export class ObtenerFondo {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: Pick<DependenciasDeFondos, 'unidadDeTrabajo' | 'fondos' | 'consultas'>) {
    this.lector = new LectorDelFondo(dependencias);
  }

  /** @throws RecursoNoEncontrado si no existe o el usuario no lo tiene asignado. */
  ejecutar(operador: Operador, fondoId: string): Promise<FondoDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () =>
      this.lector.leer(await this.lector.buscar(fondoId)),
    );
  }
}
