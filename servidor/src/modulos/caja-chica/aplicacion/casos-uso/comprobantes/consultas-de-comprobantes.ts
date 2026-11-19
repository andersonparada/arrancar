import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ComprobanteDeLaBandejaDto, ListaDeComprobantesDto } from '../../dto/comprobantes.dto.js';
import type { FiltroDeBandeja, FiltroDeComprobantes } from '../../puertos/puertos-de-comprobantes.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { comprobanteDto, totalesDe } from './armado-del-comprobante.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';

/** El filtro de la bandeja y si quien consulta tiene el permiso de asignar facturas con retención. */
export type PeticionDeBandeja = FiltroDeBandeja & { puedeAsignarConRetencion: boolean };

/**
 * La bandeja: los documentos que llegaron a Caja chica y esperan fondo (`fondos.ver`; no depende del alcance de un
 * fondo). Cada fila dice si el usuario puede asignarla aunque lleve retención.
 */
export class ListarBandeja {
  constructor(private readonly dependencias: Pick<DependenciasDeComprobantes, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, { puedeAsignarConRetencion, ...filtro }: PeticionDeBandeja) {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async (): Promise<ComprobanteDeLaBandejaDto[]> => {
      const filas = await consultas.bandeja(filtro);
      return filas.map((fila) => ({ ...comprobanteDto(fila), puedeAsignarConRetencion }));
    });
  }
}

/** Los comprobantes de un fondo que el usuario ve (`fondos.ver`), pendientes por omisión, con lo pendiente y lo repuesto. */
export class ListarComprobantesDelFondo {
  private readonly lector: LectorDelFondo;

  constructor(
    private readonly dependencias: Pick<
      DependenciasDeComprobantes,
      'unidadDeTrabajo' | 'consultas' | 'fondos' | 'consultasDeFondos'
    >,
  ) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
  }

  /** @throws RecursoNoEncontrado si el fondo no existe o el usuario no lo tiene asignado. */
  ejecutar(operador: Operador, filtro: FiltroDeComprobantes): Promise<ListaDeComprobantesDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      await this.lector.buscar(filtro.fondoId);
      const filas = await this.dependencias.consultas.delFondo(filtro);
      return { elementos: filas.map(comprobanteDto), totales: totalesDe(filas) };
    });
  }
}
