import { describe, expect, it } from 'vitest';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import {
  FacturasAnterioresPosterioresALaFecha,
  NotasRecibidasAntesDeLaFecha,
  type NotasQueEstorban,
} from '../../../dominio/errores-de-factura-anterior.js';
import type { NotasPorFechaDeInicio } from '../../puertos/puertos-de-fecha-de-inicio.js';
import { ValidarFechaDeInicio } from './validar-fecha-de-inicio.js';

interface NotaSembrada {
  id: string;
  numero: string;
  emisionDeLaFactura: string;
  recepcion: string;
}

const NINGUNA: NotasQueEstorban = { cantidad: 0, muestra: [] };

/** Las notas vigentes con factura anterior de la empresa, en memoria. */
class NotasEnMemoria implements NotasPorFechaDeInicio {
  constructor(private readonly notas: NotaSembrada[]) {}

  async conFacturaEmitidaDesde(fecha: string) {
    return this.resumir(this.notas.filter((nota) => nota.emisionDeLaFactura >= fecha));
  }

  async recibidasAntesDe(fecha: string) {
    return this.resumir(this.notas.filter((nota) => nota.recepcion < fecha));
  }

  private resumir(notas: NotaSembrada[]): NotasQueEstorban {
    if (notas.length === 0) return NINGUNA;
    return { cantidad: notas.length, muestra: notas.map(({ id, numero }) => ({ id, serie: null, numero })) };
  }
}

const nota = (cambios: Partial<NotaSembrada> = {}): NotaSembrada => ({
  id: crypto.randomUUID(),
  numero: '1',
  emisionDeLaFactura: '2026-06-15',
  recepcion: '2026-10-05',
  ...cambios,
});

const operador = operadorDePrueba();
const validar = (notas: NotaSembrada[], fechaDeInicio: string) =>
  new ValidarFechaDeInicio({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    notas: new NotasEnMemoria(notas),
  }).ejecutar(operador, { empresaId: operador.empresaId, fechaDeInicio });

describe('validar la fecha de inicio nueva con notas sobre facturas anteriores', () => {
  it('pasa sin notas', async () => {
    await expect(validar([], '2026-09-01')).resolves.toBeUndefined();
  });

  it('pasa si la factura es anterior a la fecha nueva y la nota se recibió desde ella (en el borde también)', async () => {
    const notas = [nota({ recepcion: '2026-09-01' })];

    await expect(validar(notas, '2026-09-01')).resolves.toBeUndefined();
  });

  it('rechaza una fecha igual o anterior a la emisión de la factura, con las notas que estorban', async () => {
    const estorba = nota({ numero: '7' });

    const intento = validar([estorba, nota({ emisionDeLaFactura: '2026-01-01' })], '2026-06-15');

    await expect(intento).rejects.toBeInstanceOf(FacturasAnterioresPosterioresALaFecha);
    await expect(intento).rejects.toMatchObject({
      codigo: 'facturas_anteriores_posteriores_a_la_fecha',
      detalles: { cantidad: 1, notas: [{ id: estorba.id, numero: '7' }] },
    });
  });

  it('rechaza una fecha posterior a la recepción de una nota', async () => {
    const intento = validar([nota({ recepcion: '2026-10-05' })], '2026-10-06');

    await expect(intento).rejects.toBeInstanceOf(NotasRecibidasAntesDeLaFecha);
    await expect(intento).rejects.toMatchObject({ codigo: 'notas_recibidas_antes_de_la_fecha' });
    await expect(intento).rejects.toThrow('Hay 1 nota sobre');
  });
});
