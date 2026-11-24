import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { Activo } from '../../../dominio/activo.js';
import { Baja } from '../../../dominio/baja.js';
import { BajaParcialNoDisponible } from '../../../dominio/errores-de-baja.js';
import { FechaAnteriorAlUltimoTraslado } from '../../../dominio/errores-de-traslado.js';
import type { CifrasDeBaja, NumeroDeActa } from '../../../dominio/tipos-de-baja.js';
import type { BajaDto, SolicitudDeBaja } from '../../dto/baja.dto.js';
import { exigirMesAbierto, IncisosDeClases } from '../traslados/dependencias-de-traslados.js';
import { cifrasDelActivo } from './cifras-del-activo.js';
import { costosParaRepartir, datosDeBajaDe, datosDelActivo, ventasPorActivo } from './datos-de-baja.js';
import { CORRELATIVO_DE_BAJAS, type DependenciasDeBajas } from './dependencias-de-bajas.js';
import { eventoDeBaja } from './eventos-de-bajas.js';

/** Lo que se calcula de cada activo antes de armar su baja. */
interface ActivoConCifras {
  activo: Activo;
  cifras: CifrasDeBaja;
}

/**
 * El camino común de dar de baja y de vender: bloquea el activo y sus componentes, congela lo que valían al día de la
 * baja y los da de baja con una sola acta numerada, todo en una transacción (§6.8).
 */
export class RegistradorDeBajas {
  constructor(private readonly dependencias: DependenciasDeBajas) {}

  async ejecutar(operador: Operador, solicitud: SolicitudDeBaja): Promise<BajaDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { baja, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.registrar(operador, solicitud));
    await publicadorEventos.publicar(eventos);
    return baja;
  }

  private async registrar(operador: Operador, solicitud: SolicitudDeBaja) {
    const { cierres, correlativos, reloj } = this.dependencias;
    await cierres.bloquear('compartido');
    await exigirMesAbierto(cierres, solicitud.fecha);
    const activos = await this.cargarActivos(solicitud);
    const { numero, anio } = await correlativos.siguiente(CORRELATIVO_DE_BAJAS, solicitud.fecha);
    const acta = { numero, anioDeNumero: anio };
    const hoy = await reloj.hoy(operador);
    const calculados = await this.calcular(operador, { activos, solicitud });
    const bajas = await this.darDeBaja(calculados, { solicitud, acta, hoy });
    const baja = await this.dependencias.consultasDeBajas.obtener(bajas[0]!.id.valor);
    return { baja, eventos: await this.eventosDe(calculados, bajas) };
  }

  /** El activo pedido y sus componentes vigentes, bloqueados; el principal primero. */
  private async cargarActivos({ activoId, cantidad }: SolicitudDeBaja): Promise<Activo[]> {
    const { repositorio } = this.dependencias;
    const [principal] = await repositorio.buscarBloqueando([activoId]);
    if (!principal) throw new RecursoNoEncontrado('El activo');
    const { codigo, cantidad: delActivo } = principal.instantanea();
    if (cantidad !== undefined && cantidad !== delActivo) throw new BajaParcialNoDisponible(codigo);
    return [principal, ...(await repositorio.componentesDe([activoId]))];
  }

  private async calcular(operador: Operador, pedido: { activos: Activo[]; solicitud: SolicitudDeBaja }) {
    const { traslados, primerMes } = this.dependencias;
    const regla = await primerMes.paraEmpresa(operador);
    const { fecha } = pedido.solicitud;
    const calculados: ActivoConCifras[] = [];
    for (const activo of pedido.activos) {
      const [ultimo] = await traslados.recientesDeActivo(activo.id.valor, 1);
      if (ultimo && fecha < ultimo.fecha)
        throw new FechaAnteriorAlUltimoTraslado(activo.instantanea().codigo, ultimo.fecha);
      activo.exigirPuedeDarseDeBaja();
      calculados.push({
        activo,
        cifras: await cifrasDelActivo(this.dependencias, { activo, fecha, primerMes: regla }),
      });
    }
    return calculados;
  }

  private async darDeBaja(
    calculados: readonly ActivoConCifras[],
    contexto: { solicitud: SolicitudDeBaja; acta: NumeroDeActa; hoy: string },
  ): Promise<Baja[]> {
    const { repositorio, bajas } = this.dependencias;
    const nuevas = this.registrarTodas(calculados, contexto);
    for (const { activo } of calculados) {
      activo.darDeBaja(contexto.solicitud.fecha);
      await repositorio.guardar(activo);
    }
    await bajas.agregarVarios(nuevas);
    return nuevas;
  }

  /** Una baja por activo: la venta se reparte solo entre los que llevan libros y cada uno valida lo suyo. */
  private registrarTodas(
    calculados: readonly ActivoConCifras[],
    contexto: { solicitud: SolicitudDeBaja; acta: NumeroDeActa; hoy: string },
  ): Baja[] {
    const datos = datosDeBajaDe(contexto.solicitud);
    const partes = calculados.map(({ activo, cifras }) => ({
      tipoDeRegistro: activo.instantanea().tipoDeRegistro,
      costoCentavos: cifras.costoCentavos,
    }));
    const ventas = ventasPorActivo(datos.venta, costosParaRepartir(partes));
    return calculados.map(({ activo, cifras }, i) => {
      const { id, empresaId, codigo, tipoDeRegistro, fechaDeInicioDeUso } = activo.instantanea();
      const entrada = { empresaId, activoId: id.valor, cifras, ...contexto.acta };
      const alContexto = { codigoDelActivo: codigo, tipoDeRegistro, fechaDeInicioDeUso, hoy: contexto.hoy };
      const parte = { tipoDeRegistro, venta: ventas[i]!, enConjunto: calculados.length > 1 };
      return Baja.registrar(entrada, datosDelActivo(datos, parte), alContexto);
    });
  }

  private async eventosDe(calculados: readonly ActivoConCifras[], bajas: readonly Baja[]): Promise<EventoDominio[]> {
    const incisos = new IncisosDeClases(this.dependencias.clases);
    const eventos: EventoDominio[] = [];
    for (const [i, { activo }] of calculados.entries())
      eventos.push(
        eventoDeBaja({ activo, baja: bajas[i]!, incisoFiscal: await incisos.de(activo.instantanea().claseId) }),
      );
    return eventos;
  }
}
