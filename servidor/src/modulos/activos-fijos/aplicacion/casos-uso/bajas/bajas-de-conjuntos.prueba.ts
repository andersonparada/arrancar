/** Bajas y ventas de un activo con sus componentes cuando alguno no lleva libros, y las reglas que cuidan el acto (§3.8). */
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Mejora } from '../../../dominio/mejora.js';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BajaAnteriorAUnaMejora,
  BienDeTercerosSinConfirmar,
  BienDeTercerosSinDestino,
  BajaDeComponenteConPrincipalDadoDeBaja,
  CausaDeBajaNoPermitida,
} from '../../../dominio/errores-de-baja.js';
import {
  armarBajas,
  operador,
  solicitudDeBaja,
  solicitudDeVenta,
  type EscenarioDeBajas,
} from '../../../pruebas/escenario-de-bajas.soporte.js';
import { costosParaRepartir, ventasPorActivo } from './datos-de-baja.js';

let e: EscenarioDeBajas;

beforeEach(() => {
  e = armarBajas();
});

const bajasPorActivo = () =>
  new Map([...e.bajas.registros.values()].map((baja) => [baja.instantanea().activoId, baja.instantanea()]));

/** Un principal de Q75,000.00 con un componente propio de Q25,000.00 en uso. */
async function principalConComponente() {
  const principal = await e.activoEnUso({ monto: '75000.00' });
  const clase = await e.claseDe('maquinaria_y_vehiculos', '20.00');
  const hijo = await e.activoConCosto(clase, '25000.00', { activoPadreId: principal.id.valor });
  await e.poner(hijo);
  return { principal, hijo, clase };
}

describe('el reparto de una venta', () => {
  it('solo entra quien lleva libros; si ninguno los lleva, el principal se queda con todo', () => {
    expect(costosParaRepartir([{ tipoDeRegistro: 'activo', costoCentavos: 500 }, control, terceros])).toEqual([
      500,
      null,
      null,
    ]);
    expect(costosParaRepartir([control, control])).toEqual([0, null]);
  });

  it('reparte entre los que llevan libros y deja sin venta a los demás', () => {
    const venta = solicitudDeVenta({ id: { valor: 'x' } } as never).venta!;
    const datos = {
      ...venta,
      comprador: 'C',
      nitDelComprador: 'CF',
      serieFel: null,
      precioCentavos: 100,
      ivaCentavos: 12,
    };

    const partes = ventasPorActivo(datos, [30, null, 70, null]);

    expect(partes.map((parte) => parte?.precioCentavos ?? null)).toEqual([30, null, 70, null]);
    expect(partes.map((parte) => parte?.ivaCentavos ?? null)).toEqual([3, null, 9, null]);
  });
});

const control = { tipoDeRegistro: 'bien_de_control', costoCentavos: 0 } as const;
const deTerceros = {
  tipoDeRegistro: 'de_terceros',
  propietario: 'Vecino',
  formaDeTenencia: 'comodato',
  origen: null,
} as const;
const terceros = { tipoDeRegistro: 'de_terceros', costoCentavos: 0 } as const;

