import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { ArmadorDelCierre } from '../aplicacion/casos-uso/cierres/armador-del-cierre.js';
import { CerrarMes } from '../aplicacion/casos-uso/cierres/cerrar-mes.js';
import type { DependenciasDeCierres } from '../aplicacion/casos-uso/cierres/dependencias-de-cierres.js';
import { ListarCierres } from '../aplicacion/casos-uso/cierres/listar-cierres.js';
import { ListarExistenciasAlCierre } from '../aplicacion/casos-uso/cierres/listar-existencias-al-cierre.js';
import { ReabrirMes } from '../aplicacion/casos-uso/cierres/reabrir-mes.js';
import { RevisarCierre } from '../aplicacion/casos-uso/cierres/revisar-cierre.js';
import type { VistaDelKardex } from '../aplicacion/dto/documento.dto.js';
import type { ConsultasDeCierre, HallazgosDeLaBase } from '../aplicacion/puertos/consultas-de-cierre.js';
import type { FiltrosDePorRecibir } from '../aplicacion/dto/por-recibir.dto.js';
import type { ConsultasPorRecibir } from '../aplicacion/puertos/consultas-por-recibir.js';
import type { PreguntasDelCierre } from '../aplicacion/puertos/preguntas-del-cierre.js';
import type {
  CierreNuevo,
  ExistenciaAlCierreGuardada,
  Reapertura,
  RepositorioDeCierres,
} from '../aplicacion/puertos/repositorio-de-cierres.js';
import type { RepositorioDeMetodos } from '../aplicacion/puertos/repositorio-de-metodos.js';
import type { CierreGuardado } from '../dominio/cierre/cierre-guardado.js';
import type { ArticuloAlCorte, RenglonDelCierre, TotalesDelCierre } from '../dominio/cierre/existencias-del-cierre.js';
import type { Hallazgo } from '../dominio/cierre/hallazgos-del-cierre.js';
import { deCentavosEnteros, deDiezmilesimas, deMillonesimas } from '../dominio/decimales.js';
import { CargaInicialFija, MetodoInicialFijo } from './dobles-del-entorno.js';

/** Un renglón de la foto como lo leería la pantalla: con los nombres que se muestran. */
function filaDeFoto(r: RenglonDelCierre): ExistenciaAlCierreGuardada {
  return {
    articuloId: r.articuloId,
    articuloCodigo: r.articuloId,
    articuloNombre: r.articuloId,
    bodegaId: r.bodegaId,
    bodegaNombre: r.bodegaId,
    tipoDeInventario: r.tipoDeInventario,
    enTransitoInterno: r.enTransitoInterno,
    cantidad: deDiezmilesimas(r.cantidad),
    costoUnitario: deMillonesimas(r.costoUnitario),
    valor: deCentavosEnteros(r.valor),
  };
}

/** Los cierres y sus fotos en memoria; cuenta cuántas veces se tomó el candado exclusivo. */
export class CierresEnMemoria implements RepositorioDeCierres {
  readonly cierres = new Map<string, CierreGuardado>();
  readonly fotos: { periodo: string; vigente: boolean; fila: ExistenciaAlCierreGuardada }[] = [];
  candados = 0;

  async bloquear() {
    this.candados += 1;
  }

  async ultimoMesCerrado() {
    const cerrados = [...this.cierres.values()].filter((c) => c.estado === 'cerrado').map((c) => c.periodo);
    return cerrados.sort().at(-1) ?? null;
  }

  async buscar(periodo: string) {
    return this.cierres.get(periodo) ?? null;
  }

  async listar() {
    return [...this.cierres.values()].sort((a, b) => b.periodo.localeCompare(a.periodo));
  }

  async guardar(nuevo: CierreNuevo) {
    this.cierres.set(nuevo.periodo, {
      periodo: nuevo.periodo,
      estado: 'cerrado',
      cerradoEn: nuevo.ahora,
      cerradoPor: nuevo.cerradoPor,
      reabiertoEn: null,
      reabiertoPor: null,
      motivoDeReapertura: null,
      metodo: nuevo.metodo,
      regimenIsr: nuevo.regimenIsr,
      valorTotal: nuevo.totales.valorTotal,
      articulosConExistencia: nuevo.totales.articulosConExistencia,
    });
    for (const renglon of nuevo.renglones) {
      this.fotos.push({ periodo: nuevo.periodo, vigente: true, fila: filaDeFoto(renglon) });
    }
  }

