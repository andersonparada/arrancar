import { beforeEach, describe, expect, it } from 'vitest';
import { BajaInvalida, PrecioNoRepartible } from '../../../dominio/errores-de-baja.js';
import {
  armarBajas,
  solicitudDeBaja,
  solicitudDeVenta,
  type EscenarioDeBajas,
} from '../../../pruebas/escenario-de-bajas.soporte.js';

let e: EscenarioDeBajas;

beforeEach(() => {
  e = armarBajas();
});

const codigos = (avisos: { codigo: string }[]) => avisos.map((aviso) => aviso.codigo);

describe('RegistrarVenta: resultados', () => {
  it('guarda la venta y calcula el resultado contable contra el valor en libros y el fiscal contra lo que faltaba deducir', async () => {
    const camioneta = await e.activoEnUso();

    const venta = await e.vender(solicitudDeVenta(camioneta));

    expect(venta).toMatchObject({
      causa: 'venta',
      comprador: 'Transportes del Norte, S. A.',
      nitDelComprador: 'CF',
      precio: '100000.00',
      iva: '12000.00',
      serieFel: 'A1B2',
      numeroFel: '98765',
      valorEnLibros: '238750.00',
      resultadoContable: '-138750.00',
    });
    const fiscal = 100000 - (250000 - Number(venta.depreciacionAcumuladaFiscal));
    expect(Number(venta.resultadoFiscal)).toBeCloseTo(fiscal, 2);
    expect(e.publicador.nombres()).toEqual(['activos-fijos.activo_vendido']);
    const evento = e.publicador.publicados[0]!.datos as Record<string, unknown>;
    expect(evento).toMatchObject({
      precioCentavos: 10000000,
      ivaCentavos: 1200000,
      resultadoContableCentavos: -13875000,
    });
  });

  it('el exceso sobre la matrícula se recupera en el resultado fiscal (A1): el costo fiscal no lleva el tope', async () => {
    const bodega = await e.activoEnUso({
      inciso: 'edificios',
      porcentaje: '5.00',
      monto: '1000000.00',
      datos: { valorDeMatricula: '600000.00' },
    });

    const venta = await e.vender(solicitudDeVenta(bodega, { fecha: '2027-03-20' }));

    expect(venta).toMatchObject({
      costoFiscal: '1000000.00',
      baseFiscal: '600000.00',
      depreciacionAcumuladaFiscal: '0.00',
    });
    expect(venta.resultadoFiscal).toBe('-900000.00');
    expect(venta.resultadoContable).toBe('-900000.00');
  });

  it('una venta con ganancia avisa de la ganancia de capital y una con pérdida, de que no se deduce', async () => {
    const barata = await e.activoEnUso({ monto: '20000.00' });
    const cara = await e.activoEnUso({ monto: '250000.00' });

    const ganancia = await e.vender(
      solicitudDeVenta(barata, { venta: { ...solicitudDeVenta(barata).venta!, precio: '30000.00', iva: '3600.00' } }),
    );
    const perdida = await e.vender(solicitudDeVenta(cara));

    expect(codigos(ganancia.avisos)).toEqual(['sin_acta', 'venta_con_iva', 'ganancia_de_capital']);
    expect(codigos(perdida.avisos)).toEqual(['sin_acta', 'venta_con_iva', 'perdida_de_capital']);
    expect(ganancia.avisos[2]!.mensaje).toContain('10 %');
    expect(perdida.avisos[2]!.mensaje).toContain('no es deducible');
  });

  it('con primer mes «mes siguiente» el resultado usa la cuota del mes de la venta', async () => {
    e.primerMes.regla = 'mes_siguiente';
    const camioneta = await e.activoEnUso();

    const venta = await e.vender(solicitudDeVenta(camioneta));

    expect(venta).toMatchObject({ cuotaDelMesContable: '3750.00', resultadoContable: '-138750.00' });
  });
});

