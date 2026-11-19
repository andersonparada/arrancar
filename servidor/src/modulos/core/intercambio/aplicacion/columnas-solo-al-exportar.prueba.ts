import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { operadorDePrueba, UnidadDeTrabajoEnMemoria } from '../../compartido/pruebas/dobles-compartidos.js';
import { validadorDeZod } from '../http/rutas-de-intercambio.js';
import { LibroDeExcelJs } from '../infraestructura/libro-de-excel.exceljs.js';
import type { Columna } from './columnas.js';
import { IntercambioDeRecurso } from './intercambio-de-recurso.js';

interface Cuenta {
  nombre: string;
  saldo?: number;
}

const COLUMNAS: Columna[] = [{ clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' }];
const SOLO_AL_EXPORTAR: Columna[] = [{ clave: 'saldo', titulo: 'Saldo', requerido: false, tipo: 'entero' }];

const unidadSimple = new UnidadDeTrabajoEnMemoria();

const libro = new LibroDeExcelJs();
const operador = operadorDePrueba();
const guardados: Cuenta[] = [];

const intercambio = new IntercambioDeRecurso<Cuenta, Cuenta>({
  nombre: 'Cuentas',
  columnas: COLUMNAS,
  columnasSoloAlExportar: SOLO_AL_EXPORTAR,
  libro,
  unidadDeTrabajo: unidadSimple,
  validar: validadorDeZod(z.object({ nombre: z.string() })),
  listar: async () => [{ nombre: 'Operación', saldo: 3 }],
  crear: async (_operador, cuenta) => void guardados.push(cuenta),
  interpretarError: () => null,
});

describe('columnas que solo se escriben al exportar', () => {
  it('van al final del exportado, y no están en la plantilla', async () => {
    const exportado = await libro.leer(await intercambio.exportar(operador));
    const plantilla = await libro.leer(await intercambio.plantilla());

    expect(exportado.encabezados).toEqual(['Nombre', 'Saldo']);
    expect(exportado.filas[0]!.celdas).toEqual(['Operación', 3]);
    expect(plantilla.encabezados).toEqual(['Nombre']);
  });

  it('lo exportado se puede volver a importar: las columnas de más se ignoran', async () => {
    const resultado = await intercambio.importar(operador, {
      contenido: await intercambio.exportar(operador),
      ensayo: false,
    });

    expect(resultado).toEqual({ filas: 1, guardado: true, errores: [] });
    expect(guardados).toEqual([{ nombre: 'Operación' }]);
  });
});
