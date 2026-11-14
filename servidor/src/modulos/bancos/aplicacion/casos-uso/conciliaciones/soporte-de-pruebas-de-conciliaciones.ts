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
import { DocumentosEnMemoria, PoliticaDeEstadoDeCuentaFija } from '../../../pruebas/dobles-de-estado-de-cuenta.js';
import {
  MovimientosEnMemoria,
  PoliticaDeMismaFechaFija,
  PoliticaDeSobregiroFija,
} from '../../../pruebas/dobles-de-movimientos.js';
import {
  CONCEPTO_GENERAL,
  conceptosDeMovimientosDe,
  conceptosSembrados,
} from '../../../pruebas/conceptos-de-prueba.js';
import { CuentasPorPagarFijo } from '../../../pruebas/dobles-de-cheques.js';
import { piezasDeOrigenEnMemoria } from '../../../pruebas/dobles-de-origen.js';
import { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import { AnularMovimiento } from '../movimientos/anular-movimiento.js';
import { CrearMovimiento } from '../movimientos/crear-movimiento.js';
import { AbrirEstadoDeCuenta } from './abrir-estado-de-cuenta.js';
import { AutorizarConciliacion } from './autorizar-conciliacion.js';
import { DevolverConciliacion } from './devolver-conciliacion.js';
import { EliminarConciliacion } from './eliminar-conciliacion.js';
import { IniciarConciliacion } from './iniciar-conciliacion.js';
import { ListarConciliaciones } from './listar-conciliaciones.js';
import { MarcarMovimientos } from './marcar-movimientos.js';
import { ObtenerConciliacion } from './obtener-conciliacion.js';
import { QuitarEstadoDeCuenta } from './quitar-estado-de-cuenta.js';
import { SubirEstadoDeCuenta } from './subir-estado-de-cuenta.js';
import { TerminarConciliacion } from './terminar-conciliacion.js';
import { TranscribirSaldo } from './transcribir-saldo.js';

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

function dependenciasComunes(auditoria: AuditoriaEnMemoria) {
  return {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    auditoria,
    reloj: new RelojFijo(),
    conceptos: conceptosDeMovimientosDe(conceptosSembrados()),
  };
}

interface DoblesDePrueba {
  movimientos: MovimientosEnMemoria;
  conciliaciones: ConciliacionesEnMemoria;
  auditoria: AuditoriaEnMemoria;
  documentos: DocumentosEnMemoria;
  politicaDeEstadoDeCuenta: PoliticaDeEstadoDeCuentaFija;
}

function dependenciasDePrueba(dobles: DoblesDePrueba) {
  const { movimientos, conciliaciones, auditoria, documentos, politicaDeEstadoDeCuenta } = dobles;
  const reglas = new ReglasDeLaCuenta({ consultas: movimientos, politicaDeSobregiro: SIN_SOBREGIRO });
  const comunes = dependenciasComunes(auditoria);
  const deConciliaciones = {
    ...comunes,
    repositorio: conciliaciones,
    consultas: conciliaciones,
    consultasMovimientos: movimientos,
    documentos,
    politicaDeEstadoDeCuenta,
  };
  const deMovimientos = {
    ...comunes,
    repositorio: movimientos,
    consultas: movimientos,
    reglas,
    correlativos: new CorrelativosEnMemoria(),
    politicaDeMismaFecha: new PoliticaDeMismaFechaFija(),
    ...piezasDeOrigenEnMemoria(comunes.conceptos, new CuentasPorPagarFijo(false)),
  };
  return { deConciliaciones, deMovimientos };
}

function casosDeConciliaciones(deConciliaciones: ReturnType<typeof dependenciasDePrueba>['deConciliaciones']) {
  return {
    iniciar: new IniciarConciliacion(deConciliaciones),
    obtener: new ObtenerConciliacion(deConciliaciones),
    listar: new ListarConciliaciones(deConciliaciones),
    marcar: new MarcarMovimientos(deConciliaciones),
    transcribirSaldo: new TranscribirSaldo(deConciliaciones),
    subirEstadoDeCuenta: new SubirEstadoDeCuenta(deConciliaciones),
    quitarEstadoDeCuenta: new QuitarEstadoDeCuenta(deConciliaciones),
    abrirEstadoDeCuenta: new AbrirEstadoDeCuenta(deConciliaciones),
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
  const documentos = new DocumentosEnMemoria();
  conciliaciones.documentos = documentos;
  const politicaDeEstadoDeCuenta = new PoliticaDeEstadoDeCuentaFija(false);
  const { deConciliaciones, deMovimientos } = dependenciasDePrueba({
    movimientos,
    conciliaciones,
    auditoria,
    documentos,
    politicaDeEstadoDeCuenta,
  });

  const casos = {
    ...casosDeConciliaciones(deConciliaciones),
    crearMovimiento: new CrearMovimiento(deMovimientos),
    anularMovimiento: new AnularMovimiento(deMovimientos),
  };
  return { casos, movimientos, conciliaciones, auditoria, documentos, politicaDeEstadoDeCuenta };
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
    conceptoId: CONCEPTO_GENERAL,
  });
  await movimientos.agregar(movimiento);
  return movimiento.id.valor;
}

/** Transcribe el saldo que calculan las marcas (el que muestra el estado de cuenta) y termina la conciliación. */
export async function terminarConSaldo(
  casos: ReturnType<typeof casosDeUsoDeConciliaciones>['casos'],
  quien: typeof operador,
  conciliacionId: string,
) {
  const { saldoQueDebeMostrarElEstadoDeCuenta } = await casos.obtener.ejecutar(quien, conciliacionId);
  await casos.transcribirSaldo.ejecutar(quien, { conciliacionId, saldo: saldoQueDebeMostrarElEstadoDeCuenta });
  return casos.terminar.ejecutar(quien, conciliacionId);
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
  await terminarConSaldo(casos, operador, iniciada.id);
  await casos.autorizar.ejecutar(otroOperador, iniciada.id);
  movimientos.fechaConciliadaHasta = `2026-${String(mes).padStart(2, '0')}-${mes === 2 ? '28' : '31'}`;
  return iniciada.id;
}
