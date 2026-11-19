import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { ReposicionDto, ReposicionResumenDto, SolicitudDeReposicionDto } from '../../dto/reposiciones.dto.js';
import { comprobanteDto } from '../comprobantes/armado-del-comprobante.js';
import { custodioVigente, LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { desgloseDe, desgloseDto, firmadosDe, resumenDeLaReposicion, totalDe } from './armado-de-la-reposicion.js';
import type { DependenciasDeReposiciones } from './dependencias-de-reposiciones.js';
import { LectorDeReposiciones } from './lector-de-reposiciones.js';

type Dependencias = Pick<
  DependenciasDeReposiciones,
  'unidadDeTrabajo' | 'fondos' | 'consultasDeFondos' | 'reposiciones' | 'consultas'
>;

/** Las reposiciones de un fondo (`fondos.ver`), la más reciente primero. */
export class ListarReposiciones {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
  }

  /** @throws RecursoNoEncontrado si el fondo no existe o el usuario no lo tiene asignado. */
  ejecutar(operador: Operador, fondoId: string): Promise<ReposicionResumenDto[]> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      await this.lector.buscar(fondoId);
      return (await this.dependencias.consultas.delFondo(fondoId)).map(resumenDeLaReposicion);
    });
  }
}

/** Una reposición con sus líneas y su desglose, para la ficha y la impresión (`fondos.ver`). */
export class ObtenerReposicion {
  private readonly lector: LectorDeReposiciones;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDeReposiciones(dependencias);
  }

  /** @throws RecursoNoEncontrado si no existe o su fondo no está asignado al usuario. */
  ejecutar(operador: Operador, reposicionId: string): Promise<ReposicionDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () =>
      this.lector.leer(await this.lector.buscar(reposicionId)),
    );
  }
}

/**
 * La solicitud de reposición (`fondos.ver`): lo pendiente del fondo con cómo se repartiría en Bancos, para presentarla a
 * quien revisa y autoriza antes de reponer.
 */
export class SolicitarReposicion {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
  }

  /** @throws RecursoNoEncontrado si el fondo no existe o el usuario no lo tiene asignado. */
  ejecutar(operador: Operador, fondoId: string): Promise<SolicitudDeReposicionDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const fondo = await this.lector.buscar(fondoId);
      const firmados = firmadosDe(await this.dependencias.consultas.pendientesDelFondo(fondoId));
      const vigente = custodioVigente(await this.dependencias.fondos.custodios(fondoId));
      return {
        fondoId,
        fondoNombre: fondo.nombre,
        custodio: vigente?.custodio ?? null,
        pendientes: firmados.map(({ comprobante }) => comprobanteDto(comprobante)),
        total: deCentavos(totalDe(firmados)),
        desglose: desgloseDto(desgloseDe(firmados)),
      };
    });
  }
}
