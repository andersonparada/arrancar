import { ZONA_HORARIA_POR_OMISION } from '../../../../core/compartido/dominio/fecha-local.js';
import type { Arqueo } from '../../../dominio/arqueos.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import type { SeparacionDeFuncionesConfigurada } from '../../../dominio/reglas-de-reposiciones.js';
import type {
  AjusteDeArqueoNuevo,
  AnulacionDelArqueo,
  ArqueoNuevo,
  ComprobantesDelArqueo,
  ConsultasDeArqueos,
  RepositorioDeArqueos,
} from '../../puertos/puertos-de-arqueos.js';
import type { AnulacionDelComprobante } from '../../puertos/puertos-de-comprobantes.js';
import { HOY, type ComprobantesEnMemoria } from '../comprobantes/dobles-de-comprobantes.soporte.js';
import { armarEscenarioDeReposiciones } from '../reposiciones/dobles-de-reposiciones.soporte.js';
import type { DependenciasDeArqueos } from './dependencias-de-arqueos.js';

/** Los arqueos en memoria. */
export class ArqueosEnMemoria implements RepositorioDeArqueos {
  readonly filas = new Map<string, Arqueo>();

  async agregar({ realizadoEn, ...nuevo }: ArqueoNuevo): Promise<void> {
    this.filas.set(nuevo.id, {
      ...nuevo,
      realizadoEn: realizadoEn.toISOString(),
      estado: 'vigente',
      fechaDeAnulacion: null,
      motivoDeAnulacion: null,
    });
  }

  async buscar(id: string) {
    return this.filas.get(id) ?? null;
  }

  bloquear(id: string) {
    return this.buscar(id);
  }

  async anular(id: string, anulacion: AnulacionDelArqueo): Promise<void> {
    this.filas.set(id, {
      ...this.filas.get(id)!,
      estado: 'anulado',
      fechaDeAnulacion: anulacion.fechaDeAnulacion,
      motivoDeAnulacion: anulacion.motivo,
    });
  }
}

/** El faltante o sobrante del arqueo, guardado entre los comprobantes del escenario. */
export class AjustesEnMemoria implements ComprobantesDelArqueo {
  private readonly porArqueo = new Map<string, string>();

  constructor(private readonly comprobantes: ComprobantesEnMemoria) {}

  async agregar(nuevo: AjusteDeArqueoNuevo): Promise<string> {
    const id = `ajuste-${this.comprobantes.filas.size + 1}`;
    const base = await this.comprobantes.agregarVale({
      fondoId: nuevo.fondoId,
      fecha: nuevo.fecha,
      montoCentavos: nuevo.montoCentavos,
      descripcion: nuevo.descripcion,
      pagadoA: '',
      conceptoDeGastoId: '',
      motivoSinDocumento: '',
      motivoSobreElTope: null,
      numero: 1,
      anioDeNumero: 0,
      asignadoPor: nuevo.asignadoPor,
    });
    const fila = this.comprobantes.filas.get(base)!;
    this.comprobantes.filas.delete(base);
    this.comprobantes.filas.set(id, {
      ...fila,
      id,
      clase: nuevo.clase,
      resta: nuevo.clase === 'sobrante',
      numero: null,
      pagadoA: null,
      conceptoDeGastoId: null,
      motivoSinDocumento: null,
      destinoDelFaltante: nuevo.destinoDelFaltante,
    });
    this.porArqueo.set(nuevo.arqueoId, id);
    return id;
  }

  async delArqueo(arqueoId: string): Promise<Comprobante | null> {
    return this.comprobantes.filas.get(this.porArqueo.get(arqueoId) ?? '') ?? null;
  }

  bloquearDelArqueo(arqueoId: string) {
    return this.delArqueo(arqueoId);
  }

  async anular(id: string, anulacion: AnulacionDelComprobante): Promise<void> {
    await this.comprobantes.anular(id, anulacion);
  }
}

/** Un fondo abierto con Q10,000.00 cuyo custodio es el usuario `custodioUsuarioId` (nadie, por omisión). */
export async function armarEscenarioDeArqueos(custodioUsuarioId: string | null = null) {
  const base = await armarEscenarioDeReposiciones(custodioUsuarioId);
  const arqueos = new ArqueosEnMemoria();
  const ajustes = new AjustesEnMemoria(base.comprobantes);
  const valores = { dias: 30, ahora: new Date('2026-11-18T20:00:00Z') };
  const consultas: ConsultasDeArqueos = {
    delFondo: async (fondoId) => [...arqueos.filas.values()].filter((a) => a.fondoId === fondoId),
    pendientesDelFondo: async (fondoId) => base.dependenciasDeReposiciones.consultas.pendientesDelFondo(fondoId),
  };
  const dependenciasDeArqueos: DependenciasDeArqueos = {
    unidadDeTrabajo: base.dependencias.unidadDeTrabajo,
    fondos: base.fondos,
    consultasDeFondos: base.dependencias.consultasDeFondos,
    arqueos,
    consultas,
    comprobantes: ajustes,
    configuracion: {
      separacionDeFunciones: async () => base.control.separacion as SeparacionDeFuncionesConfigurada,
      diasParaAvisar: async () => valores.dias,
    },
    correlativos: base.dependencias.correlativos,
    auditoria: base.auditoria,
    publicadorEventos: base.publicador,
    reloj: base.dependencias.reloj,
    zonaHoraria: { zonaHoraria: async () => ZONA_HORARIA_POR_OMISION },
    ahora: () => valores.ahora,
  };
  return { ...base, dependenciasDeArqueos, arqueos, valores };
}

/** Un conteo de `cantidad` billetes de Q100. */
export const cienesDeQuetzal = (cantidad: number) => [{ denominacionCentavos: 10_000, cantidad }];

export { HOY };
