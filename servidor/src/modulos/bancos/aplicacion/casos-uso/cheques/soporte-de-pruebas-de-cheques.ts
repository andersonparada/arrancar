import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import { ChequerasEnMemoria } from '../../../pruebas/dobles-de-chequeras.js';
import { ChequesEnMemoria, CuentasPorPagarFijo, LimiteDeChequeraFijo } from '../../../pruebas/dobles-de-cheques.js';
import {
  MovimientosEnMemoria,
  PoliticaDeMismaFechaFija,
  PoliticaDeSobregiroFija,
} from '../../../pruebas/dobles-de-movimientos.js';
import {
  CONCEPTO_GENERAL,
  CONCEPTO_SALDO_INICIAL,
  conceptosDeMovimientosDe,
  conceptosSembrados,
} from '../../../pruebas/conceptos-de-prueba.js';
import { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import { CrearChequera } from '../chequeras/crear-chequera.js';
import { ActualizarMovimiento } from '../movimientos/actualizar-movimiento.js';
import { AnularMovimiento } from '../movimientos/anular-movimiento.js';
import { AnularCheque } from './anular-cheque.js';
import { BlanquearCheque } from './blanquear-cheque.js';
import { EmitirCheque } from './emitir-cheque.js';
import { ListarChequesDeLaEmpresa } from './listar-cheques-de-la-empresa.js';
import { SiguienteChequeDisponible } from './siguiente-cheque-disponible.js';

export const operador = operadorDePrueba();
export const CUENTA = '00000000-0000-4000-8000-000000000001';

/** El origen arranca con saldo, como en la vida real, para poder debitarlo. */
async function conSaldoInicial(movimientos: MovimientosEnMemoria): Promise<void> {
  const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
  await movimientos.agregar(
    Movimiento.crear(empresaId, {
      cuentaBancariaId: CUENTA,
      tipo: 'credito',
      fecha: '2026-01-01',
      monto: '1000.00',
      saldoInicial: true,
      referencia: null,
      beneficiario: null,
      observaciones: null,
      conceptoId: CONCEPTO_SALDO_INICIAL,
    }),
  );
}

interface OpcionesDelEntorno {
  permiteSobregiro: boolean;
  reloj: Reloj;
  /** Si el módulo Cuentas por pagar está activo en la cuenta de la prueba (P3). */
  cuentasPorPagarActivo: boolean;
}

interface Dobles {
  movimientos: MovimientosEnMemoria;
  cheques: ChequesEnMemoria;
  chequeras: ChequerasEnMemoria;
  auditoria: AuditoriaEnMemoria;
}

async function armarDobles(): Promise<Dobles> {
  const movimientos = new MovimientosEnMemoria();
  await conSaldoInicial(movimientos);
  const cheques = new ChequesEnMemoria();
  const chequeras = new ChequerasEnMemoria(cheques);
  cheques.vincularChequeras(chequeras);
  cheques.vincularMovimientos(movimientos);
  chequeras.nombrarCuenta(CUENTA, 'Cuenta de prueba');
  return { movimientos, cheques, chequeras, auditoria: new AuditoriaEnMemoria() };
}

function dependenciasDeChequeras(
  { movimientos, cheques, chequeras, auditoria }: Dobles,
  unidadDeTrabajo: UnidadDeTrabajo,
) {
  return {
    unidadDeTrabajo,
    repositorio: chequeras,
    repositorioCheques: cheques,
    consultas: chequeras,
    consultasMovimientos: movimientos,
    limiteDeChequera: new LimiteDeChequeraFijo(5000),
    auditoria,
  };
}

/** Lo que cambia según la prueba y arma las dependencias de los cheques. */
interface EntornoDeCheques {
  unidadDeTrabajo: UnidadDeTrabajo;
  reglas: ReglasDeLaCuenta;
  reloj: Reloj;
  cuentasPorPagarActivo: boolean;
}

function dependenciasDeCheques(
  { movimientos, cheques, chequeras, auditoria }: Dobles,
  { unidadDeTrabajo, reglas, reloj, cuentasPorPagarActivo }: EntornoDeCheques,
) {
  return {
    unidadDeTrabajo,
    repositorio: cheques,
    repositorioChequeras: chequeras,
    repositorioMovimientos: movimientos,
    consultas: cheques,
    consultasMovimientos: movimientos,
    reglas,
    auditoria,
    correlativos: new CorrelativosEnMemoria(),
    reloj,
    cuentasPorPagar: new CuentasPorPagarFijo(cuentasPorPagarActivo),
    conceptos: conceptosDeMovimientosDe(conceptosSembrados()),
  };
}

function dependenciasDeMovimientos(
  { movimientos, auditoria }: Dobles,
  { unidadDeTrabajo, reglas, reloj }: { unidadDeTrabajo: UnidadDeTrabajo; reglas: ReglasDeLaCuenta; reloj: Reloj },
) {
  return {
    unidadDeTrabajo,
    repositorio: movimientos,
    consultas: movimientos,
    reglas,
    auditoria,
    correlativos: new CorrelativosEnMemoria(),
    reloj,
    conceptos: conceptosDeMovimientosDe(conceptosSembrados()),
    politicaDeMismaFecha: new PoliticaDeMismaFechaFija(),
  };
}

function dependenciasDe(dobles: Dobles, { permiteSobregiro, reloj, cuentasPorPagarActivo }: OpcionesDelEntorno) {
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  const politicaDeSobregiro = new PoliticaDeSobregiroFija(permiteSobregiro);
  const reglas = new ReglasDeLaCuenta({ consultas: dobles.movimientos, politicaDeSobregiro });
  return {
    deChequeras: dependenciasDeChequeras(dobles, unidadDeTrabajo),
    deCheques: dependenciasDeCheques(dobles, { unidadDeTrabajo, reglas, reloj, cuentasPorPagarActivo }),
    deMovimientos: dependenciasDeMovimientos(dobles, { unidadDeTrabajo, reglas, reloj }),
  };
}

/** Todo lo que las pruebas de cheques necesitan: los casos de uso y los dobles con que se armaron. */
export async function armarEntorno(opciones: Partial<OpcionesDelEntorno> = {}) {
  const dobles = await armarDobles();
  const { permiteSobregiro = false, reloj = new RelojFijo(), cuentasPorPagarActivo = false } = opciones;
  const { deChequeras, deCheques, deMovimientos } = dependenciasDe(dobles, {
    permiteSobregiro,
    reloj,
    cuentasPorPagarActivo,
  });
  const datosDeChequera = { cuentaBancariaId: CUENTA, serie: null, desde: 1, hasta: 5 };
  const chequera = await new CrearChequera(deChequeras).ejecutar(operador, datosDeChequera);
  const primerCheque = (await dobles.cheques.listarDeLaChequera(chequera.id))[0]!;
  return {
    ...dobles,
    chequeraId: chequera.id,
    chequeId: primerCheque.id,
    emitir: new EmitirCheque(deCheques),
    anular: new AnularCheque(deCheques),
    blanquear: new BlanquearCheque(deCheques),
    siguiente: new SiguienteChequeDisponible(deCheques),
    listar: new ListarChequesDeLaEmpresa(deCheques),
    actualizarMovimiento: new ActualizarMovimiento(deMovimientos),
    anularMovimiento: new AnularMovimiento(deMovimientos),
  };
}

/** Los datos de emitir un cheque, con lo que se quiera cambiar. */
export const emisionDe = (chequeId: string, cambios: Record<string, unknown> = {}) => ({
  chequeId,
  fecha: '2026-02-01',
  monto: '100.00',
  beneficiario: 'Proveedor S.A.',
  noNegociable: true,
  conceptoId: CONCEPTO_GENERAL,
  referencia: null,
  observaciones: null,
  ...cambios,
});
