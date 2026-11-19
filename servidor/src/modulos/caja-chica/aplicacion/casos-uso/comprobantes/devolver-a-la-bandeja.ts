import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { RECURSO_DE_COMPROBANTES, etiquetaDelComprobante, type Comprobante } from '../../../dominio/comprobantes.js';
import {
  ComprobanteConReposicionAnulada,
  ComprobanteRepuesto,
  ComprobanteYaAnulado,
  DocumentoYaEstaEnLaBandeja,
  FacturaConNotasEnElFondo,
  SoloUnDocumentoVuelveALaBandeja,
} from '../../../dominio/errores-de-comprobantes.js';
import { ComprobanteDeUnVale } from '../../../dominio/errores-de-vales-provisionales.js';
import { exigirQueAlcanceElEfectivo, efectoEnLoPendiente } from '../../../dominio/reglas-de-comprobantes.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import type { ComprobanteDto } from '../../dto/comprobantes.dto.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { comprobanteDto } from './armado-del-comprobante.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';
import { efectivoEsperadoDelFondo, eventoDeQuitado } from './utilidades-de-comprobantes.js';

export interface PeticionDeDevolver {
  comprobanteId: string;
  motivo: string;
}

/**
 * Devuelve un documento de un fondo a la bandeja (`comprobantes.crear`, §5.4 c): solo si no está repuesto. Limpia el fondo,
 * la asignación y los motivos (reasignarlo pide otra vez el permiso de excepción y un motivo). Audita `corregir` con el
 * comprobante como estaba y el motivo, y publica `comprobante_quitado`.
 */
export class DevolverALaBandeja {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: DependenciasDeComprobantes) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
  }

  /**
   * @throws RecursoNoEncontrado, DocumentoYaEstaEnLaBandeja, SoloUnDocumentoVuelveALaBandeja, ComprobanteRepuesto,
   * ComprobanteConReposicionAnulada, ComprobanteDeUnVale, FacturaConNotasEnElFondo, FondoNoDisponible, ComprobantesMayoresQueElEfectivo
   */
  async ejecutar(operador: Operador, pedido: PeticionDeDevolver): Promise<ComprobanteDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () => this.devolver(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async devolver(operador: Operador, { comprobanteId, motivo }: PeticionDeDevolver) {
    const { comprobantes, auditoria } = this.dependencias;
    const visto = await comprobantes.buscar(comprobanteId);
    if (!visto) throw new RecursoNoEncontrado('El comprobante');
    if (visto.fondoId === null) throw new DocumentoYaEstaEnLaBandeja();
    exigirFondoAbierto(await this.lector.bloquear(visto.fondoId));
    const comprobante = (await comprobantes.bloquear(comprobanteId))!;
    await this.exigirDevolvible(comprobante);
    await comprobantes.devolverALaBandeja(comprobante.id, comprobante.documento!.fechaEmision);
    await auditoria.registrar({
      recurso: RECURSO_DE_COMPROBANTES,
      registroId: comprobante.id,
      accion: 'corregir',
      anterior: comprobanteDto(comprobante),
      motivo,
    });
    return {
      dto: comprobanteDto((await comprobantes.buscar(comprobante.id))!),
      evento: eventoDeQuitado(operador, { comprobante, motivo: 'devuelto_a_la_bandeja' }),
    };
  }

  private async exigirDevolvible(comprobante: Comprobante): Promise<void> {
    if (comprobante.clase !== 'documento') throw new SoloUnDocumentoVuelveALaBandeja();
    if (comprobante.estado === 'anulado') throw new ComprobanteYaAnulado();
    if (comprobante.valeProvisionalId !== null) throw new ComprobanteDeUnVale(etiquetaDelComprobante(comprobante));
    if (comprobante.reposicionNumero !== null) throw new ComprobanteRepuesto(comprobante.reposicionNumero);
    const { comprobantes, consultasDeFondos } = this.dependencias;
    if (await comprobantes.tuvoReposicionAnulada(comprobante.id)) throw new ComprobanteConReposicionAnulada();
    if (!comprobante.esNotaDeCredito && (await comprobantes.contarNotasVigentes(comprobante.id)) > 0) {
      throw new FacturaConNotasEnElFondo(etiquetaDelComprobante(comprobante));
    }
    // Sacar una nota sube lo pendiente: el efectivo debe alcanzar.
    const esperado = await efectivoEsperadoDelFondo(consultasDeFondos, comprobante.fondoId!);
    exigirQueAlcanceElEfectivo(esperado, -efectoEnLoPendiente(comprobante));
  }
}
