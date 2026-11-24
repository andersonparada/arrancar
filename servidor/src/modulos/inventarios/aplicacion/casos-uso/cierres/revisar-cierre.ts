import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CierreSinAlcanceTotal } from '../../../dominio/errores-de-cierre.js';
import type { RevisionDelCierreDto } from '../../dto/cierre.dto.js';
import type { VistaDelKardex } from '../../dto/documento.dto.js';
import { ArmadorDelCierre } from './armador-del-cierre.js';
import type { DependenciasDeCierres } from './dependencias-de-cierres.js';
import { revisionADto } from './dtos-de-cierre.js';

/** Cerrar, reabrir y revisar un mes exigen ver todas las bodegas: la foto es de toda la empresa. */
export function exigirAlcanceTotal(vista: Pick<VistaDelKardex, 'veTodasLasBodegas'>): void {
  if (!vista.veTodasLasBodegas) throw new CierreSinAlcanceTotal();
}

export class RevisarCierre {
  private readonly armador: ArmadorDelCierre;

  constructor(private readonly dependencias: DependenciasDeCierres) {
    this.armador = new ArmadorDelCierre(dependencias);
  }

  /**
   * Lo que se ve antes de cerrar un mes: los hallazgos (avisos y bloqueos, también los de los demás módulos), las
   * cifras que quedarían y una huella para saber si algo cambió entre revisar y cerrar. No guarda nada. Un mes que no
   * es el siguiente muestra solo el bloqueo de «cerrar primero el anterior».
   * @throws CierreSinAlcanceTotal si el usuario no ve todas las bodegas.
   * @throws MesCerrado, MesAnteriorAlInicio o SinMesPorCerrar si el mes no se puede revisar.
   */
  async ejecutar(
    operador: Operador,
    pedido: { periodo: string; vista: VistaDelKardex },
  ): Promise<RevisionDelCierreDto> {
    exigirAlcanceTotal(pedido.vista);
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () =>
      revisionADto(await this.armador.armar(operador, pedido.periodo)),
    );
  }
}
