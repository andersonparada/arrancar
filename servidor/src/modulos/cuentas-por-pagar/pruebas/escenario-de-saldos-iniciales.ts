import {
  AuditoriaEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { CorregirSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/corregir-saldo-inicial.js';
import { CrearSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/crear-saldo-inicial.js';
import type { DependenciasDeSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/dependencias-de-saldos-iniciales.js';
import { EliminarSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/eliminar-saldo-inicial.js';
import { ListarSaldosIniciales } from '../aplicacion/casos-uso/saldos-iniciales/listar-saldos-iniciales.js';
import { ObtenerSaldoInicial } from '../aplicacion/casos-uso/saldos-iniciales/obtener-saldo-inicial.js';
import type { SolicitudDeSaldoInicial } from '../aplicacion/dto/saldo-inicial.dto.js';
import { ConsultasEnMemoria } from './dobles-de-acciones.js';
import { AplicacionesEnMemoria, CondicionesEnMemoria, DocumentosEnMemoria, PlazoFijo } from './dobles-de-documentos.js';
import { CargaInicialEnMemoria, ProveedoresEnMemoria, SaldosInicialesEnMemoria } from './dobles-de-saldos-iniciales.js';

/** Todo lo que necesitan las pruebas de los casos de uso de saldos iniciales, armado con dobles en memoria. */
export class EscenarioDeSaldosIniciales {
  readonly operador = operadorDePrueba();
  readonly proveedorId = crypto.randomUUID();
  readonly aplicaciones = new AplicacionesEnMemoria();
  readonly documentos = new DocumentosEnMemoria(this.aplicaciones);
  readonly carga = new CargaInicialEnMemoria();
  readonly proveedores = new ProveedoresEnMemoria();
  readonly condiciones = new CondicionesEnMemoria();
  readonly auditoria = new AuditoriaEnMemoria();
  readonly crear: CrearSaldoInicial;
  readonly corregir: CorregirSaldoInicial;
  readonly eliminar: EliminarSaldoInicial;
  readonly listar: ListarSaldosIniciales;
  readonly obtener: ObtenerSaldoInicial;

  constructor() {
    this.proveedores.disponibles.add(this.proveedorId);
    const dependencias: DependenciasDeSaldosIniciales = {
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      documentos: this.documentos,
      saldosIniciales: new SaldosInicialesEnMemoria(this.documentos),
      consultas: new ConsultasEnMemoria(this.documentos),
      cargaInicial: this.carga,
      proveedores: this.proveedores,
      condiciones: this.condiciones,
      plazo: new PlazoFijo(1),
      auditoria: this.auditoria,
      reloj: new RelojFijo('2026-03-15'),
    };
    this.crear = new CrearSaldoInicial(dependencias);
    this.corregir = new CorregirSaldoInicial(dependencias);
    this.eliminar = new EliminarSaldoInicial(dependencias);
    this.listar = new ListarSaldosIniciales(dependencias);
    this.obtener = new ObtenerSaldoInicial(dependencias);
  }

  /** Una factura de Q1,120 con Q1,000 pendientes al corte (fecha de inicio 2026-01-01). */
  solicitud(cambios: Partial<SolicitudDeSaldoInicial> = {}): SolicitudDeSaldoInicial {
    return {
      proveedorId: this.proveedorId,
      tipo: 'factura',
      serie: 'a',
      numero: '1001',
      fechaEmision: '2025-12-20',
      vencimiento: '2026-01-20',
      total: '1120.00',
      saldoPendiente: '1000.00',
      referencia: null,
      ...cambios,
    };
  }
}
