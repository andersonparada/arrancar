import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CerrojoDeCorrida,
  ExploradorDeArchivos,
  RegistroDeRutas,
  RegistroDeTexto,
} from '../puertos/depuracion-de-archivos.js';
import { DepurarArchivosHuerfanos, LIMITES_DE_LA_DEPURACION } from './depurar-archivos-huerfanos.js';

const AHORA = new Date('2026-11-13T12:00:00Z');
const HORA = 60 * 60 * 1000;
const haceHoras = (horas: number) => new Date(AHORA.getTime() - horas * HORA);

class ExploradorEnMemoria implements ExploradorDeArchivos {
  readonly modificados = new Map<string, Date>();
  readonly borrados: string[] = [];
  fallaAlBorrar = new Set<string>();

  async *listarModificadosAntesDe(antesDe: Date): AsyncIterable<string> {
    for (const [ruta, fecha] of this.modificados) if (fecha < antesDe) yield ruta;
  }

  async borrar(ruta: string): Promise<void> {
    if (this.fallaAlBorrar.has(ruta)) throw new Error('sin permiso');
    this.borrados.push(ruta);
  }
}

class RegistroEnMemoria implements RegistroDeRutas {
  readonly registrados = new Set<string>();
  readonly consultas: number[] = [];
  falla = false;

  async registradas(rutas: readonly string[]): Promise<ReadonlySet<string>> {
    this.consultas.push(rutas.length);
    if (this.falla) throw new Error('base caída');
    return new Set(rutas.filter((ruta) => this.registrados.has(ruta)));
  }
}

class CerrojoEnMemoria implements CerrojoDeCorrida {
  ocupado = false;

  async ejecutarSiLibre<R>(trabajo: () => Promise<R>): Promise<R | null> {
    return this.ocupado ? null : trabajo();
  }
}

class TextoEnMemoria implements RegistroDeTexto {
  readonly mensajes: string[] = [];
  readonly advertencias: string[] = [];
  info = (mensaje: string) => void this.mensajes.push(mensaje);
  advertencia = (mensaje: string) => void this.advertencias.push(mensaje);
}

let explorador: ExploradorEnMemoria;
let registro: RegistroEnMemoria;
let texto: TextoEnMemoria;
let cerrojo: CerrojoEnMemoria;
let depurar: DepurarArchivosHuerfanos;

beforeEach(() => {
  explorador = new ExploradorEnMemoria();
  registro = new RegistroEnMemoria();
  texto = new TextoEnMemoria();
  cerrojo = new CerrojoEnMemoria();
  depurar = new DepurarArchivosHuerfanos({ explorador, registro, cerrojo, registroDeTexto: texto, ahora: () => AHORA });
});

function soltar(cantidad: number, prefijo = 'e/2026/10/suelto'): string[] {
  const rutas = Array.from({ length: cantidad }, (_, i) => `${prefijo}-${i}.pdf`);
  for (const ruta of rutas) explorador.modificados.set(ruta, haceHoras(48));
  return rutas;
}

describe('depurar archivos huérfanos', () => {
  it('borra solo lo que no está registrado, y deja lo registrado', async () => {
    explorador.modificados.set('e/2026/10/registrado.pdf', haceHoras(48));
    explorador.modificados.set('e/2026/10/suelto.pdf', haceHoras(48));
    registro.registrados.add('e/2026/10/registrado.pdf');

    const resultado = await depurar.ejecutar();

    expect(explorador.borrados).toEqual(['e/2026/10/suelto.pdf']);
    expect(resultado).toEqual({ revisados: 2, borrados: 1, topeAlcanzado: false, detenidaPorSospecha: false });
  });

  it('respeta las 24 horas: lo más reciente nunca es candidato, ni siquiera se consulta', async () => {
    explorador.modificados.set('e/2026/11/en-curso.pdf', haceHoras(23));
    explorador.modificados.set('e/2026/11/justo.pdf', haceHoras(24));

    const resultado = await depurar.ejecutar();

    expect(explorador.borrados).toEqual([]);
    expect(registro.consultas).toEqual([]);
    expect(resultado?.revisados).toBe(0);
  });

  it('pregunta en tandas de 500 rutas', async () => {
    soltar(1200);
    for (const ruta of explorador.modificados.keys()) registro.registrados.add(ruta);

    await depurar.ejecutar();

    expect(registro.consultas).toEqual([500, 500, 200]);
    expect(explorador.borrados).toEqual([]);
  });

  it('si una tanda completa de 500 no trae ninguna registrada, se detiene sin borrar y avisa', async () => {
    soltar(1200);

    const resultado = await depurar.ejecutar();

    expect(resultado).toMatchObject({ borrados: 0, detenidaPorSospecha: true });
    expect(explorador.borrados).toEqual([]);
    expect(registro.consultas).toEqual([500]);
    expect(texto.advertencias.join(' ')).toContain('ninguna ruta registrada');
  });

  it('una tanda corta sin registradas sí se depura (pocos archivos sueltos de verdad)', async () => {
    soltar(499);

    const resultado = await depurar.ejecutar();

    expect(resultado).toMatchObject({ borrados: 499, detenidaPorSospecha: false });
  });

  it('si otra instancia tiene el cerrojo, no hace nada', async () => {
    soltar(3);
    cerrojo.ocupado = true;

    expect(await depurar.ejecutar()).toBeNull();
    expect(registro.consultas).toEqual([]);
    expect(explorador.borrados).toEqual([]);
  });

  it('borra como máximo 1,000 por corrida y lo deja dicho en el registro', async () => {
    const rutas = soltar(LIMITES_DE_LA_DEPURACION.borradosPorCorrida + 300);
    for (const ruta of rutas.filter((_, i) => i % 500 === 0)) registro.registrados.add(ruta);

    const resultado = await depurar.ejecutar();

    expect(explorador.borrados).toHaveLength(LIMITES_DE_LA_DEPURACION.borradosPorCorrida);
    expect(resultado?.topeAlcanzado).toBe(true);
    expect(texto.advertencias.join(' ')).toContain('tope');
  });

  it('si la consulta falla no borra nada de esa tanda y propaga el error', async () => {
    soltar(3);
    registro.falla = true;

    await expect(depurar.ejecutar()).rejects.toThrow('base caída');
    expect(explorador.borrados).toEqual([]);
  });

  it('un archivo que no se puede borrar no detiene a los demás ni se cuenta', async () => {
    const [primero, segundo] = soltar(2);
    explorador.fallaAlBorrar.add(primero!);

    const resultado = await depurar.ejecutar();

    expect(explorador.borrados).toEqual([segundo]);
    expect(resultado?.borrados).toBe(1);
    expect(texto.advertencias[0]).toContain(primero!);
  });

  it('registra conteos y la ruta relativa de cada borrado, y nada más', async () => {
    const [ruta] = soltar(1);

    await depurar.ejecutar();

    expect(texto.mensajes).toEqual([
      `Archivo huérfano borrado: ${ruta}`,
      'Depuración de archivos huérfanos: 1 revisados, 1 borrados.',
    ]);
  });
});
