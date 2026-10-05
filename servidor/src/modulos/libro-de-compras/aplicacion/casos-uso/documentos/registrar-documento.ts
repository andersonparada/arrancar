import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { paraElDestino } from '../../../dominio/documento-de-compra.js';
import { DocumentoRegistrado } from '../../../dominio/eventos.js';
import type { DocumentoConAvisosDto } from '../../dto/documento.dto.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import { DocumentoRepetido } from '../../errores.js';
import type { CompletadorDeNit, RepositorioDeDocumentos } from '../../puertos/puertos-de-documentos.js';
import { GuardarDatosFiscalesDeProveedor } from '../datos-fiscales/guardar-datos-fiscales-de-proveedor.js';
import { auditarRegistro } from './auditoria-del-registro.js';
import { dtoDeDocumento } from './dto-de-documento.js';
import {
  PreparadorDeDocumento,
  type DependenciasDelPreparador,
  type DocumentoPreparado,
} from './preparador-de-documento.js';

interface Dependencias extends DependenciasDelPreparador {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDocumentos;
  completadorDeNit: CompletadorDeNit;
  auditoria: Auditoria;
  publicadorEventos: PublicadorEventos;
}

export interface PeticionDeRegistro {
  solicitud: SolicitudDeDocumento;
  /** El usuario tiene `libro-de-compras.retenciones.ajustar`. */
  puedeAjustarRetenciones: boolean;
}

/**
 * Registra una factura, factura de pequeño contribuyente, nota de crédito o recibo, con sus líneas y retenciones,
 * en una sola transacción: valida, calcula, completa el NIT del proveedor si falta, guarda sus datos fiscales si no
 * los tenía, guarda y manda el documento al destino (`<destino>.recibir_documento`). Si el destino lo rechaza, no queda nada. El evento
 * `libro-de-compras.documento_registrado` sale solo después de confirmar.
 */
export class RegistrarDocumento {
  private readonly preparador: PreparadorDeDocumento;
  private readonly guardarDatosFiscales: GuardarDatosFiscalesDeProveedor;

  constructor(private readonly dependencias: Dependencias) {
    this.preparador = new PreparadorDeDocumento(dependencias);
    this.guardarDatosFiscales = new GuardarDatosFiscalesDeProveedor({
      unidadDeTrabajo: dependencias.unidadDeTrabajo,
      repositorio: dependencias.datosFiscalesDeProveedor,
      auditoria: dependencias.auditoria,
    });
  }

  /**
   * @throws DocumentoRepetido si ya hay uno igual en la empresa (la base rechaza el de otra empresa o cuenta).
   * @throws DestinoNoDisponible, AccesoDenegado o cualquier regla del dominio (ver `PreparadorDeDocumento`).
   */
  async ejecutar(operador: Operador, peticion: PeticionDeRegistro): Promise<DocumentoConAvisosDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { documento, avisos } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const preparado = await this.preparador.preparar(operador, peticion.solicitud, {
        bloquearFactura: true,
        puedeAjustarRetenciones: peticion.puedeAjustarRetenciones,
      });
      await this.guardar(operador, preparado);
      return preparado;
    });
    await publicadorEventos.publicar([
      new DocumentoRegistrado({
        ...paraElDestino(documento),
        empresaId: documento.empresaId,
        destino: documento.destino,
      }),
    ]);
    return { documento: dtoDeDocumento(documento, true), avisos };
  }

  /** Repetido, NIT y datos fiscales del proveedor, inserción, auditoría y orden al destino. */
  private async guardar(operador: Operador, preparado: DocumentoPreparado) {
    const { repositorio, completadorDeNit, destinos, auditoria } = this.dependencias;
    const { documento, nitParaCompletar, datosFiscalesPorGuardar } = preparado;
    const repetido = await repositorio.buscarRepetido(documento);
    if (repetido) throw new DocumentoRepetido(repetido.id);
    if (nitParaCompletar) await completadorDeNit.completar(operador, documento.proveedorId, nitParaCompletar);
    if (datosFiscalesPorGuardar) {
      const datos = datosFiscalesPorGuardar.instantanea();
      await this.guardarDatosFiscales.ejecutar(operador, { proveedorId: documento.proveedorId, datos });
    }
    await repositorio.agregar(documento);
    await auditarRegistro(auditoria, documento, preparado);
    await destinos.recibir(operador, documento.destino, paraElDestino(documento));
  }
}
