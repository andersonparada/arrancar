import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { ExistenciaNegativa } from '../../../dominio/costeo/errores.js';
import {
  BodegaFueraDeAlcance,
  DocumentoInvalido,
  DocumentoYaAnulado,
  ElementoInactivo,
  TrasladoALaMismaBodega,
  TrasladoYaRecibido,
} from '../../../dominio/errores-de-kardex.js';
import { ARTICULO, BODEGA, EscenarioDelKardex, OTRA_BODEGA } from '../../../pruebas/escenario-del-kardex.js';

let e: EscenarioDelKardex;

const libras = (cantidad: number): bigint => BigInt(cantidad) * 10_000n;

/** Dos compras de 100 y 50 lb (Q200.00 y Q115.00): `C = 150`, `V = 315.00` en la bodega principal. */
async function cargarLaBodega(): Promise<void> {
  await e.registrarEntrada({ fecha: '2026-09-01', renglones: e.compra('100', '200.00') });
  await e.registrarEntrada({ fecha: '2026-09-02', renglones: e.compra('50', '115.00') });
}

beforeEach(async () => {
  e = new EscenarioDelKardex();
  await cargarLaBodega();
});

describe('traslado sin tránsito', () => {
  it('crea las dos mitades, mueve las bodegas y deja el costo y el valor del artículo como estaban', async () => {
    const traslado = await e.trasladar('50', { fecha: '2026-09-03' });

    expect(traslado).toMatchObject({
      clase: 'salida_de_traslado',
      estadoDeTraslado: 'recibido',
      bodegaId: BODEGA,
      bodegaDeDestinoId: OTRA_BODEGA,
    });
    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(libras(100));
    expect(e.kardex.existenciaDe(OTRA_BODEGA, ARTICULO)).toBe(libras(50));
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: libras(150), valor: 31_500n });
    const entrada = [...e.kardex.documentosGuardados.values()].find((d) => d.clase === 'entrada_de_traslado')!;
    expect(entrada).toMatchObject({ bodegaId: OTRA_BODEGA, documentoRelacionadoId: traslado.id, estado: 'vigente' });
    expect(e.kardex.documentosGuardados.get(traslado.id)!.documentoRelacionadoId).toBe(entrada.id);
  });

  it('las dos mitades son movimientos `traslado` con la misma cantidad y signos contrarios', async () => {
    await e.trasladar('50', { fecha: '2026-09-03' });

    const mitades = e.kardex.movimientos.filter((m) => m.tipo === 'traslado');
    expect(mitades.map((m) => [m.bodegaId, m.cantidad])).toEqual([
      [BODEGA, -libras(50)],
      [OTRA_BODEGA, libras(50)],
    ]);
    expect(mitades[1]!.movimientoDeOrigenId).toBe(mitades[0]!.id);
  });

  it('un consumo del mismo día en el destino va después de la entrada del traslado y no da negativa', async () => {
    await e.trasladar('50', { fecha: '2026-09-03' });

    await e.registrarSalida('20', { fecha: '2026-09-03', bodegaId: OTRA_BODEGA });

    expect(e.kardex.existenciaDe(OTRA_BODEGA, ARTICULO)).toBe(libras(30));
  });

  it('publica un solo evento, sin dinero, ya recibido', async () => {
    await e.trasladar('50', { fecha: '2026-09-03' });

    const evento = e.publicador.publicados.find((p) => p.nombre === 'inventarios.traslado_registrado')!;
    expect(evento.datos).toMatchObject({ enTransito: false, recibido: true, bodegaDeOrigenId: BODEGA });
    expect(JSON.stringify(evento.datos)).not.toMatch(/costo|valor/i);
    expect(e.publicador.nombres().filter((n) => n === 'inventarios.traslado_registrado')).toHaveLength(1);
  });

  it('exige ver las dos bodegas', async () => {
    e.kardex.bodegasOcultas.add(OTRA_BODEGA);

    await expect(e.trasladar('10')).rejects.toBeInstanceOf(BodegaFueraDeAlcance);
  });

  it('no pasa de lo que hay en el origen', async () => {
    await expect(e.trasladar('151', { fecha: '2026-09-03' })).rejects.toBeInstanceOf(ExistenciaNegativa);
  });
});

