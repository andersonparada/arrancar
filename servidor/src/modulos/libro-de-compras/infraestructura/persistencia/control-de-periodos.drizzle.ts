import { and, desc, eq, ne } from 'drizzle-orm';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AjusteDelControl,
  ControlDePeriodos,
  EstadoDelPeriodo,
  ModoDeControl,
} from '../../aplicacion/puertos/puertos-de-periodos.js';
import type { DeclaracionCitada } from '../../dominio/periodos/avisos-de-periodos.js';
import { declaracionesDePeriodos as declaraciones, periodos } from './periodos.tablas.js';

const abierto = (periodo: string): EstadoDelPeriodo => ({
  periodo,
  declarado: false,
  bloquea: false,
  ultimaDeclaracion: null,
});

/**
 * Los períodos declarados frente al bloqueo de la empresa. Con el bloqueo apagado solo lee; encendido, `bloquear` crea
 * la fila abierta si falta y la toma con `for share`, así declarar (`for update`) espera a los registros en curso y
 * los registros posteriores ven el período declarado.
 */
export class ControlDePeriodosEnBaseDeDatos implements ControlDePeriodos {
  constructor(private readonly ajuste: Pick<AjusteDelControl, 'encendido'>) {}

  async estadoDe(periodo: string, modo: ModoDeControl): Promise<EstadoDelPeriodo> {
    const encendido = await this.ajuste.encendido();
    const fila = await this.fila(periodo, encendido && modo === 'bloquear');
    if (fila?.estado !== 'declarado') return abierto(periodo);
    return {
      periodo,
      declarado: true,
      bloquea: encendido,
      ultimaDeclaracion: await this.ultimaDeclaracion(periodo),
    };
  }

  async bloqueados(): Promise<string[]> {
    if (!(await this.ajuste.encendido())) return [];
    const filas = await transaccionEnCurso()
      .select({ periodo: periodos.periodo })
      .from(periodos)
      .where(and(eq(periodos.empresaId, contextoEnCurso().empresaId), eq(periodos.estado, 'declarado')))
      .orderBy(periodos.periodo);
    return filas.map((fila) => fila.periodo);
  }

  private async fila(periodo: string, tomar: boolean) {
    const transaccion = transaccionEnCurso();
    const { empresaId } = contextoEnCurso();
    if (tomar) await transaccion.insert(periodos).values({ empresaId, periodo }).onConflictDoNothing();
    const consulta = transaccion
      .select({ estado: periodos.estado })
      .from(periodos)
      .where(and(eq(periodos.empresaId, empresaId), eq(periodos.periodo, periodo)));
    const [fila] = tomar ? await consulta.for('share') : await consulta;
    return fila;
  }

  private async ultimaDeclaracion(periodo: string): Promise<DeclaracionCitada> {
    const [fila] = await transaccionEnCurso()
      .select({
        formulario: declaraciones.formulario,
        numero: declaraciones.numeroDeFormulario,
        fecha: declaraciones.fechaDePresentacion,
      })
      .from(declaraciones)
      .where(and(eq(declaraciones.periodo, periodo), ne(declaraciones.evento, 'reapertura')))
      .orderBy(desc(declaraciones.secuencia))
      .limit(1);
    return {
      formulario: fila?.formulario ?? 'sin_formulario',
      numeroDeFormulario: fila?.numero ?? null,
      fecha: fila?.fecha ?? periodo,
    };
  }
}
