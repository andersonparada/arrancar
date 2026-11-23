import { aCentavos } from '../../core/compartido/dominio/centavos.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { PonerEnUso } from '../aplicacion/casos-uso/activos/poner-en-uso.js';
import { PonerEnUsoVarios } from '../aplicacion/casos-uso/activos/poner-en-uso-varios.js';
import { QuitarDeUso } from '../aplicacion/casos-uso/activos/quitar-de-uso.js';
import type { SolicitudDePonerEnUso } from '../aplicacion/dto/activo.dto.js';
import { Activo, type EntradaDeAlta } from '../dominio/activo.js';
import { Clase } from '../dominio/clase.js';
import { Costo } from '../dominio/costo.js';
import type { IncisoFiscal } from '../dominio/incisos-fiscales.js';
import { ActivosEnMemoria, UbicacionesEnMemoria } from './dobles-de-activos.js';
import { ClasesEnMemoria, TopesFijos } from './dobles-de-clases.js';
import { CostosEnMemoria } from './dobles-de-costos.js';
import { TrasladosEnMemoria } from './dobles-de-traslados.js';
import { SaldosEnMemoria } from './dobles-de-saldos.js';
import { CierresDePrueba, PrimerMesFijo, TramosEnMemoria } from './dobles-de-uso.js';

export const operador = operadorDePrueba();

export const LOCALIDAD_NORTE = '11111111-1111-4111-8111-111111111111';
export const LOCALIDAD_SUR = '22222222-2222-4222-8222-222222222222';
export const DEPARTAMENTO_DEL_SUR = '33333333-3333-4333-8333-333333333333';

/** Las localidades y el departamento que conocen las pruebas de traslados y de «Disponible para uso». */
function ubicacionesDePrueba(): UbicacionesEnMemoria {
  const ubicaciones = new UbicacionesEnMemoria();
  ubicaciones.localidades.set(LOCALIDAD_NORTE, { id: LOCALIDAD_NORTE, codigo: 'N', nombre: 'Norte', activo: true });
  ubicaciones.localidades.set(LOCALIDAD_SUR, { id: LOCALIDAD_SUR, codigo: 'S', nombre: 'Sur', activo: true });
  ubicaciones.departamentos.set(DEPARTAMENTO_DEL_SUR, {
    id: DEPARTAMENTO_DEL_SUR,
    codigo: 'D',
    nombre: 'Taller',
    activo: true,
    localidadId: LOCALIDAD_SUR,
  });
  return ubicaciones;
}
const empresa = Identificador.desde<'Empresa'>(operador.empresaId);

type DatosDeAlta = Partial<EntradaDeAlta['datos']>;

function altaDe(claseId: string, inciso: IncisoFiscal, datos: DatosDeAlta): Activo {
  return Activo.crear(
    empresa,
    {
      datos: {
        codigo: `AF-${Math.random().toString(36).slice(2, 8)}`,
        descripcion: 'Bien',
        claseId,
        activoPadreId: null,
        tipoDeRegistro: 'activo',
        origen: 'compra',
        propietario: null,
        formaDeTenencia: null,
        fechaDeAdquisicion: '2027-02-01',
        valorComoGanadoComun: null,
        valorDeMatricula: null,
        valorCatastral: null,
        valoresDelInmuebleCompleto: false,
        marca: null,
        modelo: null,
        numeroDeSerie: null,
        placa: null,
        cantidad: 1,
        observaciones: null,
        ...datos,
      },
      ubicacion: { localidadId: null, departamentoId: null, responsable: null, enBodega: false },
    },
    inciso,
  );
}

export const uso = (cambios: Partial<SolicitudDePonerEnUso> = {}): SolicitudDePonerEnUso => ({
  fechaDeInicioDeUso: '2027-03-10',
  ...cambios,
});

/** Poner en uso y quitar de uso con todo en memoria, y ayudas para sembrar clases, activos y costos. */
export function armarUso() {
  const activos = new ActivosEnMemoria();
  const costos = new CostosEnMemoria(activos);
  const tramos = new TramosEnMemoria();
  const saldos = new SaldosEnMemoria(activos);
  const cierres = new CierresDePrueba();
  const primerMes = new PrimerMesFijo();
  const auditoria = new AuditoriaEnMemoria();
  const clases = new ClasesEnMemoria();
  const traslados = new TrasladosEnMemoria(activos);
  const ubicaciones = ubicacionesDePrueba();
  const publicador = new PublicadorEventosEnMemoria();
  const reloj = new RelojFijo('2027-06-15');
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: activos,
    consultas: activos,
    clases,
    auditoria,
    costos,
    tramos,
    saldos,
    cierres,
    topes: new TopesFijos(),
    primerMes,
    ubicaciones,
    traslados,
    correlativos: new CorrelativosEnMemoria(),
    reloj,
    publicadorEventos: publicador,
  };

  const claseDe = async (incisoFiscal: IncisoFiscal, porcentajeFiscal: string, residual = '10.00') => {
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
    return clase;
  };

  const agregarCosto = async (activo: Activo, monto: string, cambios: Record<string, unknown> = {}) => {
    const costo = Costo.manual(empresa, activo.id.valor, {
      claseDeCosto: 'adquisicion',
      fecha: '2027-02-01',
      montoCentavos: aCentavos(monto),
      documentoDeSoporte: 'DUCA 1',
      descripcion: null,
      aplicaAlLibroFiscal: true,
      motivoFueraDelLibroFiscal: null,
      noEsEdificacion: false,
      ...cambios,
    });
    await costos.agregarVarios([costo]);
  };

  /** Un activo en construcción de la clase, con un costo manual de `monto` (en quetzales) el 1 de febrero de 2027. */
  const activoConCosto = async (clase: Clase, monto: string | null, datos: DatosDeAlta = {}) => {
    const { id, incisoFiscal } = clase.instantanea();
    const activo = altaDe(id.valor, incisoFiscal, datos);
    await activos.agregar(activo);
    traslados.registrarAlta(activo);
    if (monto) await agregarCosto(activo, monto);
    return activo;
  };

  const ponerEnUso = new PonerEnUso(dependencias);
  return {
    dependencias,
    activos,
    clases,
    auditoria,
    cierres,
    primerMes,
    saldos,
    tramos,
    costos,
    traslados,
    ubicaciones,
    publicador,
    reloj,
    ponerEnUso,
    ponerEnUsoVarios: new PonerEnUsoVarios(dependencias),
    quitarDeUso: new QuitarDeUso(dependencias),
    claseDe,
    activoConCosto,
    agregarCosto,
    poner: (activo: Activo, solicitud = uso()) =>
      ponerEnUso.ejecutar(operador, { activoId: activo.id.valor, solicitud }),
    tramosDe: (activo: Activo) => tramos.porActivo.get(activo.id.valor) ?? [],
  };
}

export type EscenarioDeUso = ReturnType<typeof armarUso>;
