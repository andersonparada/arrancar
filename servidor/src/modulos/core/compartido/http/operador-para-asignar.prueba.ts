import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import type { ContextoDeSesion } from '../aplicacion/contexto-de-sesion.js';
import { AccesoDenegado } from '../aplicacion/errores.js';
import { operadorDe } from './operador-de-la-solicitud.js';
import { operadorParaAsignar } from './operador-para-asignar.js';

const solicitud = (recursosParaAsignar: string[]) =>
  ({
    contexto: {
      sesionId: 's',
      usuario: { id: 'u', usuario: 'u', nombre: 'U', esSuperacceso: false },
      empresa: { id: 'e', nombre: 'E', cuentaId: 'c', cuentaNombre: 'C' },
      roles: [],
      modulosActivos: new Set(),
      permisos: new Set(),
      recursosAlcanceTotal: ['x.y'],
      recursosParaAsignar,
    } satisfies ContextoDeSesion,
  }) as unknown as FastifyRequest;

describe('operadorParaAsignar', () => {
  it('con el permiso de asignar abre solo ese recurso', () => {
    const operador = operadorParaAsignar(solicitud(['x.y', 'x.z']), 'x.y');

    expect(operador.recursosParaAsignar).toEqual(['x.y']);
    expect(operador.empresaId).toBe('e');
  });

  it('sin el permiso de asignar del recurso responde acceso denegado', () => {
    expect(() => operadorParaAsignar(solicitud(['x.z']), 'x.y')).toThrow(AccesoDenegado);
  });

  it('el operador normal nunca lleva recursos para asignar', () => {
    expect(operadorDe(solicitud(['x.y'])).recursosParaAsignar).toBeUndefined();
  });
});
