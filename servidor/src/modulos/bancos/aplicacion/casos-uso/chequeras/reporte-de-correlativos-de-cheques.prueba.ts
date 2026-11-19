import { describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { ChequeDelCorrelativo } from '../../puertos/consultas-de-correlativos-de-cheques.js';
import { ReporteDeCorrelativosDeCheques } from './reporte-de-correlativos-de-cheques.js';

const operador = operadorDePrueba();
const CHEQUERA = '00000000-0000-4000-8000-0000000000c1';

const cheque = (numero: number, cambios: Partial<ChequeDelCorrelativo> = {}): ChequeDelCorrelativo => ({
  id: `cheque-${numero}`,
  numero,
  estado: 'disponible',
  causa: null,
  impresoEn: null,
  motivoDeAnulacion: null,
  movimiento: null,
  ...cambios,
});

function reporte(cheques: ChequeDelCorrelativo[], pasaron = new Map<string, number>()) {
  return new ReporteDeCorrelativosDeCheques({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    consultas: {
      chequera: async (id) =>
        id === CHEQUERA
          ? {
              chequera: { id, serie: 'A', desde: 1, hasta: 4, activa: true, deApertura: false, etiqueta: null },
              cuenta: { id: 'cuenta', nombre: 'Operativa', numero: '123-4', banco: 'Banrural' },
            }
          : null,
      cheques: async () => cheques,
      adondePasaron: async () => pasaron,
    },
  });
}

const cuatro = () => [
  cheque(1, { estado: 'anulado', causa: 'inutilizado', motivoDeAnulacion: 'Se arrugó' }),
  cheque(2, { estado: 'emitido' }),
  cheque(3),
  cheque(4),
];

describe('el reporte de correlativos de cheques', () => {
  it('trae la chequera, el resumen, los números y el cuadro del conteo físico', async () => {
    const resultado = await reporte(cuatro(), new Map([['cheque-1', 2]])).ejecutar(operador, { chequeraId: CHEQUERA });

    expect(resultado.chequera).toMatchObject({ serie: 'A', desde: 1, hasta: 4 });
    expect(resultado.cuenta.banco).toBe('Banrural');
    expect(resultado.resumen).toMatchObject({ emitidos: 1, inutilizados: 1, disponibles: 2, totalDelRango: 4 });
    expect(resultado.cheques[0]).toMatchObject({ numero: 1, estado: 'inutilizado', pasoAlNumero: 2 });
    expect(resultado.conteoFisico.disponiblesSegunElSistema).toBe(2);
    expect(resultado.conteoFisico.nota).toContain('alguien distinto de quien emite');
  });

  it('el filtro por estado recorta el detalle pero no el resumen', async () => {
    const resultado = await reporte(cuatro()).ejecutar(operador, { chequeraId: CHEQUERA, estado: 'disponible' });

    expect(resultado.cheques.map((c) => c.numero)).toEqual([3, 4]);
    expect(resultado.resumen.totalDelRango).toBe(4);
  });

  it('una chequera que no existe no se encuentra', async () => {
    await expect(reporte([]).ejecutar(operador, { chequeraId: crypto.randomUUID() })).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });
});
