import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import {
  MovimientosEnMemoria,
  PoliticaDeMismaFechaFija,
  PoliticaDeSobregiroFija,
} from '../../../pruebas/dobles-de-movimientos.js';
import type { SolicitudDeMovimiento } from '../../dto/movimiento.dto.js';
import {
  CONCEPTO_GENERAL,
  conceptosDeMovimientosDe,
  conceptosSembrados,
} from '../../../pruebas/conceptos-de-prueba.js';
import { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import { ActualizarMovimiento } from './actualizar-movimiento.js';
import { AnularMovimiento } from './anular-movimiento.js';
import { CrearMovimiento } from './crear-movimiento.js';
import { EliminarMovimiento } from './eliminar-movimiento.js';
import { ListarMovimientos } from './listar-movimientos.js';
import { ObtenerMovimiento } from './obtener-movimiento.js';
import { ReclasificarMovimientos } from './reclasificar-movimientos.js';
import { ReporteDeMovimientos } from './reporte-de-movimientos.js';

export const operador = operadorDePrueba();
export const CUENTA = '00000000-0000-4000-8000-000000000001';

/** Una nota de crédito de 100.00 a mitad de enero, con lo que se quiera cambiar. */
export const nota = (cambios: Partial<SolicitudDeMovimiento> = {}): SolicitudDeMovimiento => ({
  cuentaBancariaId: CUENTA,
  tipo: 'credito',
  fecha: '2026-01-15',
  monto: '100.00',
  saldoInicial: false,
  referencia: 'Boleta 123',
  beneficiario: null,
  observaciones: null,
  conceptoId: CONCEPTO_GENERAL,
  ...cambios,
});

interface Opciones {
  permiteSobregiro?: boolean;
  mismaFecha?: boolean;
}

function dependenciasDe(registros: MovimientosEnMemoria, auditoria: AuditoriaEnMemoria, opciones: Opciones) {
  const politicaDeSobregiro = new PoliticaDeSobregiroFija(opciones.permiteSobregiro ?? false);
  return {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
    correlativos: new CorrelativosEnMemoria(),
    reloj: new RelojFijo(),
    conceptos: conceptosDeMovimientosDe(conceptosSembrados()),
    reglas: new ReglasDeLaCuenta({ consultas: registros, politicaDeSobregiro }),
    politicaDeMismaFecha: new PoliticaDeMismaFechaFija(opciones.mismaFecha),
  };
}

/** Los casos de uso de movimientos armados con dobles en memoria, y los dobles para preparar y revisar. */
export function armarEntorno({ permiteSobregiro = false, mismaFecha = false }: Opciones = {}) {
  const registros = new MovimientosEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  const dependencias = dependenciasDe(registros, auditoria, { permiteSobregiro, mismaFecha });
  return {
    registros,
    auditoria,
    listar: new ListarMovimientos(dependencias),
    obtener: new ObtenerMovimiento(dependencias),
    crear: new CrearMovimiento(dependencias),
    actualizar: new ActualizarMovimiento(dependencias),
    anular: new AnularMovimiento(dependencias),
    eliminar: new EliminarMovimiento(dependencias),
    reclasificar: new ReclasificarMovimientos(dependencias),
    reporte: new ReporteDeMovimientos(dependencias),
  };
}