  async reabrir({ periodo, usuarioId, ahora, motivo }: Reapertura) {
    const anterior = this.cierres.get(periodo)!;
    this.cierres.set(periodo, {
      ...anterior,
      estado: 'reabierto',
      reabiertoEn: ahora,
      reabiertoPor: usuarioId,
      motivoDeReapertura: motivo,
    });
    for (const foto of this.fotos) if (foto.periodo === periodo) foto.vigente = false;
  }

  async existencias(periodo: string) {
    return this.fotos.filter((f) => f.periodo === periodo && f.vigente).map((f) => f.fila);
  }

  async totalesPorTipo(periodo: string): Promise<TotalesDelCierre['porTipo']> {
    const suma = new Map<string, bigint>();
    for (const { fila } of this.fotos.filter((f) => f.periodo === periodo && f.vigente)) {
      const centavos = BigInt(fila.valor.replace('.', ''));
      suma.set(fila.tipoDeInventario, (suma.get(fila.tipoDeInventario) ?? 0n) + centavos);
    }
    return [...suma.entries()].map(([tipoDeInventario, valor]) => ({
      tipoDeInventario: tipoDeInventario as never,
      valor,
    }));
  }
}

/** Lo que la base diría del inventario: la prueba pone los artículos al corte y los hallazgos. */
export class ConsultasDeCierreEnMemoria implements ConsultasDeCierre {
  articulos: ArticuloAlCorte[] = [];
  primerMes: string | null = null;
  base: HallazgosDeLaBase = {
    conSaldosIniciales: false,
    recepcionesDeDocumentosAnulados: { cantidad: 0, referencias: [] },
    trasladosEnTransito: 0,
    lotesVencidos: 0,
  };
  regimen: string | null = null;
  cortes: string[] = [];

  async existenciasAl(fin: string) {
    this.cortes.push(fin);
    return this.articulos;
  }

  async primerMesConMovimientos() {
    return this.primerMes;
  }

  async hallazgosDeLaBase() {
    return this.base;
  }

  async regimenIsr() {
    return this.regimen;
  }
}

class BandejaFija implements ConsultasPorRecibir {
  lineas = 0;
  filtros: FiltrosDePorRecibir[] = [];

  async listar(filtros: FiltrosDePorRecibir) {
    this.filtros.push(filtros);
    return Array.from({ length: this.lineas }, () => ({}) as never);
  }
}

class PreguntasFijas implements PreguntasDelCierre {
  hallazgos: Hallazgo[] = [];

  async hallazgosDeOtrosModulos(_operador: Operador, _periodo: string) {
    return this.hallazgos;
  }
}

class MetodosVacios implements RepositorioDeMetodos {
  async listar() {
    return [];
  }

  async agregar() {}

  async fijar() {}

  async cambiar() {
    return true;
  }

  async bloquearPolitica() {}
}

/** El cierre mensual completo en memoria, con sus casos de uso. */
export class EscenarioDeCierres {
  readonly operador = operadorDePrueba();
  readonly vista: VistaDelKardex = { verCostos: true, veTodasLasBodegas: true };
  readonly repositorio = new CierresEnMemoria();
  readonly consultas = new ConsultasDeCierreEnMemoria();
  readonly bandeja = new BandejaFija();
  readonly preguntas = new PreguntasFijas();
  readonly carga = new CargaInicialFija();
  readonly auditoria = new AuditoriaEnMemoria();
  readonly publicador = new PublicadorEventosEnMemoria();
  readonly reloj = new RelojFijo('2026-11-23');
  readonly dependencias: DependenciasDeCierres = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    auditoria: this.auditoria,
    reloj: this.reloj,
    publicadorEventos: this.publicador,
    cierres: this.repositorio,
    consultas: this.consultas,
    bandeja: this.bandeja,
    preguntas: this.preguntas,
    cargaInicial: this.carga,
    metodos: new MetodosVacios(),
    metodoInicial: new MetodoInicialFijo(),
  };
  readonly armador = new ArmadorDelCierre(this.dependencias);
  readonly listar = new ListarCierres(this.dependencias);
  readonly existencias = new ListarExistenciasAlCierre(this.dependencias);

  revisarMes = (periodo: string, vista = this.vista) =>
    new RevisarCierre(this.dependencias).ejecutar(this.operador, { periodo, vista });

  cerrarMes = (periodo: string, huella?: string, vista = this.vista) =>
    new CerrarMes(this.dependencias).ejecutar(this.operador, { periodo, huella, vista });

  reabrirMes = (periodo: string, motivo = 'Faltó una compra', vista = this.vista) =>
    new ReabrirMes(this.dependencias).ejecutar(this.operador, { periodo, motivo, vista });
}
