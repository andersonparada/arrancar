import type { EmpresaId } from './empresa.js';
import {
  CargaInicialAbierta,
  CargaInicialCerrada,
  FechaDeInicioInvalida,
  MotivoDeReaperturaInvalido,
} from './errores.js';

const LARGO_MAXIMO_DEL_MOTIVO = 500;
const FORMATO_DE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Quién cerró la carga inicial y cuándo. */
export interface CierreDeCarga {
  cerradaEn: Date;
  cerradaPor: string;
}

export interface PropiedadesDeCargaInicial {
  empresaId: EmpresaId;
  /** Desde qué día lleva la empresa su contabilidad en Arrancar (`aaaa-mm-dd`). */
  fechaDeInicio: string;
  cierre: CierreDeCarga | null;
}

/** La fecha debe existir en el calendario: 2026-02-30 no vale. */
function fechaValida(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  const existe =
    FORMATO_DE_FECHA.test(fecha) && new Date(Date.UTC(anio, mes - 1, dia)).toISOString().slice(0, 10) === fecha;
  if (!existe) throw new FechaDeInicioInvalida(fecha);
  return fecha;
}

/**
 * Fecha de inicio de una empresa y estado de su carga inicial (saldos con los que arranca en
 * Arrancar). Mientras está abierta, los módulos registran sus saldos iniciales y la fecha se
 * puede corregir; al cerrarla queda fija hasta que alguien con permiso la reabra.
 */
export class CargaInicial {
  private constructor(private propiedades: PropiedadesDeCargaInicial) {}

  /** @throws FechaDeInicioInvalida si no es una fecha real `aaaa-mm-dd`. */
  static iniciar(empresaId: EmpresaId, fechaDeInicio: string): CargaInicial {
    return new CargaInicial({ empresaId, fechaDeInicio: fechaValida(fechaDeInicio), cierre: null });
  }

  static reconstruir(propiedades: PropiedadesDeCargaInicial): CargaInicial {
    return new CargaInicial(propiedades);
  }

  /** @throws CargaInicialCerrada si ya está cerrada. @throws FechaDeInicioInvalida si la fecha no existe. */
  cambiarFechaDeInicio(fechaDeInicio: string): void {
    this.exigirAbierta();
    this.propiedades = { ...this.propiedades, fechaDeInicio: fechaValida(fechaDeInicio) };
  }

  /** @throws CargaInicialCerrada si ya estaba cerrada. */
  cerrar(cierre: CierreDeCarga): void {
    this.exigirAbierta();
    this.propiedades = { ...this.propiedades, cierre };
  }

  /**
   * Vuelve a abrirla. Devuelve el motivo sin espacios sobrantes, para dejarlo en la auditoría.
   * @throws CargaInicialAbierta si no estaba cerrada. @throws MotivoDeReaperturaInvalido si falta o pasa de 500 caracteres.
   */
  reabrir(motivo: string): string {
    if (!this.estaCerrada) throw new CargaInicialAbierta();
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio || motivoLimpio.length > LARGO_MAXIMO_DEL_MOTIVO) throw new MotivoDeReaperturaInvalido();
    this.propiedades = { ...this.propiedades, cierre: null };
    return motivoLimpio;
  }

  get estaCerrada(): boolean {
    return this.propiedades.cierre !== null;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeCargaInicial> {
    return { ...this.propiedades };
  }

  private exigirAbierta(): void {
    if (this.estaCerrada) throw new CargaInicialCerrada();
  }
}