describe('RegistrarVenta: avisos especiales', () => {
  it('la venta de un reproductor avisa que puede ser ingreso de la actividad (V-10)', async () => {
    e.bajas.incisoFiscal = 'reproductores';
    const toro = await e.activoEnUso({
      inciso: 'reproductores',
      monto: '30000.00',
      datos: { valorComoGanadoComun: '8000.00' },
    });

    const venta = await e.vender(solicitudDeVenta(toro));

    expect(venta).toMatchObject({ costoFiscal: '30000.00', baseFiscal: '22000.00' });
    expect(codigos(venta.avisos)).toContain('venta_de_reproductor');
    expect(venta.avisos.find((aviso) => aviso.codigo === 'venta_de_reproductor')!.mensaje).toContain(
      'valor como ganado común',
    );
  });

  it('un inmueble de persona individual vendido desde 2027 avisa de la exención; el de una jurídica, no', async () => {
    e.bajas.incisoFiscal = 'edificios';
    const casa = await e.activoEnUso({ inciso: 'edificios', porcentaje: '5.00', monto: '500000.00' });
    const bodega = await e.activoEnUso({ inciso: 'edificios', porcentaje: '5.00', monto: '500000.00' });

    e.bajas.tipoDePersona = 'individual';
    const individual = await e.vender(solicitudDeVenta(casa));
    e.bajas.tipoDePersona = 'juridica';
    const juridica = await e.vender(solicitudDeVenta(bodega));

    expect(codigos(individual.avisos)).toContain('inmueble_de_persona_individual');
    expect(codigos(juridica.avisos)).not.toContain('inmueble_de_persona_individual');
  });
});

describe('RegistrarVenta: con componentes', () => {
  it('reparte el precio y el IVA en proporción al costo de cada activo y la suma da la venta', async () => {
    const principal = await e.activoEnUso({ monto: '75000.00' });
    const clase = await e.claseDe('maquinaria_y_vehiculos', '20.00');
    const hijo = await e.activoConCosto(clase, '25000.00', { activoPadreId: principal.id.valor });
    await e.poner(hijo);

    const venta = await e.vender(solicitudDeVenta(principal));

    const registros = [...e.bajas.registros.values()].map((baja) => baja.instantanea());
    const delPrincipal = registros.find((baja) => baja.activoId === principal.id.valor)!;
    const delHijo = registros.find((baja) => baja.activoId === hijo.id.valor)!;
    expect(delPrincipal.venta).toMatchObject({ precioCentavos: 7500000, ivaCentavos: 900000 });
    expect(delHijo.venta).toMatchObject({ precioCentavos: 2500000, ivaCentavos: 300000 });
    expect(delHijo.venta?.numeroFel).toBe('98765');
    expect(venta.componentes).toHaveLength(1);
    expect(delPrincipal.numero).toBe(delHijo.numero);
  });

  it('rechaza una venta cuyo precio no alcanza un centavo por activo', async () => {
    const principal = await e.activoEnUso({ monto: '75000.00' });
    const clase = await e.claseDe('maquinaria_y_vehiculos', '20.00');
    const hijo = await e.activoConCosto(clase, '1.00', { activoPadreId: principal.id.valor });
    await e.poner(hijo);
    const solicitud = solicitudDeVenta(principal, {
      venta: { ...solicitudDeVenta(principal).venta!, precio: '0.01', iva: '0.00' },
    });

    await expect(e.vender(solicitud)).rejects.toBeInstanceOf(PrecioNoRepartible);
  });
});

describe('RegistrarVenta: datos de la venta', () => {
  it('rechaza una venta sin datos, una baja con datos de venta, un NIT inválido, un precio en cero o una autorización mal escrita', async () => {
    const camioneta = await e.activoEnUso();
    const venta = solicitudDeVenta(camioneta).venta!;

    await expect(e.vender(solicitudDeBaja(camioneta, { causa: 'venta' }))).rejects.toBeInstanceOf(BajaInvalida);
    await expect(
      e.vender(solicitudDeVenta(camioneta, { venta: { ...venta, nitDelComprador: '1234567-1' } })),
    ).rejects.toBeInstanceOf(BajaInvalida);
    await expect(e.vender(solicitudDeVenta(camioneta, { venta: { ...venta, precio: '0.00' } }))).rejects.toBeInstanceOf(
      BajaInvalida,
    );
    await expect(
      e.vender(solicitudDeVenta(camioneta, { venta: { ...venta, autorizacionFel: 'no-es-un-uuid' } })),
    ).rejects.toBeInstanceOf(BajaInvalida);
    await expect(e.vender(solicitudDeVenta(camioneta, { causa: 'destruccion' }))).rejects.toBeInstanceOf(BajaInvalida);
  });

  it('normaliza el NIT y la autorización', async () => {
    const camioneta = await e.activoEnUso();
    const venta = solicitudDeVenta(camioneta).venta!;

    const registrada = await e.vender(
      solicitudDeVenta(camioneta, {
        venta: { ...venta, nitDelComprador: ' 1234567-9 ', autorizacionFel: venta.autorizacionFel.toUpperCase() },
      }),
    );

    expect(registrada.nitDelComprador).toBe('12345679');
    expect(registrada.autorizacionFel).toBe(venta.autorizacionFel);
  });
});
