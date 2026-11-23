import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo } from '../../../dominio/activo.js';
import type { PrimerMes } from '../../../dominio/depreciacion/meses.js';
import type { ActivoFichaDto, SolicitudDePonerEnUso, UbicacionAlPonerEnUso } from '../../dto/activo.dto.js';
import type { TopesPorInciso } from '../../puertos/lector-de-topes.js';
import { validarUbicacion } from './comprobaciones-de-activo.js';
import type { DependenciasDeUso } from './dependencias-de-uso.js';
import { planearUso } from './plan-de-uso.js';
import { UbicadorAlPonerEnUso } from './ubicar-al-poner-en-uso.js';

/** Lo que se pide poner disponible: los activos, la fecha y parámetros de cada uno, y la ubicación común. */
export interface PedidoDeActivar {
  activoIds: readonly string[];
  fechaDeInicioDeUso: string;
  /** Lo que el usuario escribió para un activo; lo que falte lo propone su clase. */
  solicitudDe: (activoId: string) => SolicitudDePonerEnUso;
  ubicacion: UbicacionAlPonerEnUso | null | undefined;
}

interface ReglasDeLaEmpresa {
  topes: TopesPorInciso;
  primerMes: PrimerMes;
}

interface ContextoDeActivar {
  operador: Operador;
  pedido: PedidoDeActivar;
  reglas: ReglasDeLaEmpresa;
}

/**
 * Pone en uso («Disponible para uso») uno o varios activos en una sola transacción, con el candado compartido del
 * cierre: es lo que comparten `PonerEnUso` y `PonerEnUsoVarios`. Todo o nada.
 */
export class ActivadorDeActivos {
  private readonly ubicador: UbicadorAlPonerEnUso;

  constructor(private readonly dependencias: DependenciasDeUso) {
    this.ubicador = new UbicadorAlPonerEnUso(dependencias);
  }

  /** @returns las fichas en el orden pedido; publica `activo_trasladado` de los traslados al confirmar. */
  async ejecutar(operador: Operador, pedido: PedidoDeActivar): Promise<ActivoFichaDto[]> {
    const { unidadDeTrabajo, topes, primerMes, publicadorEventos } = this.dependencias;
    const reglas = { topes: await topes.paraEmpresa(operador), primerMes: await primerMes.paraEmpresa(operador) };
    const { fichas, eventos } = await unidadDeTrabajo.ejecutar(operador, () =>
      this.activar({ operador, pedido, reglas }),
    );
    await publicadorEventos.publicar(eventos);
    return fichas;
  }

  private async activar(contexto: ContextoDeActivar) {
    const { cierres, ubicaciones, consultas } = this.dependencias;
    const { operador, pedido } = contexto;
    await cierres.bloquear('compartido');
    if (pedido.ubicacion) await validarUbicacion({ ubicaciones }, pedido.ubicacion);
    const activos = await this.cargar(pedido.activoIds);
    for (const activo of activos) await this.ponerUno(activo, contexto);
    const { fechaDeInicioDeUso: fecha, ubicacion } = pedido;
    const eventos: EventoDominio[] = ubicacion
      ? await this.ubicador.ubicar({ operador, activos, fecha, ubicacion })
      : [];
    const fichas = await Promise.all(pedido.activoIds.map((id) => consultas.obtener(id)));
    return { fichas, eventos };
  }

  private async cargar(ids: readonly string[]): Promise<Activo[]> {
    const bloqueados = await this.dependencias.repositorio.buscarBloqueando(ids);
    if (bloqueados.length !== ids.length) throw new RecursoNoEncontrado('El activo');
    return ids.map((id) => bloqueados.find((activo) => activo.id.valor === id)!);
  }

  private async ponerUno(activo: Activo, { operador, pedido, reglas }: ContextoDeActivar): Promise<void> {
    const { repositorio, clases, costos, tramos, cierres, saldos } = this.dependencias;
    activo.exigirEnConstruccion();
    const propiedades = activo.instantanea();
    const activoId = propiedades.id.valor;
    const clase = await clases.buscar(Identificador.desde(propiedades.claseId));
    if (!clase) throw new RecursoNoEncontrado('La clase de activo');
    const { incisoFiscal } = clase.instantanea();
    const plan = planearUso({
      activo: propiedades,
      clase: clase.instantanea(),
      costos: (await costos.vigentesDeActivo(activoId)).map((costo) => costo.instantanea()),
      saldoInicial: await saldos.fiscalDeActivo(activoId),
      solicitud: pedido.solicitudDe(activoId),
      primerMes: reglas.primerMes,
      porcentajeMaximo: reglas.topes[incisoFiscal].porcentajeMaximo,
      ultimoMesCerrado: await cierres.ultimoMesCerrado(),
    });
    activo.ponerEnUso(plan.datos);
    await repositorio.guardar(activo);
    await tramos.agregarVarios({ empresaId: operador.empresaId, activoId, tramos: plan.tramos });
  }
}
