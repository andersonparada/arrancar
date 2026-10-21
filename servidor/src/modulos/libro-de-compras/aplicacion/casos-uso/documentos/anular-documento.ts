import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import {
  avisosDeBajaPorPeriodo,
  causaDeAnulacionValida,
  exigirAnulable,
  motivoDeAnulacionValido,
  type CausaDeAnulacion,
} from '../../../dominio/baja-de-documento.js';
import type { DestinoDeDocumento } from '../../../dominio/destinos-de-documento.js';
import { DocumentoAnulado } from '../../../dominio/eventos.js';
import type { AnulacionDeDocumentoDto } from '../../dto/documento-ficha.dto.js';
import type {
  DocumentoGuardado,
  RepositorioDeDocumentosGuardados,
} from '../../puertos/puertos-de-baja-de-documentos.js';
import type { ConsultasDeDocumentos, DestinosDeDocumentos } from '../../puertos/puertos-de-documentos.js';
import type { EnlaceConLaBandeja } from '../../puertos/puertos-de-la-bandeja.js';
import type { ControlDePeriodos } from '../../puertos/puertos-de-periodos.js';
import type { RepositorioDeDatosFiscalesDeEmpresa } from '../../puertos/repositorios-de-datos-fiscales.js';
import { avisarAnulacion } from './destino-de-la-baja.js';
import { bajaDelPeriodo } from './credito-de-la-empresa.js';
import { dejarRetencionesPorResolver, type DependenciasDeRetencionesDeLaBaja } from './retenciones-de-la-baja.js';
import { exigirPeriodoAbierto } from './guardia-del-periodo.js';
import { dtoDeFicha, hechosDe } from './dto-de-ficha.js';
import { exigirQueLaBajaRespeteElTope } from './tope-de-la-baja.js';

interface Dependencias extends DependenciasDeRetencionesDeLaBaja {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDocumentosGuardados;
  destinos: DestinosDeDocumentos;
  /** Para bloquear la factura de una nota de débito y revisar el tope de sus notas de crédito. */
  consultas: ConsultasDeDocumentos;
  control: ControlDePeriodos;
  /** La fila de la bandeja de DTE enlazada con el documento vuelve a `pendiente`. */
  bandeja: EnlaceConLaBandeja;
  auditoria: Auditoria;
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
  datosFiscalesDeEmpresa: RepositorioDeDatosFiscalesDeEmpresa;
}

export interface PeticionDeAnulacion {
  documentoId: string;
  causa: CausaDeAnulacion;
  motivo: string;
  /** El destino que pide la anulación (orden `anular_documento`): ya hizo lo suyo, así que no se le avisa. */
  origen?: DestinoDeDocumento;
}

/**
 * Anula el registro de un documento vigente (no la FEL: solo su emisor la anula en la SAT) con su causa y su motivo: avisa al destino (`documento_por_anular`) antes de cambiar nada, lo
 * deja `anulado` con su fecha y usuario (su número queda libre), devuelve a `pendiente` su fila de la bandeja de DTE, deja sus retenciones con monto «por resolver», lo audita con la ficha anterior y, tras confirmar,
 * publica `documento_anulado`. Si el período es anterior al mes actual avisa que puede estar declarado. Si el destino
 * lo rechaza, no cambia nada. Lo usan la ruta y la orden del mediador.
 */
export class AnularDocumento {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si no existe; MotivoDeAnulacionInvalido si falta o pasa de 300 caracteres;
   *   CausaDeAnulacionInvalida si no es de la lista.
   * @throws DocumentoYaAnulado, DocumentoConNotasVigentes o NotaDeDebitoSostieneNotasDeCredito si no se puede anular.
   * @throws el error del destino si rechaza la anulación.
   */
  async ejecutar(operador: Operador, peticion: PeticionDeAnulacion): Promise<AnulacionDeDocumentoDto> {
    const causa = causaDeAnulacionValida(peticion.causa);
    const motivo = motivoDeAnulacionValido(peticion.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const resultado = await unidadDeTrabajo.ejecutar(operador, () =>
      this.anular(operador, { ...peticion, causa, motivo }),
    );
    const { id, destino } = resultado.documento;
    await publicadorEventos.publicar([
      new DocumentoAnulado({ documentoId: id, empresaId: operador.empresaId, destino }),
    ]);
    return resultado;
  }

  private async anular(
    operador: Operador,
    { documentoId, causa, motivo, origen }: PeticionDeAnulacion,
  ): Promise<AnulacionDeDocumentoDto> {
    const { repositorio, destinos, control } = this.dependencias;
    const guardado = await repositorio.buscar(documentoId, true);
    if (!guardado) throw new RecursoNoEncontrado('El documento');
    exigirAnulable(hechosDe(guardado));
    await exigirQueLaBajaRespeteElTope(this.dependencias.consultas, guardado);
    await exigirPeriodoAbierto(control, guardado.documento.periodo);
    const { destino } = guardado.documento;
    await avisarAnulacion(destinos, operador, { documentoId, destino, motivo, origen });
    await repositorio.anular(documentoId, { anuladoPor: operador.usuarioId, motivo, causa });
    await this.dependencias.bandeja.soltar(documentoId);
    await this.auditar(guardado, `${causa}: ${motivo}`);
    const avisosDeRetenciones = await dejarRetencionesPorResolver(this.dependencias, documentoId);
    const hoy = await this.dependencias.reloj.hoy(operador);
    const anulado = (await repositorio.buscar(documentoId, false)) ?? guardado;
    const { periodo } = guardado.documento;
    const baja = await bajaDelPeriodo(this.dependencias.datosFiscalesDeEmpresa, operador.empresaId, periodo);
    return { documento: dtoDeFicha(anulado), avisos: [...avisosDeBajaPorPeriodo(baja, hoy), ...avisosDeRetenciones] };
  }

  private auditar(guardado: DocumentoGuardado, motivo: string): Promise<void> {
    return this.dependencias.auditoria.registrar({
      recurso: 'libro-de-compras.documentos',
      registroId: guardado.documento.id,
      accion: 'anular',
      anterior: dtoDeFicha(guardado),
      motivo,
    });
  }
}