describe('vender un principal con un componente sin libros', () => {
  it('un bien de control que va con el principal queda como baja «otra» y el precio es todo del principal', async () => {
    const { principal, clase } = await principalConComponente();
    const taladro = await e.activoConCosto(clase, '800.00', {
      tipoDeRegistro: 'bien_de_control',
      activoPadreId: principal.id.valor,
    });

    const venta = await e.vender(solicitudDeVenta(principal));

    const delTaladro = bajasPorActivo().get(taladro.id.valor)!;
    expect(delTaladro).toMatchObject({ causa: 'otra', venta: null, numero: venta.numero });
    expect(bajasPorActivo().get(principal.id.valor)!.venta).toMatchObject({ precioCentavos: 7500000 });
    expect(e.estadoDe(taladro).estado).toBe('dado_de_baja');
  });

  it('un componente de terceros impide vender, donar o dar por obsoleto al principal: no se inventa su destino', async () => {
    const { principal, clase } = await principalConComponente();
    await e.activoConCosto(clase, null, { ...deTerceros, activoPadreId: principal.id.valor });

    await expect(e.vender(solicitudDeVenta(principal))).rejects.toBeInstanceOf(BienDeTercerosSinDestino);
    for (const causa of ['donacion', 'obsolescencia'] as const)
      await expect(e.darDeBaja(solicitudDeBaja(principal, { causa }))).rejects.toBeInstanceOf(BienDeTercerosSinDestino);
    expect(e.bajas.registros.size).toBe(0);
  });

  it('un componente de terceros no hereda en silencio la causa de pérdida: pide confirmarlo', async () => {
    const { principal, clase } = await principalConComponente();
    await e.activoConCosto(clase, null, { ...deTerceros, activoPadreId: principal.id.valor });

    for (const causa of ['robo', 'faltante_de_inventario', 'destruccion'] as const)
      await expect(e.darDeBaja(solicitudDeBaja(principal, { causa }))).rejects.toBeInstanceOf(
        BienDeTercerosSinConfirmar,
      );
    expect(e.bajas.registros.size).toBe(0);
  });

  it('un componente de terceros confirmado se va con la causa de pérdida, nunca como devuelto al dueño', async () => {
    const { principal, clase } = await principalConComponente();
    const prestado = await e.activoConCosto(clase, null, { ...deTerceros, activoPadreId: principal.id.valor });

    await e.darDeBaja(
      solicitudDeBaja(principal, {
        causa: 'faltante_de_inventario',
        tercerosConfirmados: [prestado.instantanea().codigo],
      }),
    );

    expect(bajasPorActivo().get(prestado.id.valor)!.causa).toBe('faltante_de_inventario');
  });

  it('un bien de terceros solo sí puede darse por faltante de inventario', async () => {
    const clase = await e.claseDe('herramientas', '25.00');
    const prestado = await e.activoConCosto(clase, null, deTerceros);

    await e.darDeBaja(solicitudDeBaja(prestado, { causa: 'faltante_de_inventario' }));

    expect(bajasPorActivo().get(prestado.id.valor)!.causa).toBe('faltante_de_inventario');
  });

  it('un principal de terceros no se vende aunque tenga un componente propio', async () => {
    const clase = await e.claseDe('herramientas', '25.00');
    const prestado = await e.activoConCosto(clase, null, deTerceros);
    const hijo = await e.activoConCosto(clase, '5000.00', { activoPadreId: prestado.id.valor });
    await e.poner(hijo);

    await expect(e.vender(solicitudDeVenta(prestado))).rejects.toBeInstanceOf(CausaDeBajaNoPermitida);
    expect(e.bajas.registros.size).toBe(0);
  });

  it('un bien de control no se vende como activo, con o sin componentes', async () => {
    const clase = await e.claseDe('herramientas', '25.00');
    const taladro = await e.activoConCosto(clase, '800.00', { tipoDeRegistro: 'bien_de_control' });

    await expect(e.vender(solicitudDeVenta(taladro))).rejects.toBeInstanceOf(CausaDeBajaNoPermitida);
    await expect(e.vender(solicitudDeVenta(taladro))).rejects.toThrow('consulte a su contador');
  });

  it('un bien de terceros solo no se vende', async () => {
    const clase = await e.claseDe('herramientas', '25.00');
    const prestado = await e.activoConCosto(clase, null, deTerceros);

    await expect(e.vender(solicitudDeVenta(prestado))).rejects.toBeInstanceOf(CausaDeBajaNoPermitida);
  });
});

describe('anular la baja de un componente', () => {
  it('no se anula mientras su principal esté dado de baja en otra acta', async () => {
    const { principal, hijo } = await principalConComponente();
    const delHijo = await e.darDeBaja(solicitudDeBaja(hijo));
    const delPrincipal = await e.darDeBaja(solicitudDeBaja(principal));

    await expect(e.anular(delHijo.id)).rejects.toBeInstanceOf(BajaDeComponenteConPrincipalDadoDeBaja);
    expect(e.estadoDe(hijo).estado).toBe('dado_de_baja');

    await e.anular(delPrincipal.id);
    await e.anular(delHijo.id);
    expect(e.estadoDe(hijo).estado).toBe('en_uso');
  });
});

