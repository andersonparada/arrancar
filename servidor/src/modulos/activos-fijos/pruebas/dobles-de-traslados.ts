import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { BoletaDto, BoletaFirmadaDto } from '../aplicacion/dto/traslado.dto.js';
import type { ConsultasTraslados } from '../aplicacion/puertos/consultas-traslados.js';
import type { RepositorioTraslados, UbicacionRegistrada } from '../aplicacion/puertos/repositorio-traslados.js';
import type { Activo } from '../dominio/activo.js';
import type { Traslado } from '../dominio/traslado.js';
import type { ActivosEnMemoria } from './dobles-de-activos.js';

interface FilaDeHistorial extends UbicacionRegistrada {
  secuencia: number;
  traslado: Traslado | null;
}

/**
 * El historial de ubicación en memoria, como lo dejaría la base: una fila de alta por activo (la prueba la registra) y
 * los traslados; la vigente es la de mayor `(fecha, orden de creación)` que no esté anulada.
 */
export class TrasladosEnMemoria implements RepositorioTraslados, ConsultasTraslados {
  readonly filas: FilaDeHistorial[] = [];
  titulo = 'Responsiva de bienes';
  private secuencia = 0;
  private readonly activoDeAlta = new Map<string, string>();

  constructor(private readonly activos: ActivosEnMemoria) {}

  /** La fila del alta, con la ubicación y la fecha de adquisición que el activo tiene al crearse. */
  registrarAlta(activo: Activo): void {
    const { id, fechaDeAdquisicion, localidadId, departamentoId, responsable, enBodega } = activo.instantanea();
    this.filas.push({
      trasladoId: `alta-${id.valor}`,
      fecha: fechaDeAdquisicion,
      localidadId,
      departamentoId,
      responsable,
      aBodega: enBodega,
      secuencia: this.secuencia++,
      traslado: null,
    });
    this.activoDeAlta.set(`alta-${id.valor}`, id.valor);
  }

  async agregarVarios(traslados: readonly Traslado[]): Promise<void> {
    for (const traslado of traslados) {
      const { id, fecha, localidadId, departamentoId, responsable, aBodega } = traslado.instantanea();
      const fila = { trasladoId: id.valor, fecha, localidadId, departamentoId, responsable, aBodega };
      this.filas.push({ ...fila, secuencia: this.secuencia++, traslado });
    }
  }

  async delGrupo(grupoId: string): Promise<Traslado[]> {
    return this.filas.flatMap((fila) => (fila.traslado?.instantanea().grupoId === grupoId ? [fila.traslado] : []));
  }

  async delGrupoBloqueando(grupoId: string): Promise<Traslado[]> {
    return this.delGrupo(grupoId);
  }

  async guardar(traslado: Traslado): Promise<void> {
    const fila = this.filas.find((candidata) => candidata.trasladoId === traslado.id.valor);
    if (fila) fila.traslado = traslado;
  }

  async recientesDeActivo(activoId: string, cantidad: number): Promise<UbicacionRegistrada[]> {
    const suyas = this.filas.filter(
      (fila) => this.esDelActivo(fila, activoId) && fila.traslado?.instantanea().estado !== 'anulado',
    );
    return suyas
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.secuencia - a.secuencia)
      .slice(0, cantidad)
      .map(({ secuencia: _s, traslado: _t, ...ubicacion }) => ubicacion);
  }

  private esDelActivo(fila: FilaDeHistorial, activoId: string): boolean {
    return (fila.traslado?.instantanea().activoId ?? this.activoDeAlta.get(fila.trasladoId)) === activoId;
  }

  /** Los escaneos firmados que dejó `BoletasFirmadasEnMemoria`, por boleta. */
  readonly firmadas = new Map<string, BoletaFirmadaDto>();

  async firmadaDe(grupoId: string): Promise<BoletaFirmadaDto | null> {
    return this.firmadas.get(grupoId) ?? null;
  }

  async boleta(grupoId: string): Promise<BoletaDto> {
    const renglones = await this.delGrupo(grupoId);
    const primero = renglones[0]?.instantanea();
    if (!primero) throw new RecursoNoEncontrado('La boleta de traslado');
    return {
      grupoId,
      numero: primero.numero,
      anioDeNumero: primero.anioDeNumero,
      titulo: this.titulo,
      fecha: primero.fecha,
      localidadNombre: primero.localidadId,
      departamentoNombre: primero.departamentoId,
      responsable: primero.responsable,
      recibidoPor: primero.recibidoPor,
      motivo: primero.motivo,
      aBodega: primero.aBodega,
      estado: primero.estado,
      anuladoEn: primero.anuladoEn?.toISOString() ?? null,
      motivoDeAnulacion: primero.motivoDeAnulacion,
      firmada: this.firmadas.get(grupoId) ?? null,
      renglones: renglones.map((renglon) => this.renglon(renglon)),
    };
  }

  private renglon(traslado: Traslado) {
    const activo = this.activos.registros.get(traslado.instantanea().activoId)!.instantanea();
    const principal = activo.activoPadreId ? this.activos.registros.get(activo.activoPadreId) : null;
    const { id, codigo, descripcion, marca, modelo, numeroDeSerie, placa, cantidad } = activo;
    return {
      activoId: id.valor,
      codigo,
      descripcion,
      marca,
      modelo,
      numeroDeSerie,
      placa,
      cantidad,
      componenteDe: principal?.instantanea().codigo ?? null,
    };
  }
}
