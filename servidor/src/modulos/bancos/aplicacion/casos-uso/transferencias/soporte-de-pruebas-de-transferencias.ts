import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import {
  MovimientosEnMemoria,
  PoliticaDeMismaFechaFija,
  PoliticaDeSobregiroFija,
} from '../../../pruebas/dobles-de-movimientos.js';
import { NombresDeCuentaEnMemoria, TransferenciasEnMemoria } from '../../../pruebas/dobles-de-transferencias.js';
import type { SolicitudDeTransferencia } from '../../dto/transferencia.dto.js';
import { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import { ActualizarMovimiento } from '../movimientos/actualizar-movimiento.js';
import { AnularMovimiento } from '../movimientos/anular-movimiento.js';
import { AnularTransferencia } from './anular-transferencia.js';
import { EliminarTransferencia } from './eliminar-transferencia.js';
import { ListarTransferencias } from './listar-transferencias.js';
import { ObtenerTransferencia } from './obtener-transferencia.js';
import { RegistrarTransferencia } from './registrar-transferencia.js';

export const operador = operadorDePrueba();
export const ORIGEN = '00000000-0000-4000-8000-000000000001';
export const DESTINO = '00000000-0000-4000-8000-000000000002';

/** Una transferencia de 100.00 a mitad de enero, con lo que se quiera cambiar. */
export const solicitud = (cambios: Partial<SolicitudDeTransferencia> = {}): SolicitudDeTransferencia => ({
  cuentaOrigenId: ORIGEN,
  cuentaDestinoId: DESTINO,
  fecha: '2026-01-15',
  monto: '100.00',
  referencia: 'Boleta 123',
  observaciones: null,
  ...cambios,
});

/** El origen arranca con saldo, como en la vida real, para poder debitarlo. */
async function conSaldoInicial(destino: MovimientosEnMemoria): Promise<void> {
  const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
  await destino.agregar(
    Movimiento.crear(empresaId, {
      cuentaBancariaId: ORIGEN,
      tipo: 'credito',
      fecha: '2026-01-01',
      monto: '1000.00',
      saldoInicial: true,
      referencia: null,
      beneficiario: null,
      observaciones: null,
    }),
  );
}

interface Base {
  movimientos: MovimientosEnMemoria;
  transferencias: TransferenciasEnMemoria;
  nombres: Map<string, string>;
  auditoria: AuditoriaEnMemoria;
  unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
  correlativos: CorrelativosEnMemoria;
  reglas: ReglasDeLaCuenta;
}

function armarBase(movimientos: MovimientosEnMemoria, permiteSobregiro: boolean): Base {
  const nombres = new Map([
    [ORIGEN, 'Cuenta origen'],
    [DESTINO, 'Cuenta destino'],
  ]);
  const politicaDeSobregiro = new PoliticaDeSobregiroFija(permiteSobregiro);
  return {
    movimientos,
    transferencias: new TransferenciasEnMemoria(movimientos, nombres),
    nombres,
    auditoria: new AuditoriaEnMemoria(),
    correlativos: new CorrelativosEnMemoria(),
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reglas: new ReglasDeLaCuenta({ consultas: movimientos, politicaDeSobregiro }),
  };
}

function dependenciasDeTransferencias({ movimientos, transferencias, nombres, auditoria, ...comunes }: Base) {
  return {
    ...comunes,
    auditoria,
    repositorio: transferencias,
    repositorioMovimientos: movimientos,
    consultas: transferencias,
    consultasMovimientos: movimientos,
    consultasCuentasBancarias: new NombresDeCuentaEnMemoria(nombres),
    politicaDeMismaFecha: new PoliticaDeMismaFechaFija(),
  };
}

function dependenciasDeMovimientos({ movimientos, auditoria, ...comunes }: Base) {
  return {
    ...comunes,
    auditoria,
    repositorio: movimientos,
    consultas: movimientos,
    politicaDeMismaFecha: new PoliticaDeMismaFechaFija(),
  };
}

/** Los casos de uso de transferencias armados con dobles en memoria, y los dobles para preparar y revisar. */
export async function armarEntorno({ permiteSobregiro = false } = {}) {
  const movimientos = new MovimientosEnMemoria();
  await conSaldoInicial(movimientos);
  const base = armarBase(movimientos, permiteSobregiro);
  const deTransferencias = dependenciasDeTransferencias(base);
  const deMovimientos = dependenciasDeMovimientos(base);
  return {
    movimientos,
    transferencias: base.transferencias,
    auditoria: base.auditoria,
    registrar: new RegistrarTransferencia(deTransferencias),
    obtener: new ObtenerTransferencia(deTransferencias),
    anular: new AnularTransferencia(deTransferencias),
    eliminar: new EliminarTransferencia(deTransferencias),
    listar: new ListarTransferencias(deTransferencias),
    actualizarMovimiento: new ActualizarMovimiento(deMovimientos),
    anularMovimiento: new AnularMovimiento(deMovimientos),
  };
}
