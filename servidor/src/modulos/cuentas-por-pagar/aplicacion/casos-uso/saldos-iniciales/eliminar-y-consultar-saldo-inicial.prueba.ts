import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { MotivoInvalido } from '../../../dominio/errores.js';
import {
  CargaInicialCerradaParaSaldos,
  SaldoInicialAutorizado,
  SaldoInicialConMovimientos,
} from '../../../dominio/errores-de-saldos-iniciales.js';
import { EscenarioDeSaldosIniciales } from '../../../pruebas/escenario-de-saldos-iniciales.js';

let e: EscenarioDeSaldosIniciales;
let id: string;

beforeEach(async () => {
  e = new EscenarioDeSaldosIniciales();
  id = (await e.crear.ejecutar(e.operador, e.solicitud())).id;
});

describe('EliminarSaldoInicial', () => {
  it('lo elimina con su motivo y audita lo que había', async () => {
    await e.eliminar.ejecutar(e.operador, id, '  Se cargó dos veces  ');

    expect(e.documentos.documentos).toHaveLength(0);
    expect(e.auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'cuentas-por-pagar.saldos-iniciales',
        registroId: id,
        accion: 'eliminar',
        motivo: 'Se cargó dos veces',
        anterior: expect.objectContaining({ id, numero: '1001', total: '1120.00' }),
      }),
    ]);
  });

  it('exige un motivo de 1 a 300 caracteres y no elimina sin él', async () => {
    await expect(e.eliminar.ejecutar(e.operador, id, '   ')).rejects.toThrow(MotivoInvalido);
    await expect(e.eliminar.ejecutar(e.operador, id, 'x'.repeat(301))).rejects.toThrow(MotivoInvalido);
    expect(e.documentos.documentos).toHaveLength(1);
  });

  it('uno autorizado no se elimina', async () => {
    e.documentos.documentos[0]!.estado = 'autorizado';

    await expect(e.eliminar.ejecutar(e.operador, id, 'Error')).rejects.toThrow(SaldoInicialAutorizado);
    expect(e.auditoria.entradas).toHaveLength(0);
  });

  it('uno con una nota aplicada no se elimina', async () => {
    await e.aplicaciones.agregar(e.documentos.documentos[0]!, [{ cargoId: id, montoCentavos: 100 }], {
      forma: 'automatica',
      fecha: '2026-01-10',
      referencia: null,
    });
    e.aplicaciones.lista[0]!.notaId = crypto.randomUUID();

    await expect(e.eliminar.ejecutar(e.operador, id, 'Error')).rejects.toThrow(SaldoInicialConMovimientos);
    expect(e.documentos.documentos).toHaveLength(1);
  });

  it('con la carga cerrada no se elimina', async () => {
    e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: true };

    await expect(e.eliminar.ejecutar(e.operador, id, 'Error')).rejects.toThrow(CargaInicialCerradaParaSaldos);
  });

  it('uno que no existe responde que no se encontró', async () => {
    await expect(e.eliminar.ejecutar(e.operador, crypto.randomUUID(), 'Error')).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('ListarSaldosIniciales y ObtenerSaldoInicial', () => {
  it('lista solo los saldos iniciales y trae la carga inicial', async () => {
    e.documentos.documentos.push({ ...e.documentos.documentos[0]!, id: 'x', origen: 'libro_de_compras' });

    const pagina = await e.listar.ejecutar(e.operador, {}, { pagina: 1, limite: 20 });

    expect(pagina).toMatchObject({ carga: { fechaDeInicio: '2026-01-01', cerrada: false }, total: 1, pagina: 1 });
    expect(pagina.elementos.map((elemento) => elemento.id)).toEqual([id]);
  });

  it('con la carga cerrada la lista ya no permite corregir ni eliminar', async () => {
    e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: true };

    const { elementos } = await e.listar.ejecutar(e.operador, {}, { pagina: 1, limite: 20 });

    expect(elementos[0]).toMatchObject({ puedeCorregir: false, puedeEliminar: false });
  });

  it('filtra por proveedor', async () => {
    const pagina = await e.listar.ejecutar(e.operador, { proveedorId: crypto.randomUUID() }, { pagina: 1, limite: 20 });

    expect(pagina.elementos).toEqual([]);
  });

  it('obtiene uno por su id y no encuentra un documento del libro', async () => {
    expect(await e.obtener.ejecutar(e.operador, id)).toMatchObject({ id, proveedorNombre: 'Proveedor' });
    e.documentos.documentos[0]!.origen = 'libro_de_compras';

    await expect(e.obtener.ejecutar(e.operador, id)).rejects.toThrow(RecursoNoEncontrado);
  });
});