describe('reglas comunes', () => {
  it('el destino no puede ser el origen', async () => {
    await expect(e.trasladar('10', { bodegaDeDestinoId: BODEGA })).rejects.toBeInstanceOf(TrasladoALaMismaBodega);
  });

  it('el destino debe existir y estar activo', async () => {
    e.kardex.bodegasDelCatalogo.get(OTRA_BODEGA)!.activo = false;

    await expect(e.trasladar('10')).rejects.toBeInstanceOf(ElementoInactivo);
    await expect(e.trasladar('10', { bodegaDeDestinoId: 'no-existe' })).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('pide al menos un renglón con cantidad', async () => {
    await expect(e.trasladar('0')).rejects.toBeInstanceOf(DocumentoInvalido);
  });
});

describe('traslado con tránsito', () => {
  beforeEach(() => {
    e.transito.activo = true;
  });

  it('la salida queda en tránsito: sale del origen, no entra a ninguna bodega y el valor sigue en el artículo', async () => {
    const traslado = await e.trasladar('50', { fecha: '2026-09-03' });

    expect(traslado.estadoDeTraslado).toBe('en_transito');
    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(libras(100));
    expect(e.kardex.existenciaDe(OTRA_BODEGA, ARTICULO)).toBe(0n);
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: libras(150), valor: 31_500n });
    const evento = e.publicador.publicados.find((p) => p.nombre === 'inventarios.traslado_registrado')!;
    expect(evento.datos).toMatchObject({ enTransito: true, recibido: false });
  });

  it('el destino no tiene que ser visible para quien envía', async () => {
    e.kardex.bodegasOcultas.add(OTRA_BODEGA);

    const traslado = await e.trasladar('10');

    expect(traslado.bodegaDeDestinoNombre).toBe('Secundaria');
  });

  it('recibir crea la entrada, pasa la salida a recibido y no se puede repetir', async () => {
    const enviado = await e.trasladar('50', { fecha: '2026-09-03' });

    const recibido = await e.recibirTraslado(enviado.id, '2026-09-05');

    expect(recibido).toMatchObject({ estadoDeTraslado: 'recibido' });
    expect(e.kardex.existenciaDe(OTRA_BODEGA, ARTICULO)).toBe(libras(50));
    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: libras(150), valor: 31_500n });
    await expect(e.recibirTraslado(enviado.id)).rejects.toBeInstanceOf(TrasladoYaRecibido);
  });

  it('la recepción no puede ser anterior a la salida ni de un traslado que no existe', async () => {
    const enviado = await e.trasladar('50', { fecha: '2026-09-03' });

    await expect(e.recibirTraslado(enviado.id, '2026-09-02')).rejects.toBeInstanceOf(DocumentoInvalido);
    await expect(e.recibirTraslado('no-existe')).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('solo recibe quien tiene asignada la bodega de destino', async () => {
    const enviado = await e.trasladar('50', { fecha: '2026-09-03' });
    e.kardex.bodegasOcultas.add(OTRA_BODEGA);

    await expect(e.recibirTraslado(enviado.id)).rejects.toBeInstanceOf(BodegaFueraDeAlcance);
  });

  it('se recibe hoy cuando no se escribe fecha', async () => {
    const enviado = await e.trasladar('50', { fecha: '2026-09-03' });

    await e.recibirTraslado(enviado.id);

    const entrada = [...e.kardex.documentosGuardados.values()].find((d) => d.clase === 'entrada_de_traslado')!;
    expect(entrada.fecha).toBe('2026-09-29');
  });
});

