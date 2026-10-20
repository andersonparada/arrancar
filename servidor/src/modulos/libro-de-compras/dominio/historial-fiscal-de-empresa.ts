import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import type { DatosFiscalesDeEmpresa, TipoDePersona } from './datos-fiscales-de-empresa.js';
import { DatosFiscalesInvalidos } from './errores.js';
import { sumarMeses } from './periodo-del-libro.js';

/** La vigencia «desde el inicio» (la base) no se quita: la empresa siempre tiene un régimen. */
export class VigenciaBaseNoSeQuita extends ReglaDeNegocioInfringida {
  readonly codigo = 'vigencia_base_no_se_quita';

  constructor() {
    super('La vigencia inicial no se quita: corríjala o registre el cambio a partir del mes que corresponde.');
  }
}

/** Cambia el tipo de persona de una vigencia; si la deja contradictoria, explica que el tipo es igual en todas. */
function conTipoDePersonaExplicado(vigencia: VigenciaFiscal, tipoDePersona: TipoDePersona): VigenciaFiscal {
  try {
    return { ...vigencia, datos: vigencia.datos.conTipoDePersona(tipoDePersona) };
  } catch (error) {
    if (!(error instanceof DatosFiscalesInvalidos)) throw error;
    throw new DatosFiscalesInvalidos([
      {
        campo: 'tipoDePersona',
        mensaje: `El tipo de persona es el mismo en todas las vigencias del historial y, con ese tipo, una de ellas queda mal: ${error.message} Corrija o quite esa vigencia primero.`,
      },
    ]);
  }
}

/** Un escalón del historial. `id` es nulo mientras no se ha guardado. `vigenteDesde` nulo es «desde el inicio». */
export interface VigenciaFiscal {
  id: string | null;
  vigenteDesde: string | null;
  datos: DatosFiscalesDeEmpresa;
}

/** Meses seguidos de un historial: `hasta` es el último mes incluido; nulo en `desde` o `hasta` es sin límite. */
export interface RangoDePeriodos {
  desde: string | null;
  hasta: string | null;
}

/** «Estos datos rigen desde `vigenteDesde` hasta la siguiente vigencia que ya exista.» */
export interface CambioDeVigencia {
  vigenteDesde: string | null;
  datos: DatosFiscalesDeEmpresa;
}

/** Lo que hay que escribir para llevar un historial guardado a otro. */
export interface DiferenciasDelHistorial {
  eliminar: string[];
  actualizar: VigenciaFiscal[];
  insertar: VigenciaFiscal[];
}

const ANTES_DE_TODO = '0000-01-01';

/** Si dos vigencias seguidas dicen lo mismo, la segunda sobra (no hay escalones repetidos). */
function sinEscalonesRepetidos(vigencias: readonly VigenciaFiscal[]): VigenciaFiscal[] {
  const conservadas: VigenciaFiscal[] = [];
  for (const vigencia of vigencias) {
    const anterior = conservadas.at(-1);
    if (!anterior?.datos.tieneLosMismosDatosFiscalesQue(vigencia.datos)) conservadas.push(vigencia);
  }
  return conservadas;
}

const ordenCronologico = (a: VigenciaFiscal, b: VigenciaFiscal): number =>
  (a.vigenteDesde ?? ANTES_DE_TODO).localeCompare(b.vigenteDesde ?? ANTES_DE_TODO);

/**
 * El historial fiscal de una empresa, en escalones: cada vigencia rige desde su mes hasta el mes anterior al de la
 * siguiente. Inmutable: cada cambio devuelve otro historial. Siempre empieza por la base (`vigenteDesde` nulo), y el
 * tipo de persona es el mismo en todas las vigencias.
 */
export class HistorialFiscalDeEmpresa {
  private readonly lista: readonly VigenciaFiscal[];

  constructor(vigencias: readonly VigenciaFiscal[] = []) {
    this.lista = [...vigencias].sort(ordenCronologico);
  }

  /** Las vigencias, de la más antigua a la más nueva. */
  vigencias(): readonly VigenciaFiscal[] {
    return this.lista;
  }

  estaVacio(): boolean {
    return this.lista.length === 0;
  }

  buscar(id: string): VigenciaFiscal | undefined {
    return this.lista.find((vigencia) => vigencia.id === id);
  }

  /** La vigencia que rige en un período (o fecha): la última que empezó en o antes de él. */
  vigenteEn(periodo: string): VigenciaFiscal | null {
    const empezadas = this.lista.filter((v) => v.vigenteDesde === null || v.vigenteDesde <= periodo);
    return empezadas.at(-1) ?? null;
  }

  /** El último mes de una vigencia, o `null` si es la última del historial. */
  vigenteHasta(vigencia: VigenciaFiscal): string | null {
    const siguiente = this.lista[this.lista.indexOf(vigencia) + 1];
    return siguiente?.vigenteDesde ? sumarMeses(siguiente.vigenteDesde, -1) : null;
  }

