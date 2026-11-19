import { randomUUID } from 'node:crypto';
import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Clase } from '../dominio/clase.js';
import type { IncisoFiscal } from '../dominio/incisos-fiscales.js';
import type { LineaConReferencia } from '../aplicacion/puertos/lineas-del-libro.js';
import { ActivosEnMemoria, CargaInicialDePrueba, PrefijoFijo, UbicacionesEnMemoria } from './dobles-de-activos.js';
import { ClasesEnMemoria } from './dobles-de-clases.js';
import { CostosEnMemoria, DescartesEnMemoria, LineasEnMemoria, UmbralFijo } from './dobles-de-costos.js';
import type { AsignacionDeLinea, SolicitudDeActivoNuevo } from '../aplicacion/dto/capitalizacion.dto.js';
import { DescartarLinea } from '../aplicacion/casos-uso/bandeja/descartar-linea.js';
import { DevolverLineaALaBandeja } from '../aplicacion/casos-uso/bandeja/devolver-linea.js';
import { AnularCosto } from '../aplicacion/casos-uso/costos/anular-costo.js';
import { CapitalizarLineas } from '../aplicacion/casos-uso/costos/capitalizar-lineas.js';
import { RechazarDocumentoConCostos } from '../aplicacion/casos-uso/costos/rechazar-documento-con-costos.js';
import { RegistrarCostoManual } from '../aplicacion/casos-uso/costos/registrar-costo-manual.js';

export const operador = operadorDePrueba();
export const LOCALIDAD = randomUUID();

/** Todo lo que los casos de uso de costos y bandeja necesitan, en memoria. */
export async function armarCostos() {
  const clases = new ClasesEnMemoria();
  const claseDe = async (nombre: string, incisoFiscal: IncisoFiscal) => {
    const clase = Clase.crear(
      Identificador.desde(operador.empresaId),
      {
        nombre,
        incisoFiscal,
        porcentajeFiscal: '5.00',
        vidaUtilContableMeses: null,
        valorResidualPorcentaje: '0.00',
        activo: true,
      },
      { porcentajeMaximo: 20 },
    );
    await clases.agregar(clase);
    return clase.id.valor;
  };
  const claseId = await claseDe('Maquinaria', 'maquinaria_y_vehiculos');
  const edificiosId = await claseDe('Edificios', 'edificios');
  const activos = new ActivosEnMemoria();
  const costos = new CostosEnMemoria(activos);
  const descartes = new DescartesEnMemoria();
  const lineas = new LineasEnMemoria(costos, descartes);
  const ubicaciones = new UbicacionesEnMemoria();
  ubicaciones.localidades.set(LOCALIDAD, { id: LOCALIDAD, codigo: 'L1', nombre: 'Finca', activo: true });
  const publicador = new PublicadorEventosEnMemoria();
  const auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: activos,
    clases,
    auditoria,
    ubicaciones,
    cargaInicial: new CargaInicialDePrueba(),
    correlativos: new CorrelativosEnMemoria(),
    prefijo: new PrefijoFijo(),
    reloj: new RelojFijo('2026-11-18'),
    costos,
    consultasDeCostos: costos,
    lineas,
    publicadorEventos: publicador,
  };
  const deBandeja = { ...dependencias, bandeja: { listar: async () => [] }, umbral: new UmbralFijo(), descartes };
  return {
    claseId,
    edificiosId,
    activos,
    costos,
    descartes,
    lineas,
    publicador,
    auditoria,
    capitalizar: new CapitalizarLineas(dependencias),
    registrarManual: new RegistrarCostoManual(dependencias),
    anular: new AnularCosto(dependencias),
    rechazar: new RechazarDocumentoConCostos(dependencias),
    descartar: new DescartarLinea(deBandeja),
    devolver: new DevolverLineaALaBandeja(deBandeja),
  };
}

export type EscenarioDeCostos = Awaited<ReturnType<typeof armarCostos>>;

/** Una línea de Q1,000.00 de una factura vigente, marcada como activo fijo; `cambios` la ajusta. */
export function lineaDePrueba(cambios: Partial<Omit<LineaConReferencia, 'capitalizadoCentavos' | 'descartada'>> = {}) {
  return {
    lineaId: randomUUID(),
    documentoId: randomUUID(),
    tipoDeDocumento: 'factura',
    documentoVigente: true,
    fechaEmision: '2026-11-01',
    esActivoFijo: true,
    costoCentavos: 100_000,
    facturaCapitalizada: false,
    documento: 'A-1',
    numeroDeLinea: 1,
    ...cambios,
  };
}

export const activoNuevo = (
  claseId: string,
  cambios: Partial<SolicitudDeActivoNuevo> = {},
): SolicitudDeActivoNuevo => ({
  descripcion: 'Tractor',
  claseId,
  tipoDeRegistro: 'activo',
  origen: 'compra',
  activoPadreId: null,
  localidadId: null,
  departamentoId: null,
  responsable: null,
  enBodega: false,
  marca: null,
  modelo: null,
  valorComoGanadoComun: null,
  valorDeMatricula: null,
  valorCatastral: null,
  valoresDelInmuebleCompleto: false,
  observaciones: null,
  unidades: 1,
  cantidadPorActivo: 1,
  detalleDeUnidades: [],
  ...cambios,
});

/** Una asignación de `montoCentavos` de la línea a un activo nuevo; `cambios` ajusta el destino o el monto. */
export const asignacion = (
  lineaId: string,
  montoCentavos: number,
  cambios: Partial<AsignacionDeLinea> = {},
): AsignacionDeLinea => ({
  lineaId,
  montoCentavos,
  activoId: null,
  activoNuevo: null,
  altaConjuntaId: null,
  claseDeCosto: null,
  noEsEdificacion: false,
  ...cambios,
});
