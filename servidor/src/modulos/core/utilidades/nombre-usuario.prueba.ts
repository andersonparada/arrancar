import { describe, expect, it } from 'vitest';
import { generarCandidatosUsuario } from './nombre-usuario.js';

describe('generarCandidatosUsuario', () => {
  it('propone primero la inicial del nombre y el primer apellido', () => {
    expect(generarCandidatosUsuario('Juan', 'López')[0]).toBe('jlopez');
  });

  it('como segunda opción usa ambos nombres y la inicial del segundo apellido', () => {
    const candidatos = generarCandidatosUsuario('Anderson Magdiel', 'Parada Alvizures');
    expect(candidatos.slice(0, 2)).toEqual(['aparada', 'amparadaa']);
  });

  it('dos personas parecidas tienen segunda opción distinta', () => {
    const anderson = generarCandidatosUsuario('Anderson Magdiel', 'Parada Alvizures');
    const otro = generarCandidatosUsuario('Anderson Martín', 'Parada Alburez');
    expect(anderson[0]).toBe(otro[0]);
    expect(otro[1]).toBe('amparadaa');
    expect(anderson[2]).toBe('amparadaalvizures');
    expect(otro[2]).toBe('amparadaalburez');
  });

  it('solo produce letras: quita tildes, ñ y signos', () => {
    const candidatos = generarCandidatosUsuario('José Ñoño', "Muñoz O'Brien");
    expect(candidatos[0]).toBe('jmunoz');
    for (const candidato of candidatos) expect(candidato).toMatch(/^[a-z]+$/);
  });

  it('ignora partículas como "de" o "los"', () => {
    expect(generarCandidatosUsuario('María de los Ángeles', 'de León García').slice(0, 2)).toEqual([
      'mleon',
      'maleong',
    ]);
  });

  it('no repite candidatos cuando falta segundo nombre y segundo apellido', () => {
    const candidatos = generarCandidatosUsuario('Pedro', 'Ruiz');
    expect(new Set(candidatos).size).toBe(candidatos.length);
    expect(candidatos).toEqual(['pruiz', 'pedroruiz']);
  });

  it('descarta candidatos demasiado cortos', () => {
    expect(generarCandidatosUsuario('A', 'B')).toEqual([]);
  });
});
