import type { CambioDeMonto, CustodioDelFondo, Fondo } from '../../../dominio/fondos.js';
import type {
  AnulacionDeMovimiento,
  ChequeAEmitir,
  FondosEnBancos,
  MovimientoAnulado,
  NotaARegistrar,
} from '../../puertos/puertos-de-bancos.js';
import type {
  CambioNuevo,
  CierreDelFondo,
  ConsultasDeFondos,
  DatosDeLectura,
  FondoNuevo,
  RepositorioDeFondos,
} from '../../puertos/puertos-de-fondos.js';

/** Un repositorio en memoria con lo justo para estos casos de uso. */
export class FondosEnMemoria implements RepositorioDeFondos {
  readonly fondos = new Map<string, Fondo>();
  readonly cambiosDe = new Map<string, CambioDeMonto[]>();
  readonly custodiosDe = new Map<string, CustodioDelFondo[]>();

  async agregar(nuevo: FondoNuevo): Promise<void> {
    this.fondos.set(nuevo.id, {
      id: nuevo.id,
      nombre: nuevo.nombre,
      localidadId: nuevo.localidadId,
      topeCentavos: nuevo.topeCentavos,
      cuentaBancariaId: nuevo.cuentaBancariaId,
      origen: 'banco',
      fechaDeApertura: nuevo.fechaDeApertura,
      estado: 'abierto',
      fechaDeCierre: null,
      motivoDeCierre: null,
      observaciones: null,
    });
  }

  async buscar(id: string) {
    return this.fondos.get(id) ?? null;
  }

  bloquear(id: string) {
    return this.buscar(id);
  }

  async actualizar(id: string, cambios: Partial<Fondo> & { topeCentavos?: number | null }): Promise<void> {
    this.fondos.set(id, { ...this.fondos.get(id)!, ...cambios });
  }

  async cerrar(id: string, cierre: CierreDelFondo): Promise<void> {
    const fondo = this.fondos.get(id)!;
    this.fondos.set(id, {
      ...fondo,
      estado: 'cerrado',
      fechaDeCierre: cierre.fecha,
      motivoDeCierre: cierre.motivo,
    });
  }

  async existeElNombre(nombre: string, exceptoId?: string): Promise<boolean> {
    return [...this.fondos.values()].some((f) => f.id !== exceptoId && f.nombre.toLowerCase() === nombre.toLowerCase());
  }

  async agregarCustodio(c: { fondoId: string; custodio: string; custodioUsuarioId: string | null; desde: string }) {
    const lista = this.custodiosDe.get(c.fondoId) ?? [];
    lista.push({ id: crypto.randomUUID(), hasta: null, motivoDelCambio: null, ...c });
    this.custodiosDe.set(c.fondoId, lista);
  }

  async cerrarCustodioVigente(): Promise<void> {}

  async custodios(fondoId: string) {
    return this.custodiosDe.get(fondoId) ?? [];
  }

  async agregarCambio(cambio: CambioNuevo): Promise<string> {
    const id = crypto.randomUUID();
    const lista = this.cambiosDe.get(cambio.fondoId) ?? [];
    lista.push({ ...cambio, id, estado: 'vigente', fechaDeAnulacion: null, motivoDeAnulacion: null });
    this.cambiosDe.set(cambio.fondoId, lista);
    return id;
  }

  async cambios(fondoId: string) {
    return this.cambiosDe.get(fondoId) ?? [];
  }

  async anularCambio(): Promise<void> {}

  async cambioDelMovimiento() {
    return null;
  }
}

export const consultas = (cifras: Partial<DatosDeLectura> = {}): ConsultasDeFondos => ({
  listar: async () => ({ filas: [], total: 0 }),
  datosDeLectura: async (ids) =>
    new Map(
      ids.map((id) => [
        id,
        {
          custodio: 'Juan',
          custodioUsuarioId: null,
          localidadNombre: null,
          cuentaBancariaNombre: null,
          montoCentavos: 100_000,
          pendienteCentavos: 0,
          valesCentavos: 0,
          valeMasViejo: null,
          ultimoArqueo: null,
          aperturaAnulada: false,
          documentosPorResolver: 0,
          ...cifras,
        },
      ]),
    ),
  usoDelFondo: async () => ({ comprobantes: 0, arqueos: 0, reposiciones: 0, vales: 0 }),
});

export class BancosFalso implements FondosEnBancos {
  cheques: ChequeAEmitir[] = [];
  notas: NotaARegistrar[] = [];
  fallar = false;

  async emitirCheque(_operador: unknown, cheque: ChequeAEmitir) {
    if (this.fallar) throw new Error('Saldo insuficiente');
    this.cheques.push(cheque);
    return {
      movimientoId: crypto.randomUUID(),
      cuentaBancariaId: 'cuenta-1',
      avisos: [{ codigo: 'x', mensaje: 'Aviso de Bancos' }],
    };
  }

  async registrarNota(_operador: unknown, nota: NotaARegistrar) {
    this.notas.push(nota);
    return { movimientoId: crypto.randomUUID(), cuentaBancariaId: nota.cuentaBancariaId, avisos: [] };
  }

  async anularMovimiento(_operador?: unknown, _anulacion?: AnulacionDeMovimiento): Promise<MovimientoAnulado> {
    return { forma: 'sin_inverso', fechaDelInverso: null };
  }
}
