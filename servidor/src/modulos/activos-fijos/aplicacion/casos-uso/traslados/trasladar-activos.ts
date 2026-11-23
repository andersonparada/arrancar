import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo } from '../../../dominio/activo.js';
import {
  ComponenteSeTrasladaConSuPrincipal,
  FechaAnteriorAlUltimoTraslado,
  TrasladoInvalido,
  TrasladoParcialNoDisponible,
} from '../../../dominio/errores-de-traslado.js';
import { Traslado, type BoletaDeTraslado } from '../../../dominio/traslado.js';
import type { BoletaDto, SolicitudDeTraslado } from '../../dto/traslado.dto.js';
import { validarUbicacion } from '../activos/comprobaciones-de-activo.js';
import { exigirMesAbierto, IncisosDeClases, type DependenciasDeTraslados } from './dependencias-de-traslados.js';
import { eventoDeTraslado } from './eventos-de-traslados.js';

/** El número del correlativo `activos-fijos.traslados`: uno por boleta, no por activo. */
export const CLAVE_DEL_CORRELATIVO = 'activos-fijos.traslados';

interface Contexto {
  operador: Operador;
  solicitud: SolicitudDeTraslado;
  boleta: BoletaDeTraslado;
  hoy: string;
  incisos: IncisosDeClases;
}

export class TrasladarActivos {
  constructor(private readonly dependencias: DependenciasDeTraslados) {}

  /**
   * Traslada uno o varios activos (y los componentes de cada uno) con una sola boleta numerada: deja la nueva ubicación
   * vigente en cada activo y una fila en su historial. Con `marcarOcioso` (solo si el destino es la bodega de activos)
   * los marca como ociosos con la fecha y el motivo del traslado. Al confirmar publica `activo_trasladado` por activo.
   * @throws RecursoNoEncontrado si un activo, la localidad o el departamento no existen.
   * @throws TrasladoInvalido si no hay renglones, hay activos repetidos, falta quien recibe o el motivo, la fecha es
   * futura o se pide marcar ocioso sin ir a la bodega.
   * @throws MesCerrado, FechaAnteriorAlUltimoTraslado si la fecha no sirve.
   * @throws ComponenteSeTrasladaConSuPrincipal si se pide trasladar un componente solo.
   * @throws TrasladoParcialNoDisponible si la cantidad no es la del activo entero (llega con AFI-6).
   * @throws ActivoDadoDeBaja o ActivoNoEnUso (al marcar ocioso) si el activo no admite el cambio.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeTraslado): Promise<BoletaDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { boleta, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.trasladar(operador, solicitud));
    await publicadorEventos.publicar(eventos);
    return boleta;
  }

  private async trasladar(operador: Operador, solicitud: SolicitudDeTraslado) {
    const { cierres, reloj, clases, ubicaciones, consultasDeTraslados } = this.dependencias;
    exigirSolicitudCoherente(solicitud);
    await cierres.bloquear('compartido');
    await validarUbicacion({ ubicaciones }, solicitud);
    await exigirMesAbierto(cierres, solicitud.fecha);
    const activos = await this.cargarActivos(solicitud);
    const boleta = await this.numerarBoleta(solicitud.fecha);
    const contexto = {
      operador,
      solicitud,
      boleta,
      hoy: await reloj.hoy(operador),
      incisos: new IncisosDeClases(clases),
    };
    const eventos: EventoDominio[] = [];
    for (const activo of activos) eventos.push(await this.moverUno(activo, contexto));
    return { boleta: await consultasDeTraslados.boleta(boleta.grupoId), eventos };
  }

  /** Los activos pedidos, bloqueados, y sus componentes, que se mueven con ellos. */
  private async cargarActivos({ renglones }: SolicitudDeTraslado): Promise<Activo[]> {
    const { repositorio } = this.dependencias;
    const principales = await repositorio.buscarBloqueando(renglones.map((renglon) => renglon.activoId));
    if (principales.length !== renglones.length) throw new RecursoNoEncontrado('El activo');
    for (const activo of principales) this.exigirTrasladable(activo, renglones);
    const componentes = await repositorio.componentesDe(principales.map((activo) => activo.id.valor));
    return [...principales, ...componentes];
  }

