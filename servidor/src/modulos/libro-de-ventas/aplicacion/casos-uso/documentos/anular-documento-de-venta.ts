import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { anioDe } from '../../../../core/calendario/dominio/fecha-iso.js';
import {
  causaDeAnulacionValida,
  exigirAnulable,
  fechaDeAnulacionValida,
  motivoDeAnulacionValido,
  type CausaDeAnulacion,
} from '../../../dominio/baja-de-documento.js';
import type { FuenteDeCalendario } from '../../../dominio/calendario-laboral.js';
import { DocumentoDeVentaAnulado } from '../../../dominio/eventos.js';
import { avisosDelPlazoDeAnulacion } from '../../../dominio/plazo-de-anulacion-en-la-sat.js';
import type { AnulacionDeDocumentoDeVentaDto, DocumentoDeVentaFichaDto } from '../../dto/documento-de-venta.dto.js';
import type { PeticionDeAnulacionDeVenta } from '../../dto/solicitud-de-documento.js';
import type {
  ControlDePeriodosParaVentas,
  DestinosDeVenta,
  RepositorioDeDocumentosDeVenta,
} from '../../puertos/puertos-de-documentos.js';
import { avisarAnulacion, exigirQueLasNotasSigaCabiendo } from './bajas-con-el-destino.js';
import { revisarElPeriodo } from './guardia-del-periodo.js';

/** La anulación pedida, con la causa y el motivo ya validados y la fecha de la SAT si la hay. */
interface BajaPedida {
  documentoId: string;
  causa: CausaDeAnulacion;
  motivo: string;
  fecha: string | null;
}

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDocumentosDeVenta;
  destinos: DestinosDeVenta;
  control: ControlDePeriodosParaVentas;
  auditoria: Auditoria;
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
  calendario: FuenteDeCalendario;
}

/**
 * Anula un documento vigente con su causa y su motivo (`docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md` §7.2): avisa
 * a la cartera (`documento_por_anular`) antes de cambiar nada, lo deja `anulado` con su fecha y usuario, lo audita con
 * la ficha anterior y, tras confirmar, publica `documento_anulado`. Con el control de períodos encendido, un mes declarado
 * no se toca; apagado, avisa que hay que rectificar. Si la causa es un error de captura y ya pasó el plazo de la SAT para
 * anular el DTE, avisa que solo cabe una nota de crédito. Los números anulados no se vuelven a usar.
 */
export class AnularDocumentoDeVenta {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado, MotivoDeAnulacionInvalido, CausaDeAnulacionInvalida, FechaDeAnulacionRequerida, FechaDeAnulacionInvalida,
   *   DocumentoYaAnulado, DocumentoConNotasVigentes, NotaDeDebitoSostieneNotasDeCredito, PeriodoDeclarado,
   *   DestinoInactivo, o el error de la cartera si rechaza la anulación (por ejemplo, porque ya tiene cobros).
   */
  async ejecutar(operador: Operador, peticion: PeticionDeAnulacionDeVenta): Promise<AnulacionDeDocumentoDeVentaDto> {
    const causa = causaDeAnulacionValida(peticion.causa);
    const motivo = motivoDeAnulacionValido(peticion.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const resultado = await unidadDeTrabajo.ejecutar(operador, () =>
      this.anular(operador, {
        documentoId: peticion.documentoId,
        causa,
        motivo,
        fecha: peticion.fechaDeAnulacion ?? null,
      }),
    );
    const { id, destino, anulacion, periodo, fechaEmision } = resultado.documento;
    await publicadorEventos.publicar([
      new DocumentoDeVentaAnulado({
        documentoId: id,
        empresaId: operador.empresaId,
        destino,
        fechaDeAnulacion: anulacion!.fecha,
        periodo,
        fechaDeEmision: fechaEmision,
      }),
    ]);
    return resultado;
  }

  private async anular(operador: Operador, peticion: BajaPedida): Promise<AnulacionDeDocumentoDeVentaDto> {
    const { repositorio, destinos, control, reloj } = this.dependencias;
    const guardado = await repositorio.buscar(peticion.documentoId, true);
    if (!guardado) throw new RecursoNoEncontrado('El documento');
    exigirAnulable(guardado.hechos);
    const { ficha } = guardado;
    const hoy = await reloj.hoy(operador);
    const fecha = fechaDeAnulacionValida(peticion, { emision: ficha.fechaEmision, hoy });
    const avisosDelPeriodo = await revisarElPeriodo(control, ficha.periodo);
    await exigirQueLasNotasSigaCabiendo(repositorio, guardado);
    const { causa, motivo } = peticion;
    await avisarAnulacion(destinos, operador, { documentoId: ficha.id, destino: ficha.destino, motivo });
    await repositorio.anular(ficha.id, { anuladoPor: operador.usuarioId, motivo, causa, fecha });
    await this.auditar(ficha, `${causa}: ${motivo}`);
    const avisosDelPlazo = await this.avisosDelPlazo(ficha, { causa, hoy });
    const anulado = await repositorio.buscar(ficha.id, false);
    return { documento: anulado!.ficha, avisos: [...avisosDelPeriodo, ...avisosDelPlazo] };
  }

  private auditar(ficha: DocumentoDeVentaFichaDto, motivo: string): Promise<void> {
    return this.dependencias.auditoria.registrar({
      recurso: 'libro-de-ventas.documentos',
      registroId: ficha.id,
      accion: 'anular',
      anterior: ficha,
      motivo,
    });
  }

  /** Solo un DTE con FEL tiene plazo de anulación en la SAT; sin la bandeja aún no se sabe si ya está anulado allá. */
  private async avisosDelPlazo(ficha: DocumentoDeVentaFichaDto, contexto: { causa: CausaDeAnulacion; hoy: string }) {
    if (contexto.causa !== 'error_de_captura' || ficha.autorizacionFel === null) return [];
    const anio = anioDe(ficha.periodo);
    const calendario = await this.dependencias.calendario.paraAnios([anio, anio + 1]);
    const datos = {
      causa: contexto.causa,
      tieneFel: ficha.autorizacionFel !== null,
      anuladoEnLaSat: false,
      hoy: contexto.hoy,
      periodo: ficha.periodo,
    };
    return avisosDelPlazoDeAnulacion(datos, calendario);
  }
}