  /**
   * Aplica «estos datos rigen desde tal mes»: sin historial, crea la base; si el mes es el de una vigencia, la
   * corrige; si cae dentro de un escalón y cambia algo, parte el escalón desde ese mes; si no cambia nada, no
   * hace nada. Siempre deja el mismo tipo de persona en todas y ningún escalón repetido.
   */
  aplicar({ vigenteDesde, datos }: CambioDeVigencia): HistorialFiscalDeEmpresa {
    if (this.estaVacio()) return new HistorialFiscalDeEmpresa([{ id: null, vigenteDesde: null, datos }]);
    const conElCambio = new HistorialFiscalDeEmpresa(this.conElCambio({ vigenteDesde, datos }));
    const mismaPersona = conElCambio.conTipoDePersona(datos.instantanea().tipoDePersona);
    return new HistorialFiscalDeEmpresa(sinEscalonesRepetidos(mismaPersona.lista));
  }

  /**
   * El historial sin esa vigencia: su escalón pasa a la vigencia anterior.
   * @throws VigenciaBaseNoSeQuita si es la base.
   */
  quitar(id: string): HistorialFiscalDeEmpresa {
    if (this.buscar(id)?.vigenteDesde === null) throw new VigenciaBaseNoSeQuita();
    const restantes = this.lista.filter((vigencia) => vigencia.id !== id);
    return new HistorialFiscalDeEmpresa(sinEscalonesRepetidos(restantes));
  }

  /** Los mismos escalones con otro tipo de persona en todos. */
  conTipoDePersona(tipoDePersona: TipoDePersona): HistorialFiscalDeEmpresa {
    return new HistorialFiscalDeEmpresa(this.lista.map((v) => conTipoDePersonaExplicado(v, tipoDePersona)));
  }

  /** Los períodos donde este historial y `despues` dicen algo distinto en alguno de los cuatro datos fiscales. */
  rangosAfectados(despues: HistorialFiscalDeEmpresa): RangoDePeriodos[] {
    const cortes = [
      null,
      ...new Set([...this.lista, ...despues.lista].map((v) => v.vigenteDesde).filter(Boolean)),
    ].sort((a, b) => (a ?? ANTES_DE_TODO).localeCompare(b ?? ANTES_DE_TODO)) as (string | null)[];
    const rangos: RangoDePeriodos[] = [];
    cortes.forEach((desde, i) => {
      const siguiente = cortes[i + 1];
      const hasta = siguiente ? sumarMeses(siguiente, -1) : null;
      if (this.difiereEn(despues, desde ?? ANTES_DE_TODO)) this.agregarRango(rangos, { desde, hasta });
    });
    return rangos;
  }

  /** Si los dos historiales dicen lo mismo (no hay nada que escribir para pasar de uno al otro). */
  esIgualA(otro: HistorialFiscalDeEmpresa): boolean {
    const { eliminar, actualizar, insertar } = this.diferenciasCon(otro);
    return eliminar.length + actualizar.length + insertar.length === 0;
  }

  /** Qué escribir para pasar de este historial (guardado) a `nuevo`: lo que sobra, lo que cambió y lo que falta. */
  diferenciasCon(nuevo: HistorialFiscalDeEmpresa): DiferenciasDelHistorial {
    const ids = new Set(nuevo.lista.map((v) => v.id));
    const cambio = (v: VigenciaFiscal) => {
      const guardada = this.buscar(v.id!);
      return !guardada?.datos.esIgualA(v.datos) || guardada.vigenteDesde !== v.vigenteDesde;
    };
    return {
      eliminar: this.lista.map((v) => v.id!).filter((id) => !ids.has(id)),
      actualizar: nuevo.lista.filter((v) => v.id !== null && cambio(v)),
      insertar: nuevo.lista.filter((v) => v.id === null),
    };
  }

  /** Las vigencias con el cambio puesto: corregida la que empieza ese mes, o una nueva si ese mes cambia algo. */
  private conElCambio({ vigenteDesde, datos }: CambioDeVigencia): VigenciaFiscal[] {
    if (this.lista.some((v) => v.vigenteDesde === vigenteDesde)) {
      return this.lista.map((v) => (v.vigenteDesde === vigenteDesde ? { ...v, datos } : v));
    }
    const rige = this.vigenteEn(vigenteDesde ?? ANTES_DE_TODO);
    if (rige?.datos.tieneLosMismosDatosFiscalesQue(datos)) return [...this.lista];
    return [...this.lista, { id: null, vigenteDesde, datos }];
  }

  private difiereEn(otro: HistorialFiscalDeEmpresa, periodo: string): boolean {
    const mio = this.vigenteEn(periodo);
    const suyo = otro.vigenteEn(periodo);
    return !mio || !suyo || !mio.datos.tieneLosMismosDatosFiscalesQue(suyo.datos);
  }

  private agregarRango(rangos: RangoDePeriodos[], nuevo: RangoDePeriodos): void {
    const ultimo = rangos.at(-1);
    if (ultimo && ultimo.hasta !== null && sumarMeses(ultimo.hasta, 1) === nuevo.desde) ultimo.hasta = nuevo.hasta;
    else rangos.push(nuevo);
  }
}

/** El primer período con documentos que cae dentro de alguno de los rangos, o `undefined` si ninguno. */
export function primerPeriodoEnRangos(
  periodos: readonly string[],
  rangos: readonly RangoDePeriodos[],
): string | undefined {
  const dentro = (p: string) =>
    rangos.some((r) => (r.desde === null || p >= r.desde) && (r.hasta === null || p <= r.hasta));
  return [...periodos].sort().find(dentro);
}