  private exigirTrasladable(activo: Activo, renglones: SolicitudDeTraslado['renglones']): void {
    const { codigo, activoPadreId, cantidad } = activo.instantanea();
    if (activoPadreId) throw new ComponenteSeTrasladaConSuPrincipal(codigo);
    const pedida = renglones.find((renglon) => renglon.activoId === activo.id.valor)?.cantidad;
    if (pedida !== undefined && pedida !== cantidad) throw new TrasladoParcialNoDisponible(codigo);
  }

  private async numerarBoleta(fecha: string): Promise<BoletaDeTraslado> {
    const { numero, anio } = await this.dependencias.correlativos.siguiente(CLAVE_DEL_CORRELATIVO, fecha);
    return { grupoId: Identificador.nuevo().valor, numero, anioDeNumero: anio };
  }

  /** Mueve un activo, deja su fila del historial y, si se pidió, lo marca ocioso; devuelve el evento. */
  private async moverUno(activo: Activo, contexto: Contexto): Promise<EventoDominio> {
    const { traslados, repositorio } = this.dependencias;
    const { solicitud, boleta, hoy, incisos } = contexto;
    const { id, empresaId, codigo, claseId, localidadId, departamentoId, responsable } = activo.instantanea();
    const [ultimo] = await traslados.recientesDeActivo(id.valor, 1);
    if (ultimo && solicitud.fecha < ultimo.fecha) throw new FechaAnteriorAlUltimoTraslado(codigo, ultimo.fecha);
    const traslado = Traslado.registrar({ empresaId, activoId: id.valor, ...boleta }, solicitud, hoy);
    const anterior = solicitud.marcarOcioso ? await this.dependencias.consultas.obtener(id.valor) : null;
    const { responsable: nuevoResponsable } = traslado.instantanea();
    activo.moverA({
      localidadId: solicitud.localidadId,
      departamentoId: solicitud.departamentoId,
      responsable: nuevoResponsable,
      enBodega: solicitud.aBodega,
    });
    if (anterior) await this.marcarOcioso(activo, { contexto, anterior });
    await repositorio.guardar(activo);
    await traslados.agregarVarios([traslado]);
    const incisoFiscal = await incisos.de(claseId);
    return eventoDeTraslado({ activo, incisoFiscal, traslado }, { localidadId, departamentoId, responsable });
  }

  private async marcarOcioso(
    activo: Activo,
    { contexto, anterior }: { contexto: Contexto; anterior: unknown },
  ): Promise<void> {
    if (activo.instantanea().ocioso) return;
    const { fecha, motivo } = contexto.solicitud;
    activo.marcarOcioso({ fecha, motivo }, contexto.hoy);
    await this.dependencias.auditoria.registrar({
      recurso: 'activos-fijos.activos',
      registroId: activo.id.valor,
      accion: 'corregir',
      anterior,
      motivo: `Ocioso al trasladarlo a la bodega: ${motivo}`,
    });
  }
}

/** Lo que se ve sin leer nada: renglones, repetidos y la marca de ocioso sin bodega. */
function exigirSolicitudCoherente({ renglones, marcarOcioso, aBodega }: SolicitudDeTraslado): void {
  if (renglones.length === 0) throw new TrasladoInvalido('Elija al menos un activo para trasladar.');
  if (new Set(renglones.map((renglon) => renglon.activoId)).size !== renglones.length)
    throw new TrasladoInvalido('Un activo no puede aparecer dos veces en la misma boleta.');
  if (marcarOcioso && !aBodega) throw new TrasladoInvalido('Solo se marca como ocioso al llevar el bien a la bodega.');
}
