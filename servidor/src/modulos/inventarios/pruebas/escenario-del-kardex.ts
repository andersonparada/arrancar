import {
  AuditoriaEnMemoria,
  CorrelativosEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { AnularDocumento } from '../aplicacion/casos-uso/movimientos/anular-documento.js';
import { RegistrarEntradaManual } from '../aplicacion/casos-uso/movimientos/registrar-entrada-manual.js';
import { RegistrarSalida } from '../aplicacion/casos-uso/movimientos/registrar-salida.js';
import { AnularTraslado } from '../aplicacion/casos-uso/traslados/anular-traslado.js';
import type { DependenciasDeTraslados } from '../aplicacion/casos-uso/traslados/dependencias-de-traslados.js';
import { RecibirTraslado } from '../aplicacion/casos-uso/traslados/recibir-traslado.js';
import { TrasladarArticulos } from '../aplicacion/casos-uso/traslados/trasladar-articulos.js';
import type {
  SolicitudDeEntrada,
  SolicitudDeSalida,
  SolicitudDeTraslado,
  VistaDelKardex,
} from '../aplicacion/dto/documento.dto.js';
import type { DependenciasDelKardex } from '../aplicacion/kardex/dependencias-del-kardex.js';
import type { ClaseDeDocumento } from '../dominio/documento.js';
import { CargaInicialFija, MesesCerradosFijos, MetodoInicialFijo, TransitoFijo } from './dobles-del-entorno.js';
import { KardexEnMemoria } from './dobles-del-kardex.js';

export const BODEGA = 'bodega-1';
export const OTRA_BODEGA = 'bodega-2';
export const ARTICULO = 'articulo-1';
export const OTRO_ARTICULO = 'articulo-2';

const articulo = (id: string, codigo: string) => ({
  id,
  codigo,
  nombre: `Artículo ${codigo}`,
  tipoDeInventario: 'mercaderia' as const,
  unidadBaseId: 'lb',
  manejaLotes: false,
  conceptoDeGastoId: 'concepto-1',
  activo: true,
});

/** Todo el kardex en memoria con dos artículos y una bodega, y los casos de uso listos para usarse. */
export class EscenarioDelKardex {
  readonly operador = operadorDePrueba();
  readonly vista: VistaDelKardex = { verCostos: true, veTodasLasBodegas: true };
  readonly kardex = new KardexEnMemoria();
  readonly publicador = new PublicadorEventosEnMemoria();
  readonly auditoria = new AuditoriaEnMemoria();
  readonly cargaInicial = new CargaInicialFija();
  readonly cierres = new MesesCerradosFijos();
  readonly metodoInicial = new MetodoInicialFijo();
  readonly transito = new TransitoFijo();
  readonly dependencias: DependenciasDelKardex;

  constructor() {
    const { kardex } = this;
    kardex.articulosDelCatalogo.set(ARTICULO, articulo(ARTICULO, 'A-1'));
    kardex.articulosDelCatalogo.set(OTRO_ARTICULO, articulo(OTRO_ARTICULO, 'A-2'));
    kardex.unidadesDelCatalogo.set('lb', { id: 'lb', magnitud: 'masa', factorALaReferencia: '1' });
    kardex.unidadesDelCatalogo.set('qq', { id: 'qq', magnitud: 'masa', factorALaReferencia: '100' });
    kardex.bodegasDelCatalogo.set(BODEGA, { id: BODEGA, nombre: 'Principal', activo: true });
    kardex.bodegasDelCatalogo.set(OTRA_BODEGA, { id: OTRA_BODEGA, nombre: 'Secundaria', activo: true });
    this.dependencias = {
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      auditoria: this.auditoria,
      correlativos: new CorrelativosEnMemoria(),
      publicadorEventos: this.publicador,
      reloj: new RelojFijo('2026-09-29'),
      almacen: kardex,
      documentos: kardex,
      existencias: kardex,
      metodos: kardex,
      catalogos: kardex,
      consultas: kardex,
      cargaInicial: this.cargaInicial,
      cierres: this.cierres,
      metodoInicial: this.metodoInicial,
    };
  }

  /** Una entrada de 100 lb a Q200.00 el 1 de septiembre, con los cambios que se pidan. */
  entrada(cambios: Partial<SolicitudDeEntrada> = {}): SolicitudDeEntrada {
    return {
      fecha: '2026-09-01',
      bodegaId: BODEGA,
      causa: 'produccion_propia',
      soporte: 'Orden 1',
      observaciones: null,
      renglones: [{ articuloId: ARTICULO, loteId: null, cantidad: '100', unidadId: null, costoTotal: '200.00' }],
      ...cambios,
    };
  }

  /** Una entrada de `cantidad` lb a `costoTotal` quetzales del artículo. */
  compra(cantidad: string, costoTotal: string, articuloId = ARTICULO) {
    return [{ articuloId, loteId: null, cantidad, unidadId: null, costoTotal }];
  }

  salida(cantidad: string, cambios: Partial<SolicitudDeSalida> = {}): SolicitudDeSalida {
    return {
      fecha: '2026-09-02',
      bodegaId: BODEGA,
      destino: 'gasto',
      conceptoDeGastoId: 'concepto-1',
      localidadId: null,
      departamentoId: null,
      entregadoA: null,
      observaciones: null,
      renglones: [{ articuloId: ARTICULO, loteId: null, cantidad, unidadId: null, costoTotal: null }],
      ...cambios,
    };
  }

  registrarEntrada(cambios: Partial<SolicitudDeEntrada> = {}) {
    return new RegistrarEntradaManual(this.dependencias).ejecutar(this.operador, this.entrada(cambios), this.vista);
  }

  registrarSalida(cantidad: string, cambios: Partial<SolicitudDeSalida> = {}) {
    return new RegistrarSalida(this.dependencias).ejecutar(this.operador, this.salida(cantidad, cambios), this.vista);
  }

  anular(clase: ClaseDeDocumento, documentoId: string, motivo = 'Error') {
    return new AnularDocumento(this.dependencias, clase).ejecutar(this.operador, { documentoId, motivo }, this.vista);
  }

  /** Los casos de uso de traslados comparten las dependencias del kardex y leen el tránsito de `transito`. */
  get dependenciasDeTraslados(): DependenciasDeTraslados {
    return {
      ...this.dependencias,
      transito: this.transito,
      traslados: { boleta: async () => Promise.reject(new Error('No aplica')) },
    };
  }

  traslado(cantidad: string, cambios: Partial<SolicitudDeTraslado> = {}): SolicitudDeTraslado {
    return {
      fecha: '2026-09-02',
      bodegaDeOrigenId: BODEGA,
      bodegaDeDestinoId: OTRA_BODEGA,
      entregadoA: null,
      observaciones: null,
      renglones: [{ articuloId: ARTICULO, loteId: null, cantidad, unidadId: null, costoTotal: null }],
      ...cambios,
    };
  }

  trasladar(cantidad: string, cambios: Partial<SolicitudDeTraslado> = {}) {
    const caso = new TrasladarArticulos(this.dependenciasDeTraslados);
    return caso.ejecutar(this.operador, this.traslado(cantidad, cambios), this.vista);
  }

  recibirTraslado(documentoId: string, fecha: string | null = null) {
    const caso = new RecibirTraslado(this.dependenciasDeTraslados);
    return caso.ejecutar(this.operador, { documentoId, fecha, observaciones: null }, this.vista);
  }

  anularTraslado(documentoId: string, motivo = 'Error') {
    return new AnularTraslado(this.dependenciasDeTraslados).ejecutar(
      this.operador,
      { documentoId, motivo },
      this.vista,
    );
  }
}
