import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { DocumentoYaAnulado } from '../../../dominio/errores-de-baja.js';
import { InventarioNoEsBien, LineaConDosDestinosDelCosto } from '../../../dominio/errores-de-documento.js';
import type { LineaParaMarcar } from '../../../dominio/marca-de-inventario.js';
import type { MarcasDeInventario } from '../../puertos/puertos-de-marca-de-inventario.js';
import { CambiarMarcaDeInventario, MotivoDeMarcaFaltante } from './cambiar-marca-de-inventario.js';

class MarcasEnMemoria implements MarcasDeInventario {
  readonly lineas = new Map<string, LineaParaMarcar>();
  readonly cambios: Array<{ lineaId: string; esInventario: boolean }> = [];

  async buscar(lineaId: string, documentoId: string): Promise<LineaParaMarcar | null> {
    const linea = this.lineas.get(lineaId);
    return linea && linea.documentoId === documentoId ? { ...linea } : null;
  }

  async cambiar(lineaId: string, esInventario: boolean): Promise<void> {
    this.cambios.push({ lineaId, esInventario });
    this.lineas.get(lineaId)!.esInventario = esInventario;
  }
}

const operador = { empresaId: 'e1', cuentaId: 'c1', usuarioId: 'u1' } as Operador;
const linea = (cambios: Partial<LineaParaMarcar> = {}): LineaParaMarcar => ({
  lineaId: 'l1',
  documentoId: 'd1',
  documentoVigente: true,
  numero: 2,
  tipo: 'bien',
  esActivoFijo: false,
  esInventario: true,
  ...cambios,
});

let marcas: MarcasEnMemoria;
let auditoria: AuditoriaEnMemoria;
let caso: CambiarMarcaDeInventario;
const pedido = (esInventario: boolean, motivo = 'Era gasto') => ({
  lineaId: 'l1',
  documentoId: 'd1',
  esInventario,
  motivo,
});

beforeEach(() => {
  marcas = new MarcasEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  caso = new CambiarMarcaDeInventario({ unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(), marcas, auditoria });
});

describe('cambiar la marca de inventario de una línea', () => {
  it('quita la marca y audita `corregir` en el libro con la línea antes y el motivo', async () => {
    marcas.lineas.set('l1', linea());

    await caso.ejecutar(operador, pedido(false, '  Era gasto  '));

    expect(marcas.lineas.get('l1')!.esInventario).toBe(false);
    expect(auditoria.entradas).toEqual([
      {
        recurso: 'libro-de-compras.documentos',
        registroId: 'd1',
        accion: 'corregir',
        anterior: { lineaId: 'l1', numeroDeLinea: 2, esInventario: true },
        motivo: 'Era gasto',
      },
    ]);
  });

  it('vuelve a poner la marca a un bien que no es activo fijo', async () => {
    marcas.lineas.set('l1', linea({ esInventario: false }));

    await caso.ejecutar(operador, pedido(true));

    expect(marcas.lineas.get('l1')!.esInventario).toBe(true);
    expect(auditoria.acciones()).toEqual(['libro-de-compras.documentos:corregir']);
  });

  it('sin cambio real no escribe ni audita', async () => {
    marcas.lineas.set('l1', linea({ esInventario: false }));

    await caso.ejecutar(operador, pedido(false));

    expect(marcas.cambios).toEqual([]);
    expect(auditoria.entradas).toEqual([]);
  });

  it('rechaza un documento anulado, un servicio, una línea de activo fijo y una línea que no existe', async () => {
    marcas.lineas.set('l1', linea({ documentoVigente: false }));
    await expect(caso.ejecutar(operador, pedido(false))).rejects.toBeInstanceOf(DocumentoYaAnulado);

    marcas.lineas.set('l1', linea({ esInventario: false, tipo: 'servicio' }));
    await expect(caso.ejecutar(operador, pedido(true))).rejects.toBeInstanceOf(InventarioNoEsBien);

    marcas.lineas.set('l1', linea({ esInventario: false, esActivoFijo: true }));
    await expect(caso.ejecutar(operador, pedido(true))).rejects.toBeInstanceOf(LineaConDosDestinosDelCosto);

    await expect(caso.ejecutar(operador, { ...pedido(false), lineaId: 'otra' })).rejects.toBeInstanceOf(
      RecursoNoEncontrado,
    );
    expect(auditoria.entradas).toEqual([]);
  });

  it('exige el motivo', async () => {
    marcas.lineas.set('l1', linea());

    await expect(caso.ejecutar(operador, pedido(false, '  '))).rejects.toBeInstanceOf(MotivoDeMarcaFaltante);
  });
});
