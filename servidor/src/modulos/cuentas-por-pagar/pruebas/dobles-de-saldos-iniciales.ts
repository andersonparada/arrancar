import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type {
  CargaInicial,
  EstadoDeLaCarga,
  ProveedoresParaSaldos,
  RepositorioDeSaldosIniciales,
  SaldoInicialAGuardar,
} from '../aplicacion/puertos/puertos-de-saldos-iniciales.js';
import type { DocumentoPorPagar } from '../dominio/documento-por-pagar.js';
import type { DocumentosEnMemoria } from './dobles-de-documentos.js';

/** La carga inicial de la empresa, en un objeto que la prueba cambia; cuenta cuántas veces se pidió. */
export class CargaInicialEnMemoria implements CargaInicial {
  consultas = 0;

  constructor(public estado: EstadoDeLaCarga = { fechaDeInicio: '2026-01-01', cerrada: false }) {}

  async obtener(_operador: Operador): Promise<EstadoDeLaCarga> {
    this.consultas += 1;
    return this.estado;
  }
}

/** Los proveedores disponibles son los que la prueba agrega. */
export class ProveedoresEnMemoria implements ProveedoresParaSaldos {
  readonly disponibles = new Set<string>();

  async estaDisponible(proveedorId: string): Promise<boolean> {
    return this.disponibles.has(proveedorId);
  }
}

/** Guarda en los mismos documentos en memoria que usan el resto de los casos de uso. */
export class SaldosInicialesEnMemoria implements RepositorioDeSaldosIniciales {
  constructor(private readonly documentos: DocumentosEnMemoria) {}

  async agregar(saldo: SaldoInicialAGuardar, registradoPor: string): Promise<DocumentoPorPagar> {
    const guardado: DocumentoPorPagar = {
      ...this.camposDe(saldo),
      id: crypto.randomUUID(),
      origen: 'saldo_inicial',
      documentoId: null,
      documentoAfectadoId: null,
      ingresadoPor: registradoPor,
      estado: 'registrado',
      registradoEn: 'ahora',
      registradoPor,
      autorizadoEn: null,
      autorizadoPor: null,
      autorizacionPropia: false,
    };
    this.documentos.documentos.push(guardado);
    return guardado;
  }

  async reemplazar(id: string, saldo: SaldoInicialAGuardar, registradoPor: string): Promise<void> {
    const documento = this.documentos.documentos.find((candidato) => candidato.id === id)!;
    Object.assign(documento, this.camposDe(saldo), { registradoEn: 'ahora', registradoPor });
  }

  private camposDe(saldo: SaldoInicialAGuardar) {
    const { saldoPendienteCentavos, ...resto } = saldo;
    return { ...resto, saldoAlInicioCentavos: saldoPendienteCentavos };
  }
}