describe('anular', () => {
  it('en tránsito, anula la salida y devuelve la cantidad al origen', async () => {
    e.transito.activo = true;
    const enviado = await e.trasladar('50', { fecha: '2026-09-03' });

    const anulado = await e.anularTraslado(enviado.id);

    expect(anulado.estado).toBe('anulado');
    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(libras(150));
    expect(e.auditoria.acciones()).toEqual(['inventarios.traslados:anular']);
    await expect(e.anularTraslado(enviado.id)).rejects.toBeInstanceOf(DocumentoYaAnulado);
  });

  it('recibido, anula la entrada y luego la salida, cada una con su auditoría', async () => {
    const traslado = await e.trasladar('50', { fecha: '2026-09-03' });

    await e.anularTraslado(traslado.id);

    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(libras(150));
    expect(e.kardex.existenciaDe(OTRA_BODEGA, ARTICULO)).toBe(0n);
    expect(e.auditoria.acciones()).toEqual(['inventarios.traslados:anular', 'inventarios.traslados:anular']);
    expect(
      [...e.kardex.documentosGuardados.values()].every((d) => d.estado === 'anulado' || d.clase.startsWith('e')),
    ).toBe(true);
  });

  it('la auditoría de la salida recibida la guarda como estaba: recibida y ligada a su entrada', async () => {
    const traslado = await e.trasladar('50', { fecha: '2026-09-03' });
    const entradaId = e.kardex.documentosGuardados.get(traslado.id)!.documentoRelacionadoId;

    await e.anularTraslado(traslado.id);

    const deLaSalida = e.auditoria.entradas.find((a) => a.registroId === traslado.id)!;
    expect(deLaSalida.anterior).toMatchObject({ estadoDeTraslado: 'recibido', documentoRelacionadoId: entradaId });
  });

  it('no se anula si lo recibido ya se gastó en el destino', async () => {
    const traslado = await e.trasladar('50', { fecha: '2026-09-03' });
    await e.registrarSalida('40', { fecha: '2026-09-04', bodegaId: OTRA_BODEGA });

    await expect(e.anularTraslado(traslado.id)).rejects.toBeInstanceOf(ExistenciaNegativa);
  });

  it('exige ver el origen', async () => {
    const traslado = await e.trasladar('50', { fecha: '2026-09-03' });
    e.kardex.bodegasOcultas.add(BODEGA);

    await expect(e.anularTraslado(traslado.id)).rejects.toBeInstanceOf(BodegaFueraDeAlcance);
  });
});

describe('PEPS', () => {
  beforeEach(async () => {
    e = new EscenarioDelKardex();
    e.metodoInicial.metodo = 'peps';
    await cargarLaBodega();
  });

  it('un traslado no cambia el orden de consumo: sigue saliendo primero la capa más vieja', async () => {
    await e.trasladar('30', { fecha: '2026-09-03' });

    const consumo = await e.registrarSalida('120', { fecha: '2026-09-04' });

    // 100 lb de la primera compra (Q200.00) y 20 lb de la segunda (Q46.00): como si el traslado no hubiera ocurrido.
    expect(consumo.costoTotal).toBe('246.00');
    const capas = e.kardex.capas.get(ARTICULO)!.capas;
    expect(capas.map((c) => c.cantidadRestante)).toEqual([0n, libras(30)]);
  });

  it('lo que viaja en tránsito sigue en el valor del artículo y en sus capas', async () => {
    e.transito.activo = true;

    await e.trasladar('50', { fecha: '2026-09-03' });

    expect(e.kardex.saldos.get(ARTICULO)).toMatchObject({ cantidad: libras(150), valor: 31_500n });
    expect(e.kardex.capas.get(ARTICULO)!.capas.map((c) => c.cantidadRestante)).toEqual([libras(100), libras(50)]);
  });

  it('no crea capas nuevas', async () => {
    await e.trasladar('50', { fecha: '2026-09-03' });

    expect(e.kardex.capas.get(ARTICULO)!.capas).toHaveLength(2);
  });
});
