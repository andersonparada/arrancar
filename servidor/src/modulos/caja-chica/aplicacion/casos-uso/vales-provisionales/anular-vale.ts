import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import { exigirValeAnulable } from '../../../dominio/reglas-de-vales-provisionales.js';
import { RECURSO_DE_VALES_PROVISIONALES } from '../../../dominio/vales-provisionales.js';
import type { ValeProvisionalDto } from '../../dto/vales-provisionales.dto.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import type { DependenciasDeVales } from './dependencias-de-vales.js';
import { LectorDeVales } from './lector-de-vales.js';

export interface PeticionDeAnularVale {
  valeId: string;
  motivo: string;
}

/**
 * Anula un vale provisional (`vales.anular`, §5.5): solo abierto y sin comprobantes, con el fondo abierto. El efectivo vuelve
 * a contar como parte de la caja. Audita `anular` con el vale como estaba y el motivo.
 */
export class AnularVale {
  private readonly lectorDelFondo: LectorDelFondo;
  private readonly lector: LectorDeVales;

  constructor(private readonly dependencias: DependenciasDeVales) {
    this.lectorDelFondo = new LectorDelFondo({
      fondos: dependencias.fondos,
      consultas: dependencias.consultasDeFondos,
    });
    this.lector = new LectorDeVales(dependencias);
  }

  /** @throws RecursoNoEncontrado, FondoNoDisponible, ValeNoEstaAbierto, ValeConComprobantes */
  ejecutar(operador: Operador, pedido: PeticionDeAnularVale): Promise<ValeProvisionalDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, pedido));
  }

  private async anular(operador: Operador, { valeId, motivo }: PeticionDeAnularVale): Promise<ValeProvisionalDto> {
    const { vales, consultasDeVales, auditoria, reloj } = this.dependencias;
    const visible = await this.lector.buscar(valeId);
    exigirFondoAbierto(await this.lectorDelFondo.bloquear(visible.fondoId));
    const vale = await vales.bloquear(valeId);
    if (!vale) throw new RecursoNoEncontrado('El vale provisional');
    exigirValeAnulable(vale, (await consultasDeVales.comprobantesDelVale(valeId)).length);
    const anterior = await this.lector.leer(operador, vale);
    const hoy = await reloj.hoy(operador);
    const fechaDeAnulacion = hoy < vale.fecha ? vale.fecha : hoy;
    await vales.anular(valeId, { anuladoPor: operador.usuarioId, motivo, fechaDeAnulacion });
    await auditoria.registrar({
      recurso: RECURSO_DE_VALES_PROVISIONALES,
      registroId: valeId,
      accion: 'anular',
      anterior,
      motivo,
    });
    return this.lector.leer(operador, (await vales.buscar(valeId))!);
  }
}
