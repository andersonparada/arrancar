import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { VencimientoInvalido } from '../../../dominio/errores.js';
import {
  CargaInicialCerradaParaSaldos,
  EmisionNoAnteriorAlInicio,
  FechaDeInicioSinRegistrar,
  ProveedorNoDisponible,
  RetencionesPorPracticarInvalidas,
  SaldoInicialAutorizado,
  SaldoInicialConMovimientos,
  SaldoPendienteInvalido,
} from '../../../dominio/errores-de-saldos-iniciales.js';
import { EscenarioDeSaldosIniciales } from '../../../pruebas/escenario-de-saldos-iniciales.js';

let e: EscenarioDeSaldosIniciales;

beforeEach(() => {
  e = new EscenarioDeSaldosIniciales();
});

describe('CrearSaldoInicial', () => {
  it('guarda el saldo inicial ya completado, a nombre de quien lo carga, y devuelve su ficha', async () => {
    const dto = await e.crear.ejecutar(e.operador, e.solicitud({ referencia: ' CXP-1 ' }));

    expect(dto).toMatchObject({
      serie: 'A',
      numero: '1001',
      referencia: 'CXP-1',
      estado: 'registrado',
      total: '1120.00',
      saldoPendiente: '1000.00',
      anterioresAlInicio: '120.00',
      saldo: '1000.00',
      retencionesPorPracticar: '0.00',
      puedeCorregir: true,
      puedeEliminar: true,
    });
    expect(e.documentos.documentos[0]).toMatchObject({
      origen: 'saldo_inicial',
      documentoId: null,
      registradoPor: e.operador.usuarioId,
    });
  });

  it('no audita el alta y pide la carga inicial una sola vez', async () => {
    await e.crear.ejecutar(e.operador, e.solicitud());

    expect(e.auditoria.entradas).toEqual([]);
    expect(e.carga.consultas).toBe(1);
  });

  it('sin fecha de inicio no se carga', async () => {
    e.carga.estado = { fechaDeInicio: null, cerrada: false };

    await expect(e.crear.ejecutar(e.operador, e.solicitud())).rejects.toThrow(FechaDeInicioSinRegistrar);
  });

  it('con la carga cerrada no se agrega', async () => {
    e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: true };

    await expect(e.crear.ejecutar(e.operador, e.solicitud())).rejects.toThrow(CargaInicialCerradaParaSaldos);
    expect(e.documentos.documentos).toHaveLength(0);
  });

  it('una emisión igual a la fecha de inicio se rechaza', async () => {
    await expect(e.crear.ejecutar(e.operador, e.solicitud({ fechaEmision: '2026-01-01' }))).rejects.toThrow(
      EmisionNoAnteriorAlInicio,
    );
  });

  it('un proveedor inactivo o de otra cuenta se rechaza', async () => {
    e.proveedores.disponibles.clear();

    await expect(e.crear.ejecutar(e.operador, e.solicitud())).rejects.toThrow(ProveedorNoDisponible);
  });

  it('un saldo pendiente mayor que el total menos las retenciones se rechaza', async () => {
    const solicitud = e.solicitud({ retenciones: '120.00', saldoPendiente: '1000.01' });

    await expect(e.crear.ejecutar(e.operador, solicitud)).rejects.toThrow(SaldoPendienteInvalido);
  });

  it('unas retenciones por practicar mayores que las retenciones se rechazan', async () => {
    const solicitud = e.solicitud({ retenciones: '120.00', retencionesPorPracticar: '120.01' });

    await expect(e.crear.ejecutar(e.operador, solicitud)).rejects.toThrow(RetencionesPorPracticarInvalidas);
  });

  it('las retenciones por practicar son informativas: no cambian el saldo', async () => {
    const solicitud = e.solicitud({
      retenciones: '120.00',
      retencionesPorPracticar: '80.00',
      saldoPendiente: '900.00',
    });

    const dto = await e.crear.ejecutar(e.operador, solicitud);

    expect(dto).toMatchObject({ retencionesPorPracticar: '80.00', saldoPendiente: '900.00', saldo: '900.00' });
    expect(dto.anterioresAlInicio).toBe('100.00');
  });

  it('sin vencimiento propone el de siempre, contado desde la emisión', async () => {
    const porOmision = await e.crear.ejecutar(e.operador, e.solicitud({ vencimiento: null }));
    e.condiciones.dias.set(e.proveedorId, 45);
    const conCredito = await e.crear.ejecutar(e.operador, e.solicitud({ vencimiento: null, numero: '1002' }));

    expect(porOmision.vencimiento).toBe('2026-01-20');
    expect(conCredito.vencimiento).toBe('2026-02-03');
  });

  it('una nota de crédito se carga sin vencimiento y con su saldo libre', async () => {
    const dto = await e.crear.ejecutar(
      e.operador,
      e.solicitud({ tipo: 'nota_de_credito', vencimiento: null, total: '300.00', saldoPendiente: '300.00' }),
    );

    expect(dto).toMatchObject({ tipo: 'nota_de_credito', vencimiento: null, saldo: '300.00' });
    await expect(
      e.crear.ejecutar(
        e.operador,
        e.solicitud({ tipo: 'nota_de_credito', numero: '9', total: '10.00', saldoPendiente: '10.00' }),
      ),
    ).rejects.toThrow(VencimientoInvalido);
  });
});

