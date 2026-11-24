import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import { bajaADto } from '../aplicacion/dto/baja-a-dto.js';
import type { BajaDto } from '../aplicacion/dto/baja.dto.js';
import type { ConsultasBajas } from '../aplicacion/puertos/consultas-bajas.js';
import type { RepositorioBajas } from '../aplicacion/puertos/repositorio-bajas.js';
import type { Baja, BajaId } from '../dominio/baja.js';
import type { IncisoFiscal } from '../dominio/incisos-fiscales.js';
import type { ActivosEnMemoria } from './dobles-de-activos.js';

/** Las bajas en memoria: repositorio y consultas a la vez, con los avisos que da el dominio. */
export class BajasEnMemoria implements RepositorioBajas, ConsultasBajas {
  readonly registros = new Map<string, Baja>();
  tipoDePersona: 'individual' | 'juridica' | null = 'juridica';
  incisoFiscal: IncisoFiscal = 'maquinaria_y_vehiculos';

  constructor(private readonly activos: ActivosEnMemoria) {}

  async agregarVarios(bajas: readonly Baja[]): Promise<void> {
    for (const baja of bajas) this.registros.set(baja.id.valor, baja);
  }

  async buscar(id: BajaId): Promise<Baja | null> {
    return this.registros.get(id.valor) ?? null;
  }

  buscarBloqueando(id: BajaId): Promise<Baja | null> {
    return this.buscar(id);
  }

  async guardar(baja: Baja): Promise<void> {
    this.registros.set(baja.id.valor, baja);
  }

  async delActo({ numero, anioDeNumero }: { numero: number; anioDeNumero: number }): Promise<Baja[]> {
    return [...this.registros.values()].filter((baja) => {
      const p = baja.instantanea();
      return p.numero === numero && p.anioDeNumero === anioDeNumero;
    });
  }

  async portadoraDeDocumentos(baja: Baja): Promise<Baja> {
    const propias = baja.instantanea();
    const padreId = this.activos.registros.get(propias.activoId)?.instantanea().activoPadreId;
    const delActo = await this.delActo(propias);
    const del = delActo.find((otra) => {
      const p = otra.instantanea();
      return p.activoId === padreId && p.estado === propias.estado;
    });
    return padreId && del ? del : baja;
  }

  async vigenteDeActivo(activoId: string): Promise<Baja | null> {
    const vigentes = [...this.registros.values()].filter((baja) => {
      const p = baja.instantanea();
      return p.activoId === activoId && p.estado === 'vigente';
    });
    return vigentes[0] ?? null;
  }

  async obtener(bajaId: string): Promise<BajaDto> {
    const baja = this.registros.get(bajaId);
    if (!baja) throw new RecursoNoEncontrado('La baja');
    return this.aDto(baja);
  }

  async deActivo(activoId: string): Promise<BajaDto | null> {
    const baja = await this.vigenteDeActivo(activoId);
    return baja ? this.aDto(baja) : null;
  }

  private async aDto(baja: Baja): Promise<BajaDto> {
    const propiedades = baja.instantanea();
    const activo = this.activos.registros.get(propiedades.activoId)!.instantanea();
    const delActo = await this.delActo(propiedades);
    const componentes = delActo.flatMap((otra) => {
      const hijo = this.activos.registros.get(otra.instantanea().activoId)!.instantanea();
      const esHijo = hijo.activoPadreId === propiedades.activoId && otra.instantanea().estado === propiedades.estado;
      return esHijo ? [{ activoId: hijo.id.valor, codigo: hijo.codigo, descripcion: hijo.descripcion }] : [];
    });
    const { acta, denunciaArchivoId } = (await this.portadoraDeDocumentos(baja)).instantanea();
    return bajaADto(
      { ...propiedades, acta, denunciaArchivoId },
      {
        activo: { ...activo, id: activo.id.valor, claseNombre: 'Clase de prueba' },
        componentes,
        incisoFiscal: this.incisoFiscal,
        tipoDePersona: this.tipoDePersona,
      },
    );
  }
}
