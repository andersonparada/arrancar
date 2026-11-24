/** Bajas y ventas de un activo con sus componentes cuando alguno no lleva libros, y las reglas que cuidan el acto (§3.8). */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BajaAnteriorAUnaMejora,
  BajaDeComponenteConPrincipalDadoDeBaja,
  CausaDeBajaNoPermitida,
} from '../../../dominio/errores-de-baja.js';
import {
  armarBajas,
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

  it('un bien de terceros no se vende con el principal: se devuelve a su dueño y el precio no lo toca', async () => {
    const { principal, hijo, clase } = await principalConComponente();
    const prestado = await e.activoConCosto(clase, null, {
      tipoDeRegistro: 'de_terceros',
      propietario: 'Vecino',
      formaDeTenencia: 'comodato',
      origen: null,
      activoPadreId: principal.id.valor,
    });

    await e.vender(solicitudDeVenta(principal));

    const bajas = bajasPorActivo();
    expect(bajas.get(prestado.id.valor)).toMatchObject({ causa: 'devuelto_al_dueno', venta: null });
    const precios = [principal, hijo].map((activo) => bajas.get(activo.id.valor)!.venta!.precioCentavos);
    expect(precios.reduce((suma, precio) => suma + precio, 0)).toBe(10000000);
  });

  it('un bien de terceros que va con un principal donado también se devuelve a su dueño', async () => {
    const { principal, clase } = await principalConComponente();
    const prestado = await e.activoConCosto(clase, null, {
      tipoDeRegistro: 'de_terceros',
      propietario: 'Vecino',
      formaDeTenencia: 'comodato',
      origen: null,
      activoPadreId: principal.id.valor,
    });

    await e.darDeBaja(solicitudDeBaja(principal, { causa: 'donacion', destinoDelBien: 'Escuela' }));

    expect(bajasPorActivo().get(prestado.id.valor)!.causa).toBe('devuelto_al_dueno');
  });

  it('un bien de terceros solo no se vende', async () => {
    const clase = await e.claseDe('herramientas', '25.00');
    const prestado = await e.activoConCosto(clase, null, {
      tipoDeRegistro: 'de_terceros',
      propietario: 'Vecino',
      formaDeTenencia: 'comodato',
      origen: null,
    });

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
  it('se rechaza la baja con fecha anterior a una mejora vigente del activo o de un componente', async () => {
    const { principal, hijo } = await principalConComponente();
    await e.agregarCosto(hijo, '5000.00', { claseDeCosto: 'otro', fecha: '2027-06-10', mejoraId: 'mejora-1' });

    await expect(e.darDeBaja(solicitudDeBaja(principal, { fecha: '2027-06-05' }))).rejects.toBeInstanceOf(
      BajaAnteriorAUnaMejora,
    );
    const despues = await e.darDeBaja(solicitudDeBaja(principal));

    expect(despues.costo).toBe('75000.00');
    expect(e.estadoDe(hijo).estado).toBe('dado_de_baja');
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
