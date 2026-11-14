import type {
  AnulacionDeContrasena,
  CambiosDeContrasena,
  ConsultasDeContrasenas,
  ContrasenaConDocumentos,
  ContrasenaDelDocumento,
  ContrasenaNueva,
  ProveedoresDeContrasenas,
  RepositorioDeContrasenas,
} from '../aplicacion/puertos/puertos-de-contrasenas.js';
import type { FilaDeDocumento } from '../aplicacion/puertos/puertos-de-consultas.js';
import { numeroDeContrasena } from '../dominio/contrasena.js';
import type { AplicacionDeContrasena } from '../dominio/reparto-de-contrasena.js';
import type { ConsultasEnMemoria } from './dobles-de-acciones.js';
import type { AplicacionesEnMemoria } from './dobles-de-documentos.js';

interface Guardada extends ContrasenaNueva {
  id: string;
  vigente: boolean;
  impresaEn?: string;
  anulacion?: AnulacionDeContrasena;
}

/** Contraseñas en memoria: guardan sus documentos y reparten las notas en las aplicaciones en memoria. */
export class ContrasenasEnMemoria
  implements RepositorioDeContrasenas, ConsultasDeContrasenas, ProveedoresDeContrasenas
{
  readonly guardadas: Guardada[] = [];
  readonly proveedoresConocidos = new Set<string>();

  constructor(
    private readonly consultas: ConsultasEnMemoria,
    private readonly aplicaciones: AplicacionesEnMemoria,
  ) {}

  async existe(proveedorId: string): Promise<boolean> {
    return this.proveedoresConocidos.has(proveedorId);
  }

  async agregar(nueva: ContrasenaNueva): Promise<string> {
    const id = `contrasena-${this.guardadas.length + 1}`;
    this.guardadas.push({ ...nueva, id, vigente: true });
    return id;
  }

  async guardarReparto(
    contrasenaId: string,
    _proveedorId: string,
    aplicaciones: readonly AplicacionDeContrasena[],
  ): Promise<void> {
    for (const { notaId, cargoId, montoCentavos, fecha } of aplicaciones) {
      this.aplicaciones.lista.push({
        id: `${contrasenaId}-${this.aplicaciones.lista.length}`,
        notaId,
        cargoId,
        montoCentavos,
        forma: 'contrasena',
        fecha,
        referencia: null,
        otraSerie: null,
        otroNumero: '',
      });
    }
  }

  async borrarReparto(contrasenaId: string): Promise<void> {
    const prefijo = `${contrasenaId}-`;
    const quedan = this.aplicaciones.lista.filter(
      ({ id, forma }) => !(forma === 'contrasena' && id.startsWith(prefijo)),
    );
    this.aplicaciones.lista.splice(0, this.aplicaciones.lista.length, ...quedan);
  }

  async anular(contrasenaId: string, anulacion: AnulacionDeContrasena): Promise<void> {
    Object.assign(
      this.guardadas.find(({ id }) => id === contrasenaId)!,
      { vigente: false, anulacion },
    );
  }

  async bloquear(): Promise<void> {}

  async actualizar(contrasenaId: string, cambios: CambiosDeContrasena): Promise<void> {
    Object.assign(
      this.guardadas.find(({ id }) => id === contrasenaId)!,
      cambios,
    );
  }

  async agregarDocumentos(contrasenaId: string, _proveedorId: string, documentoIds: readonly string[]): Promise<void> {
    const guardada = this.guardadas.find(({ id }) => id === contrasenaId)!;
    guardada.documentoIds = [...guardada.documentoIds, ...documentoIds];
  }

  async quitarDocumento(contrasenaId: string, documentoId: string): Promise<void> {
    const guardada = this.guardadas.find(({ id }) => id === contrasenaId)!;
    guardada.documentoIds = guardada.documentoIds.filter((id) => id !== documentoId);
  }

  async vigentesDe(documentoIds: readonly string[]): Promise<Map<string, ContrasenaDelDocumento>> {
    const vigentes = new Map<string, ContrasenaDelDocumento>();
    for (const guardada of this.guardadas.filter(({ vigente }) => vigente)) {
      const numero = numeroDeContrasena(guardada.numero, guardada.anioDeNumero);
      for (const id of guardada.documentoIds.filter((documentoId) => documentoIds.includes(documentoId))) {
        vigentes.set(id, { id: guardada.id, numero });
      }
    }
    return vigentes;
  }

  async detalle(id: string): Promise<ContrasenaConDocumentos | null> {
    const guardada = this.guardadas.find((candidata) => candidata.id === id);
    if (!guardada) return null;
    const documentos: FilaDeDocumento[] = [];
    for (const documentoId of guardada.documentoIds) documentos.push((await this.consultas.buscar(documentoId))!);
    const aplicadoPorNota = new Map<string, number>();
    for (const { notaId, montoCentavos, forma } of this.aplicaciones.lista) {
      if (forma === 'contrasena') aplicadoPorNota.set(notaId, (aplicadoPorNota.get(notaId) ?? 0) + montoCentavos);
    }
    return { contrasena: this.comoGuardada(guardada), documentos, aplicadoPorNota };
  }

  async listar(): Promise<{ filas: ContrasenaConDocumentos[]; total: number }> {
    const filas: ContrasenaConDocumentos[] = [];
    for (const { id } of this.guardadas) filas.push((await this.detalle(id))!);
    return { filas, total: filas.length };
  }

  async disponiblesDe(): Promise<FilaDeDocumento[]> {
    return [];
  }

  async nombreDelUsuario(): Promise<string | null> {
    return 'Quien imprime';
  }

  async marcarImpresion(contrasenaId: string): Promise<boolean> {
    const guardada = this.guardadas.find(({ id }) => id === contrasenaId);
    if (!guardada || guardada.impresaEn) return false;
    guardada.impresaEn = '2026-06-01T10:00:00.000Z';
    return true;
  }

  private comoGuardada({ id, vigente, anulacion, impresaEn, documentoIds: _ids, ...datos }: Guardada) {
    return {
      ...datos,
      id,
      proveedorNombre: 'Proveedor',
      proveedorNit: '1234567',
      estado: vigente ? ('vigente' as const) : ('anulada' as const),
      impresaEn: impresaEn ?? null,
      anulacion: anulacion
        ? { motivo: anulacion.motivo, anuladaPorNombre: 'Quien anuló', anuladaEn: '2026-03-11T00:00:00.000Z' }
        : null,
      creadoPorNombre: 'Quien creó',
      creadoEn: '2026-03-10T00:00:00.000Z',
    };
  }
}
