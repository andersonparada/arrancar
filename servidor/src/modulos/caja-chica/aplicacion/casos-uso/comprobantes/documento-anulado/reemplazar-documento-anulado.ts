import { RecursoNoEncontrado } from '../../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../../core/compartido/aplicacion/operador.js';
import { RECURSO_DE_COMPROBANTES, etiquetaDelComprobante, type Comprobante } from '../../../../dominio/comprobantes.js';
import { aReemplazo, exigirPendiente } from '../../../../dominio/documento-anulado.js';
import { ReemplazoNoValido } from '../../../../dominio/errores-de-documento-anulado.js';
import { DocumentoAnuladoResuelto } from '../../../../dominio/eventos-de-comprobantes.js';
import type { ComprobanteDto } from '../../../dto/comprobantes.dto.js';
import type { LibroParaReponer } from '../../../puertos/puertos-de-reposiciones.js';
import { comprobanteDto } from '../armado-del-comprobante.js';
import type { DependenciasDeComprobantes } from '../dependencias-de-comprobantes.js';
import { ApoyoDelDocumentoAnulado, type PeticionConMotivo } from './apoyo-del-documento-anulado.js';

export interface PeticionDeReemplazo extends PeticionConMotivo {
  /** El comprobante de la bandeja que trae la FEL nueva del mismo proveedor. */
  reemplazoId: string;
}

/** Debe estar vigente en la bandeja y dentro del libro (con crédito fiscal). */
function exigirNuevoEnLaBandeja(nuevo: Comprobante): void {
  const etiqueta = etiquetaDelComprobante(nuevo);
  if (nuevo.clase !== 'documento' || nuevo.estado !== 'vigente' || nuevo.fondoId !== null || nuevo.seguimiento) {
    throw new ReemplazoNoValido(`El documento ${etiqueta} debe estar vigente en la bandeja, sin fondo.`);
  }
  if (!nuevo.documento?.enElLibro) {
    throw new ReemplazoNoValido(`El documento ${etiqueta} quedó fuera del libro de compras: no da crédito fiscal.`);
  }
}

/** Lo que debe cumplir el documento nuevo para quedar en lugar del anulado: el mismo gasto con otra FEL. */
function exigirQueReemplace(anulado: Comprobante, nuevo: Comprobante): void {
  const etiqueta = etiquetaDelComprobante(nuevo);
  if (nuevo.id === anulado.id) throw new ReemplazoNoValido('El documento nuevo no puede ser el mismo comprobante.');
  exigirNuevoEnLaBandeja(nuevo);
  if (nuevo.proveedorId !== anulado.proveedorId) {
    throw new ReemplazoNoValido(`El documento ${etiqueta} es de otro proveedor.`);
  }
  if (nuevo.esNotaDeCredito !== anulado.esNotaDeCredito || nuevo.montoCentavos !== anulado.montoCentavos) {
    throw new ReemplazoNoValido(
      `El documento ${etiqueta} debe ser del mismo monto y clase que el anulado: el reemplazo por otro monto aún no está disponible. Pida al emisor una FEL del mismo monto.`,
    );
  }
}

/**
 * «Reemplazar el documento anulado» (`comprobantes.resolver`): el emisor dio otra FEL por el mismo gasto, ya registrada
 * en el libro con destino Caja chica (queda en la bandeja). El comprobante conserva su fondo, su vale, su reposición y su
 * monto, y pasa a apuntar a la FEL nueva; el comprobante de la bandeja desaparece (audita `eliminar`) y la factura anulada
 * queda en `documento_anulado_id`. El gasto sigue en su mes; el crédito se toma con la fecha de la FEL nueva. Si ya estaba
 * repuesto, marca la nueva como procesada en el libro. Audita `corregir` con el comprobante como estaba y publica
 * `documento_anulado_resuelto`.
 */
export class ReemplazarDocumentoAnulado {
  private readonly apoyo: ApoyoDelDocumentoAnulado;

  constructor(
    private readonly dependencias: DependenciasDeComprobantes,
    private readonly libro: LibroParaReponer,
  ) {
    this.apoyo = new ApoyoDelDocumentoAnulado(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, ComprobanteSinDocumentoAnulado, SituacionDelDocumentoNoPermite, ReemplazoNoValido
   */
  async ejecutar(operador: Operador, pedido: PeticionDeReemplazo): Promise<ComprobanteDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () => this.reemplazar(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async reemplazar(operador: Operador, pedido: PeticionDeReemplazo) {
    const { comprobantes, auditoria } = this.dependencias;
    const anulado = await this.apoyo.bloquear(pedido.comprobanteId);
    exigirPendiente(anulado);
    const nuevo = await comprobantes.bloquear(pedido.reemplazoId);
    if (!nuevo) throw new RecursoNoEncontrado('El documento de reemplazo');
    exigirQueReemplace(anulado, nuevo);
    await auditoria.registrar({
      recurso: RECURSO_DE_COMPROBANTES,
      registroId: nuevo.id,
      accion: 'eliminar',
      anterior: comprobanteDto(nuevo),
      motivo: `Reemplaza al documento anulado del comprobante ${etiquetaDelComprobante(anulado)}`,
    });
    await comprobantes.eliminar(nuevo.id);
    await comprobantes.ponerDocumento(anulado.id, nuevo.documentoDeCompraId!);
    if (anulado.reposicionNumero !== null) await this.libro.marcarProcesado(operador, nuevo.documentoDeCompraId!, true);
    const seguimiento = aReemplazo(anulado, {
      motivo: pedido.motivo,
      documentoAnuladoId: anulado.documentoDeCompraId!,
    });
    const motivo = `Documento anulado reemplazado por ${etiquetaDelComprobante(nuevo)}: ${pedido.motivo}`;
    const dto = await this.apoyo.guardar({ anterior: anulado, seguimiento, accion: 'corregir', motivo });
    return { dto, evento: await this.evento(operador, { anulado, nuevo }) };
  }

  private async evento(operador: Operador, por: { anulado: Comprobante; nuevo: Comprobante }) {
    const { anulado, nuevo } = por;
    return new DocumentoAnuladoResuelto({
      empresaId: operador.empresaId,
      fondoId: anulado.fondoId!,
      comprobanteId: anulado.id,
      documentoDeCompraId: nuevo.documentoDeCompraId!,
      documentoAnuladoId: anulado.documentoDeCompraId,
      salida: 'reemplazo',
      montoCentavos: anulado.montoCentavos,
      salidaCentavos: null,
      destino: null,
      fecha: await this.dependencias.reloj.hoy(operador),
    });
  }
}
