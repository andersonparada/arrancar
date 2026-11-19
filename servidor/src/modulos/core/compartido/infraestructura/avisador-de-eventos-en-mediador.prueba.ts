import { describe, expect, it } from 'vitest';
import type { AvisosEntreModulos } from '../../contratos/mediador.contratos.js';
import type { Operador } from '../aplicacion/operador.js';
import { EventoDominio } from '../dominio/evento-dominio.js';
import { AvisadorDeEventosEnMediador } from './avisador-de-eventos-en-mediador.js';

class HechoDePrueba extends EventoDominio<{ monto: number }> {
  readonly nombre = 'prueba.hecho';

  constructor() {
    super({ monto: 5 });
  }
}

describe('avisador de eventos registrados en el mediador', () => {
  it('avisa core.eventos_registrados con los datos de cada evento y el contexto, sin superacceso', async () => {
    const recibidos: { operador: Operador; aviso: string; datos: unknown }[] = [];
    const mediador = {
      avisar: async (operador: Operador, aviso: keyof AvisosEntreModulos, datos: unknown) => {
        recibidos.push({ operador, aviso, datos });
      },
    };
    const evento = new HechoDePrueba();

    await new AvisadorDeEventosEnMediador(mediador as never).eventosRegistrados(
      { empresaId: 'e', cuentaId: 'c', usuarioId: 'u' },
      [evento],
    );

    expect(recibidos).toHaveLength(1);
    expect(recibidos[0]!.aviso).toBe('core.eventos_registrados');
    expect(recibidos[0]!.operador).toEqual({ empresaId: 'e', cuentaId: 'c', usuarioId: 'u', esSuperacceso: false });
    expect(recibidos[0]!.datos).toEqual({
      eventos: [
        { id: evento.id, nombre: 'prueba.hecho', version: 1, datos: { monto: 5 }, ocurridoEn: evento.ocurridoEn },
      ],
    });
  });
});
