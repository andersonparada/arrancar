/**
 * Contraseñas de pago (CP3-2): crear con documentos de la bandeja, con un saldo inicial y con notas de crédito (reparto y
 * fecha de las aplicaciones), consultar la lista y la ficha, los documentos disponibles, el correlativo y su reinicio anual,
 * y los rechazos sin que se guarde nada ni se gaste el número.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { notaConSaldoLibre } from './soporte/cuentas-por-pagar-notas.js';
import {
  contrasenasGuardadas,
  cuerpoDeContrasena as cuerpoDe,
  EscenarioDeContrasenas,
  RUTA_DE_CONTRASENAS as RUTA,
} from './soporte/cuentas-por-pagar-contrasenas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
let mundo: EscenarioDeContrasenas;

beforeAll(async () => {
  mundo = await EscenarioDeContrasenas.preparar(entorno, 'cxpcontrasenas');
});

describe('crear una contraseña', () => {
  it('con documentos de la bandeja: número, fecha de hoy, montos de hoy, y se ve en la ficha y en la lista', async () => {
    const proveedor = await mundo.unProveedor();
    const [a, b] = [await mundo.unCargo(proveedor), await mundo.unCargo(proveedor, '500.00')];
    const antes = await contrasenasGuardadas();

    const respuesta = await mundo.crear(
      cuerpoDe(proveedor.proveedorId, [a, b], { observaciones: '  Trae las facturas  ' }),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      fecha: HOY,
      estado: 'vigente',
      observaciones: 'Trae las facturas',
      impresa: false,
      impresaEn: null,
      anulacion: null,
      anioDeNumero: 0,
      puedeEditar: true,
      puedeAnular: true,
      totales: { total: '1620.00', retenciones: '0.00', rebajado: '0.00', saldo: '1620.00' },
    });
    expect(respuesta.cuerpo.numero).toBe(String(respuesta.cuerpo.numeroCorrelativo));
    expect(respuesta.cuerpo.cargos).toHaveLength(2);
    expect(respuesta.cuerpo.cargos[0]).toMatchObject({
      estado: 'pendiente',
      rebajado: '0.00',
      sobreUmbralDeBancarizacion: false,
    });
    expect(await contrasenasGuardadas()).toBe(antes + 1);

    const ficha = await mundo.propietario().get(`${RUTA}/${respuesta.cuerpo.id}`);
    expect(ficha.cuerpo).toEqual(respuesta.cuerpo);
    const lista = await mundo.propietario().get(`${RUTA}?proveedorId=${proveedor.proveedorId}`);
    expect(lista.cuerpo.elementos).toEqual([
      expect.objectContaining({ id: respuesta.cuerpo.id, documentos: 2, saldo: '1620.00', pagoVencido: false }),
    ]);
  });

  it('con un saldo inicial: su saldo ya va neto y las retenciones por practicar se informan sin restarlas', async () => {
    const saldo = await mundo.documentos.sembrarSaldoInicial({ fechaEmision: haceDias(40) });

    const respuesta = await mundo.crear(cuerpoDe(mundo.escenario.proveedorId, [saldo]));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.cargos[0]).toMatchObject({
      total: '1120.00',
      retenciones: '120.00',
      saldo: '700.00',
      rebajado: '300.00',
      retencionesPorPracticar: '50.00',
    });
    expect(respuesta.cuerpo.totales.saldo).toBe('700.00');
  });

  it('con una nota de crédito: la reparte entre los cargos con forma contrasena y la mayor de las fechas', async () => {
    const proveedor = await mundo.unProveedor();
    const nota = await notaConSaldoLibre(mundo.documentos, proveedor);
    const cargo = await mundo.unCargo(proveedor);

    const respuesta = await mundo.crear(
      cuerpoDe(proveedor.proveedorId, [cargo, nota.notaPropia], { fecha: haceDias(1) }),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.cargos[0]).toMatchObject({ rebajado: '100.00', saldo: '1020.00' });
    expect(respuesta.cuerpo.notas).toEqual([
      expect.objectContaining({ documentoId: nota.notaPropia, aplicadoEnLaContrasena: '100.00', saldoLibre: '0.00' }),
    ]);
    const aplicaciones = await consultar<{ forma: string; monto: string; fecha: string; contrasena_id: string }>(
      `select forma, monto::text, fecha::text, contrasena_id from cuentas_por_pagar.aplicaciones_de_notas
        where nota_id = $1 and forma = 'contrasena'`,
      [nota.notaPropia],
    );
    // La nota se recibió hoy, después de la contraseña: la aplicación no queda antes de existir.
    expect(aplicaciones).toEqual([
      { forma: 'contrasena', monto: '100.00', fecha: HOY, contrasena_id: respuesta.cuerpo.id },
    ]);
  });

  it('con un cargo de Q30,000 o más lo marca para el aviso de bancarización', async () => {
    const proveedor = await mundo.unProveedor();
    const grande = await mundo.unCargo(proveedor, '30000.00');

    const respuesta = await mundo.crear(cuerpoDe(proveedor.proveedorId, [grande]));

    expect(respuesta.cuerpo.cargos[0].sobreUmbralDeBancarizacion).toBe(true);
  });
});

describe('rechazos', () => {
  async function sinGuardarNada(prueba: () => Promise<void>) {
    const antes = await contrasenasGuardadas();
    await prueba();
    expect(await contrasenasGuardadas()).toBe(antes);
  }

  const rechaza = async (cuerpo: Record<string, unknown>, codigo: string, campo?: string) => {
    const respuesta = await mundo.crear(cuerpo);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBeGreaterThanOrEqual(400);
    expect(respuesta.cuerpo.error.codigo).toBe(codigo);
    if (campo) expect(respuesta.cuerpo.error.detalles).toMatchObject({ campo });
  };

  it('sin documentos, solo con una nota, o con documentos repetidos', async () => {
    const proveedor = await mundo.unProveedor();
    const nota = await notaConSaldoLibre(mundo.documentos, proveedor);
    const cargo = await mundo.unCargo(proveedor);
    await sinGuardarNada(async () => {
      await rechaza(cuerpoDe(proveedor.proveedorId, []), 'contrasena_sin_cargos', 'documentos');
      await rechaza(cuerpoDe(proveedor.proveedorId, [nota.notaPropia]), 'contrasena_sin_cargos');
      await rechaza(cuerpoDe(proveedor.proveedorId, [cargo, cargo]), 'documentos_repetidos_en_contrasena');
    });
  });

  it('con más de cien documentos', async () => {
    const ids = Array.from({ length: 101 }, () => crypto.randomUUID());
    await rechaza(cuerpoDe(mundo.escenario.proveedorId, ids), 'demasiados_documentos_en_contrasena');
  });

  it('un documento de otro proveedor, ya en otra contraseña, sin deuda y un proveedor que no existe', async () => {
    const [uno, otro] = [await mundo.unProveedor(), await mundo.unProveedor()];
    const [propio, ajeno] = [await mundo.unCargo(uno), await mundo.unCargo(otro)];
    const nota = await notaConSaldoLibre(mundo.documentos, uno);
    const primera = await mundo.crear(cuerpoDe(uno.proveedorId, [propio]));
    await sinGuardarNada(async () => {
      await rechaza(cuerpoDe(uno.proveedorId, [propio, ajeno]), 'documento_ya_en_contrasena');
      await rechaza(cuerpoDe(uno.proveedorId, [ajeno]), 'documento_de_otro_proveedor');
      await rechaza(cuerpoDe(uno.proveedorId, [nota.facturaPropia]), 'documento_no_disponible_para_contrasena');
      const sinProveedor = await mundo.crear(cuerpoDe(crypto.randomUUID(), [propio]));
      expect(sinProveedor.estado).toBe(404);
    });
    expect(primera.estado).toBe(201);
  });

  it('las fechas: de pago anterior, futura, anterior a la emisión y anterior a la fecha de inicio', async () => {
    const proveedor = await mundo.unProveedor();
    const cargo = await mundo.unCargo(proveedor);
    await sinGuardarNada(async () => {
      const base = cuerpoDe(proveedor.proveedorId, [cargo]);
      await rechaza({ ...base, fechaDePago: haceDias(1) }, 'fecha_de_pago_invalida', 'fechaDePago');
      await rechaza(
        { ...base, fecha: haceDias(-1), fechaDePago: haceDias(-5) },
        'fecha_de_contrasena_invalida',
        'fecha',
      );
      await rechaza({ ...base, fecha: haceDias(5) }, 'fecha_de_contrasena_invalida');
      await rechaza({ ...base, fecha: haceDias(31), fechaDePago: HOY }, 'fecha_de_contrasena_invalida');
    });
  });

  it('observaciones de más de 500 caracteres', async () => {
    const proveedor = await mundo.unProveedor();
    const cargo = await mundo.unCargo(proveedor);
    await rechaza(
      cuerpoDe(proveedor.proveedorId, [cargo], { observaciones: 'x'.repeat(501) }),
      'observaciones_de_contrasena_invalidas',
      'observaciones',
    );
  });

  it('si las notas cubren todo, no hay nada que pagar y no se gasta el número', async () => {
    const proveedor = await mundo.unProveedor();
    const nota = await notaConSaldoLibre(mundo.documentos, proveedor);
    const pequeno = await mundo.unCargo(proveedor, '60.00');
    await sinGuardarNada(() =>
      rechaza(cuerpoDe(proveedor.proveedorId, [pequeno, nota.notaPropia]), 'contrasena_sin_saldo'),
    );
    const siguiente = await mundo.crear(cuerpoDe(proveedor.proveedorId, [pequeno]));
    const anterior = (await mundo.propietario().get(`${RUTA}?limite=200&estado=todas`)).cuerpo.elementos.length;
    expect(Number(siguiente.cuerpo.numero)).toBe(anterior);
  });
});
