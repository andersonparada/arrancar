# Dónde quedamos

Última sesión: **2026-09-28**. Este archivo se reescribe al final de cada sesión.

## Hecho en esta sesión (en `main`)

- **Bancos B6**: Notas y Transferencias con pantalla propia (Operación);
  Movimientos pasó a **reporte** (saldo anterior, corrido y final; imprimir y
  exportar con filtros); el **saldo inicial** se captura en la ficha de la cuenta y
  se importa/exporta desde Cuentas bancarias. Migración de permisos de roles.
- **Selector con buscador** en todos los `CampoSelector` (sin tildes, teclado,
  dentro de ventanas), con su corrección del clic dentro de ventanas.
- **Superacceso** puede autorizar la conciliación que él mismo elaboró.
- **Configuración** solo la ve y la cambia el superacceso (ni el Propietario).
- **L0 Mediator** entre módulos: órdenes y avisos en la misma transacción,
  contratos en `core/contratos`, revisión del módulo activo
  (`docs/ARQUITECTURA.md` §4.8).
- **Planes**: `docs/modulos/libro-de-compras.md`, `docs/modulos/cuentas-por-pagar.md`,
  sección **B7** de `docs/modulos/bancos.md` y `docs/HOJA-DE-RUTA.md`.

## Hecho: Bancos B7 (en `main`)

Anular con movimiento inverso, eliminar solo lo limpio y blanquear cheques, en el
servidor y en el cliente (commits `B7a` y `B7b`; el diseño y lo implementado están en la
sección «B7» de `docs/modulos/bancos.md`):
- **Notas y transferencias**: anular crea el inverso con la fecha que escribe el
  usuario; eliminar solo si están limpias. Cada pantalla ofrece «Anular» y «Eliminar»
  según lo que diga el servidor (`puedeAnular`, `puedeEliminar`).
- **Cheques**: en mes abierto se anulan sin inverso y fuera del saldo; en mes
  conciliado, con nota de crédito inversa. **Blanquear** (`bancos.cheques.blanquear`)
  devuelve el cheque a disponible y elimina su movimiento. Los cheques no se eliminan.
- **Saldo inicial**: ya no se anula; se elimina si la cuenta nunca se concilió.
- **Conciliación**: original e inverso que nunca pasaron por el banco arrancan marcados
  juntos y se marcan o desmarcan a la par.
- **Migración `0011`** convierte los anulados existentes en pares sin cambiar saldos;
  aplicada en la base de desarrollo (había una versión anterior de la `0011`, sin la
  conversión de datos: se revirtió a mano y se volvió a migrar).
- Pruebas: servidor 565, cliente 130, generador 46.
- Queda pendiente para cuando existan: el aviso por el mediador al módulo de origen
  (Cuentas por pagar) al anular o eliminar, y bloquear el blanqueo si el cheque ya se
  imprimió (`TODO` en `Cheque.blanquear`).

## Siguiente

1. **Libro de compras** L1 a L5 (con el generador: `npm run generar -- modulo`,
   `definicion`, `recurso`).
2. **Cuentas por pagar**, incluidos los agregados de `docs/HOJA-DE-RUTA.md`
   (saldos iniciales y reportes).

## Preguntas abiertas para el usuario

- Saldos iniciales de Cuentas por pagar: ¿quedan pendientes para pagarse por
  contraseña, o entran pagados? (ver `HOJA-DE-RUTA.md`).
- Saldo inicial del banco en la primera conciliación de una cuenta: se toma igual al
  saldo de libros al cierre del mes anterior (sin confirmar); se revisa con la
  ventana de saldos iniciales con notas y cheques.
- Patrón común de reversión (`Reversible`): se discute antes de programarlo.
