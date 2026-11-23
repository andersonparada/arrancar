import { Identificador } from '../../core/compartido/dominio/identificador.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { ActualizarCuenta } from '../aplicacion/casos-uso/cuentas/actualizar-cuenta.js';
import { CrearCuenta } from '../aplicacion/casos-uso/cuentas/crear-cuenta.js';
import { GuardarEnlaceDeExcel, ListarEnlacesParaExcel } from '../aplicacion/casos-uso/enlaces/enlaces-de-excel.js';
import { GuardarEnlace } from '../aplicacion/casos-uso/enlaces/guardar-enlace.js';
import { ListarEnlaces } from '../aplicacion/casos-uso/enlaces/listar-enlaces.js';
import { ListarLlavesDeEnlace } from '../aplicacion/casos-uso/enlaces/listar-llaves-de-enlace.js';
import { QuitarEnlace } from '../aplicacion/casos-uso/enlaces/quitar-enlace.js';
import type { SolicitudDeCuenta } from '../aplicacion/dto/cuenta.dto.js';
import { InicioContable } from '../dominio/inicio.js';
import { CuentasEnMemoria } from './dobles-de-cuentas.js';
import { EnlacesEnMemoria, LlavesFijas, ModulosActivosFijos } from './dobles-de-enlaces.js';
import { IniciosEnMemoria } from './dobles-de-inicio.js';

export const operador = operadorDePrueba();
export const BANCO_1 = { llave: 'banco-1', nombre: 'Cuenta monetaria', activo: true };
export const BANCO_2 = { llave: 'banco-2', nombre: 'Cuenta de ahorro', activo: true };

/** Una cuenta de detalle (efectivo) lista para crear; `cambios` ajusta lo que la prueba necesite. */
export const solicitudDeCuenta = (cambios: Partial<SolicitudDeCuenta> = {}): SolicitudDeCuenta => ({
  codigo: '1.1',
  nombre: 'Bancos',
  esDeDetalle: true,
  naturaleza: 'deudora',
  tipo: 'balance',
  rubro: 'efectivo',
  corriente: false,
  claseDeFlujo: 'efectivo',
  esMonetaria: false,
  pideTercero: false,
  pideCentroDeCosto: false,
  esDeControl: false,
  tratamientoFiscal: 'no_aplica',
  activo: true,
  ...cambios,
});

/** Los casos de uso de enlaces y de cuentas sobre dobles en memoria, con la cuenta de primer nivel `1` ya creada. */
export async function armarEscenarioDeEnlaces() {
  const cuentas = new CuentasEnMemoria();
  const enlaces = new EnlacesEnMemoria(cuentas);
  const inicios = new IniciosEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  await inicios.agregar(
    InicioContable.crear(Identificador.desde(operador.empresaId), {
      fecha: '2026-01-01',
      caso: 'desde_la_carga',
      mascara: '9.9.99.99',
      plantilla: null,
      firmaRepresentante: null,
      firmaContador: null,
      registroDelContador: null,
    }),
  );
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: enlaces,
    consultas: enlaces,
    cuentas,
    llaves: new LlavesFijas({ cuenta_bancaria: [BANCO_2, BANCO_1] }),
    modulosActivos: new ModulosActivosFijos(['bancos', 'contabilidad']),
    auditoria,
  };
  const dependenciasDeCuentas = { ...dependencias, repositorio: cuentas, consultas: cuentas, inicios };
  const guardar = new GuardarEnlace(dependencias);
  const llaves = new ListarLlavesDeEnlace(dependencias);
  const crearCuenta = new CrearCuenta(dependenciasDeCuentas);
  await crearCuenta.ejecutar(
    operador,
    solicitudDeCuenta({ codigo: '1', nombre: 'Activo', esDeDetalle: false, rubro: null }),
  );
  return {
    auditoria,
    cuentas,
    guardar,
    llaves,
    listar: new ListarEnlaces(dependencias),
    quitar: new QuitarEnlace(dependencias),
    paraExcel: new ListarEnlacesParaExcel(dependencias),
    desdeExcel: new GuardarEnlaceDeExcel(guardar, llaves),
    actualizarCuenta: new ActualizarCuenta(dependenciasDeCuentas),
    /** Crea una cuenta de detalle; sin cambios es `1.1 Bancos`. */
    crearDetalle: (cambios: Partial<SolicitudDeCuenta> = {}) =>
      crearCuenta.ejecutar(operador, solicitudDeCuenta(cambios)),
  };
}