describe('baja anterior a una mejora', () => {
  const mejora = (activoId: string, fecha: string) =>
    e.mejoras.agregar(
      Mejora.registrar(
        { empresaId: Identificador.desde<'Empresa'>(operador.empresaId), activoId, numero: 1, anioDeNumero: 2027 },
        {
          clase: 'mejora',
          fecha,
          descripcion: 'Motor nuevo',
          vidaUtilRestanteContableMeses: null,
          noEsEdificacion: false,
        },
      ),
    );

  it('se rechaza la baja con fecha anterior a una mejora vigente del activo o de un componente', async () => {
    const { principal, hijo } = await principalConComponente();
    await mejora(hijo.id.valor, '2027-06-10');

    await expect(e.darDeBaja(solicitudDeBaja(principal, { fecha: '2027-06-05' }))).rejects.toBeInstanceOf(
      BajaAnteriorAUnaMejora,
    );
    const despues = await e.darDeBaja(solicitudDeBaja(principal));

    expect(despues.costo).toBe('75000.00');
    expect(e.estadoDe(hijo).estado).toBe('dado_de_baja');
  });

  it('manda la fecha de la mejora y no la de la factura de sus costos', async () => {
    const { principal, hijo } = await principalConComponente();
    await mejora(hijo.id.valor, '2027-06-12');
    const mejoraId = [...e.mejoras.registros.keys()][0]!;
    await e.agregarCosto(hijo, '5000.00', { claseDeCosto: 'otro', fecha: '2027-04-01', mejoraId });

    await expect(e.darDeBaja(solicitudDeBaja(principal, { fecha: '2027-06-10' }))).rejects.toBeInstanceOf(
      BajaAnteriorAUnaMejora,
    );
  });

  it('no estorba una factura posterior de un costo de una mejora anterior a la baja', async () => {
    const { principal, hijo } = await principalConComponente();
    await mejora(hijo.id.valor, '2027-05-20');
    const mejoraId = [...e.mejoras.registros.keys()][0]!;
    await e.agregarCosto(hijo, '5000.00', { claseDeCosto: 'otro', fecha: '2027-07-05', mejoraId });

    const baja = await e.darDeBaja(solicitudDeBaja(principal, { fecha: '2027-06-10' }));

    expect(baja.id).toBeTruthy();
  });
});

describe('el acta y la denuncia del acto', () => {
  it('la que se sube al principal es también la de su componente, y no queda el aviso de que falta', async () => {
    const { principal, hijo } = await principalConComponente();
    const baja = await e.darDeBaja(solicitudDeBaja(principal, { causa: 'robo' }));
    const delHijo = bajasPorActivo().get(hijo.id.valor)!;

    await e.subirActa(baja.id, 'notarial');
    await e.subirDenuncia(baja.id);

    const [acta, denuncia] = [await e.abrirActa(delHijo.id.valor), await e.abrirDenuncia(delHijo.id.valor)];
    expect([acta.nombre, denuncia.nombre]).toEqual(['acta-de-baja.pdf', 'denuncia-de-baja.pdf']);
    const leida = await e.bajas.obtener(delHijo.id.valor);
    expect(leida).toMatchObject({ tieneActa: true, tipoDeActa: 'notarial', tieneDenuncia: true });
    expect(leida.avisos.map((aviso) => aviso.codigo)).not.toContain('sin_acta');
  });

  it('subir el acta desde el componente la guarda en la baja del principal', async () => {
    const { principal, hijo } = await principalConComponente();
    const baja = await e.darDeBaja(solicitudDeBaja(principal));
    const delHijo = bajasPorActivo().get(hijo.id.valor)!;

    await e.subirActa(delHijo.id.valor);

    expect((await e.bajas.obtener(baja.id)).tieneActa).toBe(true);
    expect(bajasPorActivo().get(hijo.id.valor)!.acta).toBeNull();
    expect(e.auditoria.entradas).toMatchObject([{ registroId: baja.id, accion: 'adjuntar' }]);
  });
});
