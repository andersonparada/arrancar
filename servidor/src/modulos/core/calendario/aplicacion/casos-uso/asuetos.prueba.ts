import { describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../compartido/pruebas/dobles-compartidos.js';
import { CalendarioLaboral } from '../calendario-laboral.js';
import type { AsuetoDto, Asuetos } from '../puertos/asuetos.js';
import { AgregarAsueto } from './agregar-asueto.js';
import { ListarFeriados } from './listar-feriados.js';
import { QuitarAsueto } from './quitar-asueto.js';

const operador = operadorDePrueba({ esSuperacceso: true });

class AsuetosEnMemoria implements Asuetos {
  readonly guardados: AsuetoDto[] = [];

  async delAnio(anio: number) {
    return this.guardados.filter((a) => a.fecha.startsWith(String(anio)));
  }
  async buscarPorId(id: string) {
    return this.guardados.find((a) => a.id === id) ?? null;
  }
  async agregar(nuevo: { fecha: string; nombre: string }) {
    const asueto: AsuetoDto = { id: `id-${nuevo.fecha}`, origen: 'asueto_sat', ...nuevo };
    this.guardados.push(asueto);
    return asueto;
  }
  async eliminar(id: string) {
    this.guardados.splice(
      this.guardados.findIndex((a) => a.id === id),
      1,
    );
  }
}

function armar() {
  const asuetos = new AsuetosEnMemoria();
  const calendario = new CalendarioLaboral(asuetos);
  const auditoria = new AuditoriaEnMemoria();
  const base = { unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(), asuetos, calendario };
  return {
    asuetos,
    calendario,
    auditoria,
    listar: new ListarFeriados({ asuetos }),
    agregar: new AgregarAsueto(base),
    quitar: new QuitarAsueto({ ...base, auditoria }),
  };
}

describe('asuetos', () => {
  it('un asueto agregado deja de ser día hábil, aunque el año ya estuviera en la caché', async () => {
    const { calendario, agregar } = armar();
    expect(await calendario.esHabil('2026-10-07')).toBe(true);

    await agregar.ejecutar(operador, { fecha: '2026-10-07', nombre: 'Asueto por duelo nacional' });

    expect(await calendario.esHabil('2026-10-07')).toBe(false);
  });

  it('al quitarlo vuelve a ser hábil y queda en la auditoría', async () => {
    const { calendario, agregar, quitar, auditoria } = armar();
    const asueto = await agregar.ejecutar(operador, { fecha: '2026-10-07', nombre: 'Duelo' });
    expect(await calendario.esHabil('2026-10-07')).toBe(false);

    await quitar.ejecutar(operador, asueto.id);

    expect(await calendario.esHabil('2026-10-07')).toBe(true);
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'core.feriados',
        registroId: asueto.id,
        accion: 'eliminar',
        anterior: asueto,
      }),
    ]);
  });

  it('quitar un asueto que no existe falla y no audita', async () => {
    const { quitar, auditoria } = armar();

    await expect(quitar.ejecutar(operador, 'no-existe')).rejects.toThrow(/no existe/);
    expect(auditoria.entradas).toEqual([]);
  });

  it('rechaza una fecha que no existe', async () => {
    const { agregar } = armar();

    await expect(agregar.ejecutar(operador, { fecha: '2026-02-30', nombre: 'X' })).rejects.toThrow(/fecha válida/);
  });
});

describe('ListarFeriados', () => {
  it('mezcla calculados y asuetos por fecha; solo los asuetos traen id', async () => {
    const { listar, agregar } = armar();
    await agregar.ejecutar(operador, { fecha: '2026-10-07', nombre: 'Duelo' });

    const feriados = await listar.ejecutar(2026);

    expect(feriados).toHaveLength(13);
    expect(feriados.find((f) => f.fecha === '2026-10-07')).toMatchObject({ id: 'id-2026-10-07', origen: 'asueto_sat' });
    expect(feriados.find((f) => f.fecha === '2026-10-20')).toMatchObject({ id: null, origen: 'fijo' });
    expect(feriados.map((f) => f.fecha)).toEqual([...feriados.map((f) => f.fecha)].sort());
  });
});
