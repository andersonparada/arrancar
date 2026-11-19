import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  UnidadDeTrabajoEnMemoria,
  RelojFijo,
  operadorDePrueba,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { CerrarMes } from '../aplicacion/casos-uso/depreciacion/cerrar-mes.js';
import type { DependenciasDeCierre } from '../aplicacion/casos-uso/depreciacion/dependencias-de-cierre.js';
import { ListarCierres } from '../aplicacion/casos-uso/depreciacion/listar-cierres.js';
import { ReabrirMes } from '../aplicacion/casos-uso/depreciacion/reabrir-mes.js';
import { RevisarCierre } from '../aplicacion/casos-uso/depreciacion/revisar-cierre.js';
import type { ActivoParaCerrar } from '../dominio/depreciacion/cierre-del-mes.js';
import { tramosDeInicioDeUso } from '../dominio/depreciacion/inicio-de-uso.js';
import { PrimerMesFijo } from './dobles-de-uso.js';
import { BandejaFija, CargaInicialFija, CierresEnMemoria, MesesDeConstruccionFijos } from './dobles-de-cierre.js';

export const operador = operadorDePrueba();

/** Una pick-up (§7.5): Q250,000.00, 60 meses con residual de Q25,000.00, fiscal 20 %, en uso desde `fechaDeUso`. */
export function pickUp(
  activoId: string,
  fechaDeUso = '2027-03-10',
): Omit<ActivoParaCerrar, 'depreciadoPorTramo' | 'acumuladaCentavos'> {
  const { contable, fiscal } = tramosDeInicioDeUso({
    fechaDeInicioDeUso: fechaDeUso,
    primerMes: 'mes_de_inicio',
    costoCentavos: 25000000,
    baseFiscalCentavos: 25000000,
    porcentajeFiscal: '20.00',
    vidaUtilContableMeses: 60,
    valorResidualCentavos: 2500000,
  });
  return {
    activoId,
    codigo: `AF-${activoId}`,
    claseId: 'vehiculos',
    incisoFiscal: 'maquinaria_y_vehiculos',
    localidadId: null,
    departamentoId: null,
    ocioso: false,
    tramos: [
      { ...contable, id: `${activoId}-contable` },
      { ...fiscal, id: `${activoId}-fiscal` },
    ],
  };
}

/** El cierre de depreciación con todo en memoria. */
export function armarCierre() {
  const memoria = new CierresEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  const publicador = new PublicadorEventosEnMemoria();
  const carga = new CargaInicialFija();
  const bandeja = new BandejaFija();
  const reloj = new RelojFijo('2027-12-31');
  const dependencias: DependenciasDeCierre = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    auditoria,
    reloj,
    publicadorEventos: publicador,
    cierres: memoria,
    repositorioCierres: memoria,
    consultas: memoria,
    bandeja,
    cargaInicial: carga,
    primerMes: new PrimerMesFijo(),
    mesesDeConstruccion: new MesesDeConstruccionFijos(),
  };
  const revisar = new RevisarCierre(dependencias);
  const cerrar = new CerrarMes(dependencias);
  const reabrir = new ReabrirMes(dependencias);
  return {
    memoria,
    reloj,
    auditoria,
    publicador,
    carga,
    bandeja,
    revisar,
    cerrar,
    reabrir,
    listar: new ListarCierres(dependencias),
    cerrarMes: (periodo: string, huella?: string) => cerrar.ejecutar(operador, { periodo, huella }),
    reabrirMes: (periodo: string, motivo = 'Se corrige un costo') => reabrir.ejecutar(operador, { periodo, motivo }),
    revisarMes: (periodo: string) => revisar.ejecutar(operador, periodo),
  };
}

export type EscenarioDeCierre = ReturnType<typeof armarCierre>;
