import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../compartido/pruebas/dobles-compartidos.js';
import { ManejadorDuplicadoParaLaOrden, ModuloNoDisponible } from './errores.js';
import { Mediador } from './mediador.js';
import type { ModulosActivosDeLaCuenta } from './puertos/modulos-activos-de-la-cuenta.js';

declare module '../../contratos/mediador.contratos.js' {
  interface OrdenesEntreModulos {
    'prueba.sumar': { datos: { a: number; b: number }; respuesta: number };
  }
  interface AvisosEntreModulos {
    'prueba.avisar': { mensaje: string };
  }
}

class ModulosActivosEnMemoria implements ModulosActivosDeLaCuenta {
  constructor(private readonly activos: ReadonlySet<string>) {}

  async activosPara(): Promise<ReadonlySet<string>> {
    return this.activos;
  }
}

class FalloProvocado extends Error {}

function mediadorCon(activos: readonly string[]): Mediador {
  return new Mediador({ modulosActivos: new ModulosActivosEnMemoria(new Set(activos)) });
}

describe('Mediador', () => {
  const operador = operadorDePrueba();

  describe('órdenes', () => {
    it('el módulo que la atiende responde', async () => {
      const mediador = mediadorCon(['calculadora']);
      mediador.atender('calculadora', 'prueba.sumar', async ({ a, b }) => a + b);

      await expect(mediador.enviar(operador, 'prueba.sumar', { a: 2, b: 3 })).resolves.toBe(5);
    });

    it('sin manejador registrado, falla con ModuloNoDisponible', async () => {
      const mediador = mediadorCon([]);

      await expect(mediador.enviar(operador, 'prueba.sumar', { a: 1, b: 1 })).rejects.toThrow(ModuloNoDisponible);
    });

    it('si el módulo que atiende no está activo en la cuenta, falla con ModuloNoDisponible', async () => {
      const mediador = mediadorCon([]);
      mediador.atender('calculadora', 'prueba.sumar', async ({ a, b }) => a + b);

      await expect(mediador.enviar(operador, 'prueba.sumar', { a: 1, b: 1 })).rejects.toThrow(ModuloNoDisponible);
    });

    it('propaga el error del manejador', async () => {
      const mediador = mediadorCon(['calculadora']);
      mediador.atender('calculadora', 'prueba.sumar', async () => {
        throw new FalloProvocado();
      });

      await expect(mediador.enviar(operador, 'prueba.sumar', { a: 1, b: 1 })).rejects.toThrow(FalloProvocado);
    });

    it('no deja registrar dos manejadores para la misma orden', () => {
      const mediador = mediadorCon(['calculadora']);
      mediador.atender('calculadora', 'prueba.sumar', async ({ a, b }) => a + b);

      expect(() => mediador.atender('otra', 'prueba.sumar', async ({ a, b }) => a + b)).toThrow(
        ManejadorDuplicadoParaLaOrden,
      );
    });
  });

  describe('avisos', () => {
    let recibidos: string[];

    beforeEach(() => {
      recibidos = [];
    });

    it('lo reciben varios módulos, en el orden en que se registraron', async () => {
      const mediador = mediadorCon(['uno', 'dos']);
      mediador.escuchar('uno', 'prueba.avisar', async ({ mensaje }) => void recibidos.push(`uno:${mensaje}`));
      mediador.escuchar('dos', 'prueba.avisar', async ({ mensaje }) => void recibidos.push(`dos:${mensaje}`));

      await mediador.avisar(operador, 'prueba.avisar', { mensaje: 'hola' });

      expect(recibidos).toEqual(['uno:hola', 'dos:hola']);
    });

    it('no llama a los manejadores de módulos inactivos', async () => {
      const mediador = mediadorCon(['uno']);
      mediador.escuchar('uno', 'prueba.avisar', async () => void recibidos.push('uno'));
      mediador.escuchar('dos', 'prueba.avisar', async () => void recibidos.push('dos'));

      await mediador.avisar(operador, 'prueba.avisar', { mensaje: 'hola' });

      expect(recibidos).toEqual(['uno']);
    });

    it('si un manejador rechaza el aviso, el error se propaga', async () => {
      const mediador = mediadorCon(['uno', 'dos']);
      mediador.escuchar('uno', 'prueba.avisar', async () => {
        throw new FalloProvocado();
      });
      mediador.escuchar('dos', 'prueba.avisar', async () => void recibidos.push('dos'));

      await expect(mediador.avisar(operador, 'prueba.avisar', { mensaje: 'hola' })).rejects.toThrow(FalloProvocado);
      expect(recibidos).toEqual([]);
    });
  });
});
