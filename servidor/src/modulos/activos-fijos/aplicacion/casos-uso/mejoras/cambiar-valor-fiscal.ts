import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo } from '../../../dominio/activo.js';
import { ValorFiscalSoloEnEdificios } from '../../../dominio/errores-de-activo.js';
import { RevisionInvalida } from '../../../dominio/errores-de-mejora.js';
import type { TramoCalculado } from '../../../dominio/depreciacion/tramo.js';
import type { ValoresDelInmuebleDeActivo } from '../../../dominio/reglas-de-activo.js';
import type { ActivoFichaDto } from '../../dto/activo.dto.js';
import type { SolicitudDeValorFiscalDelInmueble } from '../../dto/mejora.dto.js';
import type { DependenciasDeCambioDeLibros } from './dependencias-de-mejoras.js';
import { eventoDeBaseFiscal } from './eventos-de-mejoras.js';
import { motivoLimpio } from './motivo-de-revision.js';
import { planearCambioDeLibros } from './planear-cambio-de-libros.js';

interface CambioPedido {
  activoId: string;
  solicitud: SolicitudDeValorFiscalDelInmueble;
}

const SOPORTE_MAXIMO = 150;

const valoresDe = (activo: Activo): ValoresDelInmuebleDeActivo => {
  const { valorDeMatricula, valorCatastral, valoresDelInmuebleCompleto } = activo.instantanea();
  return { valorDeMatricula, valorCatastral, valoresDelInmuebleCompleto };
};

export class CambiarValorFiscalDelInmueble {
  constructor(private readonly dependencias: DependenciasDeCambioDeLibros) {}

  /**
   * Cambia la matrícula, el catastro o si son del inmueble completo de un edificio en uso (nuevo avalúo,
   * rectificación; A3). Hacia adelante: abre un tramo fiscal `cambio_de_matricula` desde el primer mes abierto con la
   * base recalculada (§3.5.1) y el mismo porcentaje; nunca toca meses cerrados. Queda en la auditoría como `corregir`,
   * con los valores y tramos de antes, el motivo y el documento de soporte. Al confirmar publica `base_fiscal_cambiada`.
   * @throws RecursoNoEncontrado si el activo no existe.
   * @throws ActivoDadoDeBaja o ActivoSinDepreciacionParaMejorar si no es un activo del balance en uso.
   * @throws ValorFiscalSoloEnEdificios, ActivoInvalido si el activo no es un edificio o los valores no valen.
   * @throws RevisionInvalida si falta el motivo o el documento de soporte.
   */
  async ejecutar(operador: Operador, pedido: CambioPedido): Promise<ActivoFichaDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { evento, ficha } = await unidadDeTrabajo.ejecutar(operador, () => this.cambiar(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return ficha;
  }

  private async cambiar(operador: Operador, { activoId, solicitud }: CambioPedido) {
    const { auditoria, consultas } = this.dependencias;
    const motivo = motivoLimpio(solicitud.motivo);
    const soporte = soporteLimpio(solicitud.documentoDeSoporte);
    const activo = await this.activoBloqueado(activoId);
    const anterior = await consultas.obtener(activoId);
    const evento = await this.aplicar(operador, activo, solicitud);
    await auditoria.registrar({
      recurso: 'activos-fijos.activos',
      registroId: activoId,
      accion: 'corregir',
      anterior,
      motivo: `${motivo} (soporte: ${soporte})`,
    });
    return { evento, ficha: await consultas.obtener(activoId) };
  }

  private async activoBloqueado(activoId: string): Promise<Activo> {
    await this.dependencias.cierres.bloquear('compartido');
    const [activo] = await this.dependencias.repositorio.buscarBloqueando([activoId]);
    if (!activo) throw new RecursoNoEncontrado('El activo');
    activo.exigirAdmiteMejoras();
    return activo;
  }

  private async aplicar(operador: Operador, activo: Activo, solicitud: SolicitudDeValorFiscalDelInmueble) {
    const { clases, repositorio, reloj } = this.dependencias;
    const clase = await clases.buscar(Identificador.desde(activo.instantanea().claseId));
    const incisoFiscal = clase!.instantanea().incisoFiscal;
    if (incisoFiscal !== 'edificios') throw new ValorFiscalSoloEnEdificios();
    const anteriores = valoresDe(activo);
    const { valorDeMatricula, valorCatastral, valoresDelInmuebleCompleto } = solicitud;
    activo.cambiarValoresDelInmueble({ valorDeMatricula, valorCatastral, valoresDelInmuebleCompleto }, incisoFiscal);
    const fiscal = await this.abrirTramoFiscal(operador, activo);
    await repositorio.guardar(activo);
    return eventoDeBaseFiscal({ activo, incisoFiscal, anteriores, fiscal, hoy: await reloj.hoy(operador) });
  }

  /** El tramo fiscal `cambio_de_matricula`, con la base recalculada con los valores nuevos del activo. */
  private async abrirTramoFiscal(operador: Operador, activo: Activo): Promise<TramoCalculado> {
    const plan = await planearCambioDeLibros(this.dependencias, operador, {
      activo,
      causa: 'cambio_de_matricula',
      fecha: null,
      costosNuevos: [],
      vidaRestanteMeses: null,
      valorResidualCentavos: null,
    });
    const { empresaId } = activo.instantanea();
    const cambio = { empresaId: empresaId.valor, activoId: activo.id.valor, mejoraId: null, tramos: plan.tramos };
    await this.dependencias.tramos.reemplazar(cambio);
    return plan.fiscal!;
  }
}

/** @throws RevisionInvalida si falta o pasa de 150 caracteres. */
function soporteLimpio(soporte: string): string {
  const limpio = soporte.trim();
  if (!limpio) throw new RevisionInvalida('Escriba el documento de soporte del cambio (avalúo, certificación…).');
  if (limpio.length > SOPORTE_MAXIMO)
    throw new RevisionInvalida(`El documento de soporte no puede pasar de ${SOPORTE_MAXIMO} caracteres.`);
  return limpio;
}
