import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { CorregirSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/corregir-saldo-inicial.js';
import type { DependenciasDeSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/dependencias-de-saldos-iniciales.js';
import { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import { GuardarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/guardar-saldo-inicial.js';
import type { SolicitudDeSaldoInicial } from '../aplicacion/dto/saldo-inicial.dto.js';
import { Clase } from '../dominio/clase.js';
import type { IncisoFiscal } from '../dominio/incisos-fiscales.js';
import { ActivosEnMemoria, CargaInicialDePrueba, PrefijoFijo, UbicacionesEnMemoria } from './dobles-de-activos.js';
import { ClasesEnMemoria, TopesFijos } from './dobles-de-clases.js';
import { CostosEnMemoria } from './dobles-de-costos.js';
import { SaldosEnMemoria } from './dobles-de-saldos.js';
import { CierresDePrueba, TramosEnMemoria } from './dobles-de-uso.js';

export const operador = operadorDePrueba();
const empresa = Identificador.desde<'Empresa'>(operador.empresaId);

/** Una solicitud válida: un activo comprado en 2024 que aún se deprecia (costo 120,000, mitad ya depreciada). */
export const solicitudDeSaldo = (claseId: string, cambios: Partial<SolicitudDeSaldoInicial> = {}) =>
  ({
    codigo: null,
    descripcion: 'Camión de reparto',
    claseId,
    activoPadreId: null,
    fechaDeAdquisicion: '2024-01-15',
    fechaDeInicioDeUso: '2024-02-01',
    enConstruccion: false,
    cantidad: 1,
    costo: '120000.00',
    depreciacionAcumuladaContable: '50000.00',
    costoFiscal: null,
    baseFiscal: null,
    depreciacionAcumuladaFiscal: '72000.00',
    porcentajeFiscal: null,
    vidaUtilRestanteMeses: 36,
    valorResidual: null,
    valorComoGanadoComun: null,
    valorDeMatricula: null,
    valorCatastral: null,
    valoresDelInmuebleCompleto: false,
    marca: null,
    modelo: null,
    numeroDeSerie: null,
    placa: null,
    observaciones: null,
    localidadId: null,
    departamentoId: null,
    responsable: null,
    enBodega: false,
    ...cambios,
  }) satisfies SolicitudDeSaldoInicial;

/** Los saldos iniciales con todo en memoria (la carga abierta con fecha de inicio 2026-01-01), y ayudas para las pruebas. */
export function armarSaldos() {
  const activos = new ActivosEnMemoria();
  const clases = new ClasesEnMemoria();
  const carga = new CargaInicialDePrueba({ fechaDeInicio: '2026-01-01', cerrada: false });
  const saldos = new SaldosEnMemoria(activos);
  const dependencias: DependenciasDeSaldosIniciales = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: activos,
    clases,
    auditoria: new AuditoriaEnMemoria(),
    ubicaciones: new UbicacionesEnMemoria(),
    cargaInicial: carga,
    correlativos: new CorrelativosEnMemoria(),
    prefijo: new PrefijoFijo(),
    reloj: new RelojFijo('2026-06-15'),
    saldos,
    consultas: saldos,
    costos: new CostosEnMemoria(activos),
    tramos: new TramosEnMemoria(),
    cierres: new CierresDePrueba(),
    topes: new TopesFijos(),
  };

  const claseDe = async (incisoFiscal: IncisoFiscal, porcentajeFiscal: string, residual = '0.00') => {
    const datos = {
      nombre: `Clase ${incisoFiscal}`,
      incisoFiscal,
      porcentajeFiscal,
      vidaUtilContableMeses: null,
      valorResidualPorcentaje: residual,
      activo: true,
    };
    const clase = Clase.crear(empresa, datos, { porcentajeMaximo: 100 });
    await clases.agregar(clase);
    return clase.id.valor;
  };

  return {
    dependencias,
    activos,
    clases,
    carga,
    saldos,
    costos: dependencias.costos as CostosEnMemoria,
    tramos: dependencias.tramos as TramosEnMemoria,
    cierres: dependencias.cierres as CierresDePrueba,
    auditoria: dependencias.auditoria as AuditoriaEnMemoria,
    ubicaciones: dependencias.ubicaciones as UbicacionesEnMemoria,
    claseDe,
    guardar: new GuardarSaldoInicial(dependencias),
    corregir: new CorregirSaldoInicial(dependencias),
    eliminar: new EliminarSaldoInicial(dependencias),
  };
}

export type EscenarioDeSaldos = ReturnType<typeof armarSaldos>;
