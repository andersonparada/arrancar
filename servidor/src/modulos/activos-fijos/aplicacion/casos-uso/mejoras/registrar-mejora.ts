import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Activo } from '../../../dominio/activo.js';
import { periodoDe } from '../../../dominio/depreciacion/meses.js';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import { CostoInvalido } from '../../../dominio/errores-de-costo.js';
import { MejoraInvalida } from '../../../dominio/errores-de-mejora.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';
import { Mejora } from '../../../dominio/mejora.js';
import type { MejoraDto, SolicitudDeMejora } from '../../dto/mejora.dto.js';
import { armarCostosDeMejora } from './costos-de-mejora.js';
import type { DependenciasDeMejoras } from './dependencias-de-mejoras.js';
import { aplicarEstimacion, eventoDeMejora } from './eventos-de-mejoras.js';
import { planearCambioDeLibros } from './planear-cambio-de-libros.js';

interface MejoraPedida {
  activoId: string;
  solicitud: SolicitudDeMejora;
}

/** El número del correlativo `activos-fijos.mejoras`, que reinicia cada año solo si la empresa lo pide. */
const CLAVE_DEL_CORRELATIVO = 'activos-fijos.mejoras';

export class RegistrarMejora {
  constructor(private readonly dependencias: DependenciasDeMejoras) {}

  /**
   * Registra una mejora o un costo posterior de un activo en uso: agrupa costos (de líneas del libro, con su regla de
   * la línea, o escritos a mano), abre desde el mes que toca un tramo nuevo en cada libro (§7.3, V-3) y deja la
   * depreciación de los meses cerrados como estaba. Al confirmar publica `mejora_capitalizada`.
   * @throws RecursoNoEncontrado si el activo no existe.
   * @throws ActivoDadoDeBaja o ActivoSinDepreciacionParaMejorar si el activo no admite mejoras.
   * @throws MejoraInvalida, MesCerrado o CambioAnteriorAlUltimoTramo si la fecha no sirve.
   * @throws VidaUtilRestanteRequerida si el activo ya agotó su vida contable y no se dijo cuánta queda.
   * @throws LineaNoCapitalizable, LineaSobrecapitalizada, CostoInvalido, MejoraSinCostoNeto o CostoDeActivoNegativo.
   */
  async ejecutar(operador: Operador, pedido: MejoraPedida): Promise<MejoraDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () => this.registrar(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async registrar(operador: Operador, { activoId, solicitud }: MejoraPedida) {
    const { cierres, repositorio, consultasDeMejoras } = this.dependencias;
    await cierres.bloquear('compartido');
    const [activo] = await repositorio.buscarBloqueando([activoId]);
    if (!activo) throw new RecursoNoEncontrado('El activo');
    activo.exigirAdmiteMejoras();
    await this.exigirFechaValida(operador, activo, solicitud.fecha);
    const armado = await this.armar(operador, { activo, solicitud });
    await this.guardar(armado, solicitud);
    const montoCentavos = armado.nuevos.reduce((suma, costo) => suma + costo.instantanea().montoCentavos, 0);
    const { mejora, plan } = armado;
    const evento = eventoDeMejora({ activo, mejora, montoCentavos, ...plan });
    return { dto: await consultasDeMejoras.obtener(mejora.id.valor), evento };
  }

  /** Todo lo que se va a guardar, ya calculado y revisado; todavía no se escribió nada. */
  private async armar(operador: Operador, { activo, solicitud }: { activo: Activo; solicitud: SolicitudDeMejora }) {
    const mejora = await this.nuevaMejora(activo, solicitud);
    const nuevos = await armarCostosDeMejora(this.dependencias, {
      mejora,
      solicitud,
      codigoDelActivo: activo.instantanea().codigo,
    });
    const plan = await planearCambioDeLibros(this.dependencias, operador, {
      activo,
      causa: solicitud.clase,
      fecha: solicitud.fecha,
      costosNuevos: nuevos,
      vidaRestanteMeses: solicitud.vidaUtilRestanteContableMeses,
      valorResidualCentavos: null,
    });
    exigirEdificacion(solicitud, plan.incisoFiscal);
    return { activo, mejora, nuevos, plan };
  }

  private async guardar(armado: Awaited<ReturnType<RegistrarMejora['armar']>>, solicitud: SolicitudDeMejora) {
    const { mejoras, costos, tramos, repositorio } = this.dependencias;
    const { activo, mejora, nuevos, plan } = armado;
    await mejoras.agregar(mejora);
    await costos.agregarVarios(nuevos);
    const { empresaId } = mejora.instantanea();
    const cambio = { empresaId: empresaId.valor, activoId: activo.id.valor, mejoraId: mejora.id.valor };
    await tramos.reemplazar({ ...cambio, tramos: plan.tramos });
    if (plan.contable && solicitud.vidaUtilRestanteContableMeses !== null) {
      aplicarEstimacion(activo, plan.contable);
      await repositorio.guardar(activo);
    }
  }

  /** La fecha no es futura ni anterior al uso, y cae en un mes abierto. */
  private async exigirFechaValida(operador: Operador, activo: Activo, fecha: string): Promise<void> {
    const { reloj, cierres } = this.dependencias;
    if (fecha > (await reloj.hoy(operador))) throw new MejoraInvalida('La fecha no puede ser futura.');
    const uso = activo.instantanea().fechaDeInicioDeUso;
    if (uso && fecha < uso) throw new MejoraInvalida('La fecha no puede ser anterior al inicio de uso del activo.');
    const ultimo = await cierres.ultimoMesCerrado();
    if (ultimo && periodoDe(fecha) <= periodoDe(ultimo)) throw new MesCerrado(periodoDe(fecha));
  }

  private async nuevaMejora(activo: Activo, solicitud: SolicitudDeMejora): Promise<Mejora> {
    const { numero, anio } = await this.dependencias.correlativos.siguiente(CLAVE_DEL_CORRELATIVO, solicitud.fecha);
    const { clase, fecha, descripcion, vidaUtilRestanteContableMeses, noEsEdificacion } = solicitud;
    return Mejora.registrar(
      { empresaId: activo.instantanea().empresaId, activoId: activo.id.valor, numero, anioDeNumero: anio },
      { clase, fecha, descripcion, vidaUtilRestanteContableMeses, noEsEdificacion },
    );
  }
}

/** «No es edificación» solo se marca en los activos de la clase Edificios (§3.5.1). */
function exigirEdificacion(solicitud: SolicitudDeMejora, incisoFiscal: IncisoFiscal): void {
  if (solicitud.noEsEdificacion && incisoFiscal !== 'edificios')
    throw new CostoInvalido('"No es edificación" solo se marca en los activos de la clase Edificios.');
}
