import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import { ConciliacionesEnMemoria } from '../../../pruebas/dobles-de-conciliaciones.js';
import {
  MovimientosEnMemoria,
  PoliticaDeMismaFechaFija,
  PoliticaDeSobregiroFija,
} from '../../../pruebas/dobles-de-movimientos.js';
import { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import { AnularMovimiento } from '../movimientos/anular-movimiento.js';
import { CrearMovimiento } from '../movimientos/crear-movimiento.js';
import { AutorizarConciliacion } from './autorizar-conciliacion.js';
import { DevolverConciliacion } from './devolver-conciliacion.js';
import { EliminarConciliacion } from './eliminar-conciliacion.js';
import { IniciarConciliacion } from './iniciar-conciliacion.js';
import { ListarConciliaciones } from './listar-conciliaciones.js';
import { MarcarMovimientos } from './marcar-movimientos.js';
import { ObtenerConciliacion } from './obtener-conciliacion.js';
import { TerminarConciliacion } from './terminar-conciliacion.js';

export const operador = operadorDePrueba();
/** Otra persona de la misma empresa: la que autoriza (no puede ser quien elaboró). */
export const otroOperador = operadorDePrueba({ empresaId: operador.empresaId, cuentaId: operador.cuentaId });
export const CUENTA = '00000000-0000-4000-8000-000000000001';
const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);

export const inicio = (cambios: Record<string, unknown> = {}) => ({
  cuentaBancariaId: CUENTA,
  anio: 2026,
  mes: 1,
  ...cambios,
});

export const marcarSaldoInicial = (candidatos: { id: string; saldoInicial: boolean }[]) => [
  candidatos.find((m) => m.saldoInicial)!.id,
];

const SIN_SOBREGIRO = new PoliticaDeSobregiroFija(false);

function dependenciasDePrueba(
  movimientos: MovimientosEnMemoria,
  conciliaciones: ConciliacionesEnMemoria,
  auditoria: AuditoriaEnMemoria,
) {
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  const reglas = new ReglasDeLaCuenta({ consultas: movimientos, politicaDeSobregiro: SIN_SOBREGIRO });
  const comunes = { unidadDeTrabajo, auditoria, reloj: new RelojFijo() };
  const deConciliaciones = {
    ...comunes,
    repositorio: conciliaciones,
    consultas: conciliaciones,
    consultasMovimientos: movimientos,
  };
  const deMovimientos = {
    ...comunes,
    repositorio: movimientos,
    consultas: movimientos,
    reglas,
    correlativos: new CorrelativosEnMemoria(),
    politicaDeMismaFecha: new PoliticaDeMismaFechaFija(),
  };
  return { deConciliaciones, deMovimientos };
}

function casosDeConciliaciones(deConciliaciones: ReturnType<typeof dependenciasDePrueba>['deConciliaciones']) {
  return {
    iniciar: new IniciarConciliacion(deConciliaciones),
    obtener: new ObtenerConciliacion(deConciliaciones),
    listar: new ListarConciliaciones(deConciliaciones),
    marcar: new MarcarMovimientos(deConciliaciones),
    terminar: new TerminarConciliacion(deConciliaciones),
    autorizar: new AutorizarConciliacion(deConciliaciones),
    devolver: new DevolverConciliacion(deConciliaciones),
    eliminar: new EliminarConciliacion(deConciliaciones),
  };
}

/** Arma los casos de uso de conciliaciones sobre dobles en memoria frescos. */
export function casosDeUsoDeConciliaciones() {
  const movimientos = new MovimientosEnMemoria();
  const conciliaciones = new ConciliacionesEnMemoria();
  conciliaciones.vincularMovimientos(movimientos);
  const auditoria = new AuditoriaEnMemoria();
  const { deConciliaciones, deMovimientos } = dependenciasDePrueba(movimientos, conciliaciones, auditoria);

  const casos = {
    ...casosDeConciliaciones(deConciliaciones),
    crearMovimiento: new CrearMovimiento(deMovimientos),
    anularMovimiento: new AnularMovimiento(deMovimientos),
  };
  return { casos, movimientos, conciliaciones, auditoria };
}

export async function agregarMovimiento(
  movimientos: MovimientosEnMemoria,
  datos: {
    fecha: string;
    monto: string;
    tipo?: 'credito' | 'debito' | 'cheque';
    saldoInicial?: boolean;
    beneficiario?: string | null;
  },
): Promise<string> {
  const movimiento = Movimiento.crear(empresaId, {
    cuentaBancariaId: CUENTA,
    tipo: datos.tipo ?? 'credito',
    fecha: datos.fecha,
    monto: datos.monto,
    saldoInicial: datos.saldoInicial ?? false,
    referencia: null,
    beneficiario: datos.beneficiario ?? null,
    observaciones: null,
  });
  await movimientos.agregar(movimiento);
  return movimiento.id.valor;
}

/**
 * Inicia, marca (lo que elija `elegirMarcas` entre los candidatos), termina y
 * autoriza (con otro usuario) el mes dado; deja la cuenta conciliada hasta su
 * fin de mes. Sin `elegirMarcas`, no marca nada.
 */
export async function conciliarYAutorizar(
  entorno: ReturnType<typeof casosDeUsoDeConciliaciones>,
  mes: number,
  elegirMarcas: (candidatos: { id: string; saldoInicial: boolean }[]) => string[] = () => [],
): Promise<string> {
  const { casos, movimientos } = entorno;
  const iniciada = await casos.iniciar.ejecutar(operador, inicio({ mes }));
  const idsAMarcar = elegirMarcas(iniciada.candidatos);
  await casos.marcar.ejecutar(operador, { conciliacionId: iniciada.id, movimientoIds: idsAMarcar });
  await casos.terminar.ejecutar(operador, iniciada.id);
  await casos.autorizar.ejecutar(otroOperador, iniciada.id);
  movimientos.fechaConciliadaHasta = `2026-${String(mes).padStart(2, '0')}-${mes === 2 ? '28' : '31'}`;
  return iniciada.id;
}