describe('CorregirSaldoInicial', () => {
  let id: string;

  beforeEach(async () => {
    id = (await e.crear.ejecutar(e.operador, e.solicitud())).id;
  });

  it('cambia lo cargado, deja el registro a nombre de quien corrige y audita lo anterior', async () => {
    const otra = { ...e.operador, usuarioId: crypto.randomUUID() };

    const dto = await e.corregir.ejecutar(otra, id, e.solicitud({ total: '2240.00', saldoPendiente: '2000.00' }));

    expect(dto).toMatchObject({ id, total: '2240.00', saldoPendiente: '2000.00' });
    expect(e.documentos.documentos[0]).toMatchObject({ registradoPor: otra.usuarioId });
    expect(e.auditoria.entradas).toHaveLength(1);
    expect(e.auditoria.entradas[0]).toMatchObject({
      recurso: 'cuentas-por-pagar.saldos-iniciales',
      registroId: id,
      accion: 'corregir',
      anterior: { id, total: '1120.00', saldoPendiente: '1000.00' },
    });
  });

  it('vuelve a validar todo', async () => {
    await expect(e.corregir.ejecutar(e.operador, id, e.solicitud({ fechaEmision: '2026-01-02' }))).rejects.toThrow(
      EmisionNoAnteriorAlInicio,
    );
    expect(e.auditoria.entradas).toHaveLength(0);
  });

  it('uno autorizado no se corrige', async () => {
    e.documentos.documentos[0]!.estado = 'autorizado';

    await expect(e.corregir.ejecutar(e.operador, id, e.solicitud())).rejects.toThrow(SaldoInicialAutorizado);
  });

  it('uno con notas aplicadas no se corrige', async () => {
    await e.aplicaciones.agregar(e.documentos.documentos[0]!, [{ cargoId: id, montoCentavos: 100 }]);
    e.aplicaciones.lista[0]!.notaId = crypto.randomUUID();

    await expect(e.corregir.ejecutar(e.operador, id, e.solicitud())).rejects.toThrow(SaldoInicialConMovimientos);
  });

  it('con la carga cerrada no se corrige', async () => {
    e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: true };

    await expect(e.corregir.ejecutar(e.operador, id, e.solicitud())).rejects.toThrow(CargaInicialCerradaParaSaldos);
  });

  it('un documento del libro no existe por esta ruta', async () => {
    const delLibro = { ...e.documentos.documentos[0]!, id: crypto.randomUUID(), origen: 'libro_de_compras' as const };
    e.documentos.documentos.push(delLibro);

    await expect(e.corregir.ejecutar(e.operador, delLibro.id, e.solicitud())).rejects.toThrow(RecursoNoEncontrado);
  });
});
