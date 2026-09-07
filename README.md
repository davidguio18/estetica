# estetica API

Backend principal para la gestión integral de **dra.charlincaro**, una estética que requiere administrar usuarios, permisos, inventario de medicamentos e insumos, tratamientos y, progresivamente, otros procesos operativos y clínicos.

El proyecto está diseñado desde el inicio para crecer de manera sostenible, manteniendo una arquitectura clara, modular, testeable y con bajo acoplamiento.

---

## 1. Objetivo del proyecto

Construir una API REST robusta y mantenible que permita centralizar los procesos de dra.charlincaro.

El sistema comenzará con:

* Autenticación y autorización.
* Gestión de usuarios.
* Roles y permisos.
* Inventario.
* Productos.
* Lotes.
* Proveedores.
* Movimientos de inventario.
* Auditoría.

A futuro se incorporarán módulos como:

* Pacientes.
* Citas.
* Tratamientos.
* Historia clínica.
* Compras.
* Facturación.
* Reportes.
* Notificaciones.
* Otros módulos que requiera la operación.

La arquitectura debe permitir incorporar estos módulos sin tener que reconstruir el backend.

---

# 2. Stack tecnológico

## Backend

* Node.js
* TypeScript
* NestJS

## Base de datos

* PostgreSQL

## ORM

* Prisma

## Seguridad

* JWT para access tokens.
* Refresh tokens con rotación.
* Argon2id para hashing de contraseñas.

## API

* REST.
* JSON.
* Validación de DTOs.
* Manejo centralizado de errores.
* Documentación mediante OpenAPI/Swagger.

## Testing

Se deberá contemplar desde el inicio:


## Bootstrap

Requisitos: Node.js 24 y pnpm 10. Copia `.env.example` como `.env` y configura
`DATABASE_URL` con la conexión PostgreSQL existente antes de iniciar la API.

```bash
corepack pnpm install
corepack pnpm prisma generate
corepack pnpm start:dev
```

La API expone `GET /health` y la documentación OpenAPI en `/docs`. La
introspección del esquema existente se ejecuta explícitamente con
`corepack pnpm prisma db pull` y requiere una conexión válida.

Auth expone `POST /auth/users`, `POST /auth/login` y `POST /auth/refresh`.
Configura `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN` y
`REFRESH_TOKEN_EXPIRES_IN` en `.env`; los refresh tokens se almacenan sólo como
hashes y se rotan en cada uso.
* Unit tests.
* Integration tests.
* E2E tests para los flujos críticos.

---

# 3. Arquitectura

El proyecto utilizará:

> **Arquitectura Modular + Clean Architecture pragmática**

No se implementarán múltiples arquitecturas simultáneamente.


* MVC.
* Hexagonal.
* Clean Architecture.
* CQRS.
* Event Sourcing.
* Microservicios.
* DDD extremo.

Se utilizarán únicamente los principios y patrones que resuelvan problemas reales del sistema.

La arquitectura debe mantenerse simple, explícita y fácil de comprender.

---

# 4. Arquitectura modular

El sistema se organizará por **módulos de negocio**, no únicamente por tipo de archivo.

La estructura conceptual será:

```text
src/
├── modules/
│   ├── auth/
│   ├── inventory/
│   └── audit/
│
├── shared/
├── config/
├── app.module.ts
└── main.ts
```

A futuro:

```text
src/
├── modules/
│   ├── auth/
│   ├── inventory/
│   ├── audit/
│   ├── patients/
│   ├── appointments/
│   ├── treatments/
│   ├── clinical-history/
│   ├── purchases/
│   ├── billing/
│   ├── reports/
│   └── notifications/
│
├── shared/
├── config/
├── app.module.ts
└── main.ts
```

Cada módulo debe ser responsable de un dominio específico.

No se deben crear dependencias innecesarias entre módulos.

---

# 5. Clean Architecture

Dentro de cada módulo utilizaremos una separación basada en:

```text
module/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

## Domain

Contiene los conceptos y reglas propias del dominio.

Ejemplos:

```text
entities/
value-objects/
repository contracts
domain rules
```

El dominio no debe depender de:

* NestJS.
* Prisma.
* PostgreSQL.
* HTTP.
* JWT.
* Frameworks externos.

El objetivo es mantener el dominio independiente de detalles tecnológicos.

---

## Application

Contiene los casos de uso de la aplicación.

Ejemplos:

```text
Login
RefreshAccessToken
Logout
ForgotPassword
ResetPassword

CreateProduct
UpdateProduct
CreateProductBatch
RegisterInventoryEntry
RegisterInventoryExit
AdjustInventory
```

Los casos de uso coordinan las operaciones necesarias para cumplir una acción del sistema.

No deben contener lógica relacionada directamente con HTTP o detalles específicos de Prisma.

---

## Infrastructure

Contiene las implementaciones técnicas.

Ejemplos:

```text
Prisma repositories
JWT services
Argon2 password hasher
Email providers
External services
Database implementations
```

Esta capa puede depender de tecnologías externas.

El objetivo es que las decisiones tecnológicas permanezcan aisladas del dominio.

---

## Presentation

Es la entrada al sistema.

Principalmente:

```text
Controllers
DTOs
Guards
HTTP concerns
```

Los controllers deben ser delgados.

No deben convertirse en contenedores de lógica de negocio.

---

# 6. Principios de diseño

Se aplicarán principios SOLID de forma pragmática.

Especialmente:

### Single Responsibility

Cada componente debe tener una responsabilidad clara.

### Open/Closed

El código debe poder extenderse sin modificar innecesariamente componentes existentes.

### Liskov Substitution

Las implementaciones deben respetar los contratos definidos.

### Interface Segregation

No crear interfaces gigantescas.

### Dependency Inversion

Las reglas de negocio no deben depender directamente de infraestructura.

---

## Regla importante

No se crearán abstracciones únicamente para "cumplir SOLID".

Por ejemplo, no se crearán interfaces innecesarias para cada clase.

La abstracción debe existir cuando aporte:

* desacoplamiento,
* testabilidad,
* flexibilidad,
* aislamiento tecnológico,
* o una necesidad real del dominio.

---

# 7. Base de datos

La base de datos será PostgreSQL.

La primera versión utiliza tres schemas:

```text
dra_charlincaro
│
├── auth
├── inventory
└── audit
```

Esto representa:

```text
1 Database
   │
   ├── auth schema
   ├── inventory schema
   └── audit schema
```

No son tres bases de datos diferentes.

---

# 8. Schema auth

El schema `auth` es responsable de autenticación y autorización.

Tablas:

```text
auth.users
auth.roles
auth.permissions
auth.user_roles
auth.role_permissions
auth.refresh_tokens
auth.password_reset_tokens
```

## users

Información básica de usuarios.

Incluye:

* UUID.
* Username.
* Email.
* Password hash.
* Nombre.
* Apellido.
* Estado.
* Último login.
* Fecha de cambio de contraseña.
* Intentos fallidos.
* Bloqueo temporal.
* Timestamps.

Las contraseñas nunca se almacenarán en texto plano.

---

## roles

Define roles del sistema.

Ejemplos iniciales:

```text
ADMIN
AUXILIAR
MEDICO
```

Estos roles podrán evolucionar posteriormente.

---

## permissions

Permisos granulares.

Ejemplos:

```text
users.read
users.create
users.update
users.delete

products.read
products.create
products.update

inventory.read
inventory.create
inventory.update
inventory.adjust

suppliers.read
suppliers.create
suppliers.update

treatments.read
treatments.create
treatments.update

audit.read
```

La autorización estará basada en permisos y no únicamente en nombres de roles.

---

## user_roles

Relaciona usuarios con roles.

Permite que un usuario tenga uno o varios roles.

---

## role_permissions

Relaciona roles con permisos.

Permite administrar el acceso sin tener que modificar código cada vez que se agregue un permiso.

---

# 9. JWT y autenticación

El sistema utilizará JWT para los access tokens.

El access token será de corta duración.

Ejemplo conceptual:

```text
Login
 │
 ├── Access Token
 │     └── corta duración
 │
 └── Refresh Token
       └── persistido como hash
```

El JWT de acceso no se almacenará en PostgreSQL.

---

# 10. Refresh tokens

Los refresh tokens estarán almacenados en:

```text
auth.refresh_tokens
```

No se almacenará el token original.

Se almacenará:

```text
token_hash
```

El sistema utilizará **refresh token rotation**.

Conceptualmente:

```text
Refresh Token A
      │
      ▼
 validar
      │
      ▼
 revocar A
      │
      ▼
 crear B
      │
      ▼
 devolver nuevo Access Token + Refresh Token
```

También se registrará la relación:

```text
replaced_by_token_id
```

para poder rastrear la rotación.

---

# 11. Password reset

La recuperación de contraseña utilizará:

```text
auth.password_reset_tokens
```

Los tokens serán:

* Temporales.
* De un solo uso.
* Almacenados como hash.
* Marcados como utilizados después del cambio exitoso.

Flujo:

```text
Forgot Password
      │
      ▼
Generate secure token
      │
      ▼
Store hash
      │
      ▼
Send reset link
      │
      ▼
Validate token
      │
      ▼
Change password
      │
      ▼
Mark token as used
```

---

# 12. Sesiones

Por decisión arquitectónica inicial:

> **No se implementará una tabla de sesiones en esta etapa.**

Si posteriormente necesitamos gestión de dispositivos, sesiones activas, cierre remoto o controles adicionales, se evaluará la incorporación de un módulo de sesiones.

No se implementará hasta que exista una necesidad real.

---

# 13. Schema audit

La auditoría será un dominio independiente:

```text
audit
└── audit_logs
```

No pertenece a `auth`.

La razón es que la auditoría será transversal a todo el sistema.

Podrá registrar acciones provenientes de:

```text
auth
inventory
patients
appointments
treatments
billing
etc.
```

La tabla contiene conceptualmente:

```text
user_id
action
entity_type
entity_id
old_values
new_values
ip_address
created_at
```

Los cambios relevantes deberán poder rastrearse.

---

# 14. Schema inventory

El módulo inicial del negocio será inventario.

Tablas:

```text
inventory.categories
inventory.suppliers
inventory.products
inventory.product_batches
inventory.inventory_movements
```

---

# 15. Productos

Un producto representa el artículo que maneja la estética.

Ejemplo:

```text
SKU: MED-BTX-100
Nombre: Botox 100 UI
Marca: ...
Categoría: Medicamentos
Unidad: UNIT
Stock mínimo: 3
```

El producto no representa un lote específico.

---

# 16. Lotes

Los medicamentos y determinados insumos pueden tener diferentes lotes.

Ejemplo:

```text
Producto:
Botox 100 UI

Lote A:
ABC001
Vencimiento: 2027-01-15
Cantidad: 5

Lote B:
ABC002
Vencimiento: 2027-08-20
Cantidad: 10
```

Por esto existe:

```text
inventory.product_batches
```

Los lotes almacenan información como:

* Producto.
* Proveedor.
* Número de lote.
* Fecha de fabricación.
* Fecha de vencimiento.
* Precio de compra.
* Cantidad inicial.
* Cantidad actual.

---

# 17. Movimientos de inventario

La tabla:

```text
inventory.inventory_movements
```

mantendrá el historial de movimientos.

Tipos iniciales:

```text
PURCHASE
TREATMENT
ADJUSTMENT_IN
ADJUSTMENT_OUT
RETURN
EXPIRED
DAMAGED
```

Cada movimiento registra:

```text
batch_id
movement_type
quantity
reference
notes
performed_by
created_at
```

Los movimientos son registros históricos y no deben modificarse arbitrariamente.

---

# 18. Stock

El stock actual se mantiene en:

```text
product_batches.current_quantity
```

Los movimientos mantienen la trazabilidad.

Sin embargo:

> PostgreSQL no será utilizado como capa de lógica de negocio.

No se crearán funciones almacenadas ni triggers para implementar la lógica de inventario salvo que en el futuro exista una necesidad técnica concreta y justificada.

La lógica será responsabilidad del API.

---

# 19. Transacciones de inventario

Las operaciones de inventario serán transaccionales desde el backend.

Por ejemplo:

```text
Registrar salida
       │
       ├── Validar usuario
       ├── Validar permiso
       ├── Obtener lote
       ├── Bloquear registro
       ├── Validar stock
       ├── Calcular nueva cantidad
       ├── Actualizar lote
       ├── Registrar movimiento
       └── Commit
```

Esto se implementará utilizando las capacidades transaccionales de Prisma/PostgreSQL.

No se trasladará esta lógica a funciones almacenadas.

---

# 20. FEFO

En una etapa posterior se podrá implementar:

> First Expired, First Out

para priorizar lotes próximos a vencer.

Ejemplo:

```text
Lote A → vence 2026-10 → 5 unidades
Lote B → vence 2027-03 → 20 unidades

Salida: 7

Resultado:

Lote A → 5
Lote B → 2
```

Esta lógica pertenecerá al backend y no a PostgreSQL.

---

# 21. Datos iniciales

La primera migration crea roles y permisos base.

Roles iniciales:

```text
ADMIN
AUXILIAR
MEDICO
```

No se creará un usuario administrador con contraseña dentro de la migration.

El usuario administrador inicial deberá crearse mediante un mecanismo seguro del backend.

---

# 22. Qué NO implementaremos inicialmente

Para evitar sobreingeniería, la primera etapa NO incluirá:

```text
Sessions
Microservices
CQRS
Event Sourcing
Message Broker
Event Bus
GraphQL
WebSockets
Redis
Kubernetes
```

Estos elementos podrán evaluarse en el futuro si existe una necesidad real.

La arquitectura debe permitir incorporarlos sin que formen parte obligatoria del sistema desde el primer día.

---

# 23. Etapa inicial del proyecto

La primera etapa estará enfocada en construir una base técnica sólida.

## Fase 1 - Bootstrap

* Crear proyecto NestJS.
* Configurar TypeScript.
* Configurar ESLint.
* Configurar Prettier.
* Configurar variables de entorno.
* Configurar Prisma.
* Conectar PostgreSQL.
* Configurar estructura modular.
* Configurar manejo global de errores.
* Configurar validación global.
* Configurar Swagger/OpenAPI.
* Configurar logging.

## Fase 2 - Auth

Implementar:

* Login.
* Password hashing con Argon2id.
* JWT access tokens.
* Refresh tokens.
* Refresh token rotation.
* Logout/revocación de refresh token.
* Forgot password.
* Reset password.
* Roles.
* Permisos.
* Guards de autorización.

## Fase 3 - Audit

Implementar:

* Registro de acciones relevantes.
* Usuario responsable.
* Entidad afectada.
* Valores anteriores/nuevos cuando corresponda.
* IP cuando esté disponible.
* Fecha/hora.

## Fase 4 - Inventory

Implementar:

* Categorías.
* Proveedores.
* Productos.
* Lotes.
* Entradas.
* Salidas.
* Ajustes.
* Stock.
* Historial de movimientos.
* Validación de stock.
* Control de vencimientos.
* Permisos de inventario.

---

# 24. Roadmap futuro

Una vez terminada la primera etapa:

```text
                 dra.charlincaro
                       │
       ┌───────────────┼────────────────┐
       │               │                │
      AUTH         INVENTORY           AUDIT
       │               │                │
       └───────────────┼────────────────┘
                       │
              ┌────────▼────────┐
              │    PATIENTS     │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │ APPOINTMENTS    │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │   TREATMENTS    │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │ CLINICAL HISTORY│
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      PURCHASES     BILLING      REPORTS
```

La incorporación de cada módulo debe respetar la misma arquitectura.

---

# 25. Reglas de desarrollo

## No hacer

* No colocar lógica de negocio compleja en controllers.
* No acceder directamente a Prisma desde controllers.
* No colocar lógica de negocio en DTOs.
* No almacenar passwords en texto plano.
* No almacenar refresh tokens en texto plano.
* No crear funciones SQL para reglas de negocio sin una justificación concreta.
* No crear triggers para lógica de negocio.
* No crear clases/interfaces innecesarias.
* No crear un `Service` gigante por módulo.
* No utilizar `shared` como un directorio genérico para cualquier cosa.
* No duplicar lógica entre módulos.
* No acoplar el dominio a NestJS o Prisma.

## Sí hacer

* Código pequeño y cohesivo.
* Dependencias explícitas.
* Casos de uso claros.
* Validación en los límites del sistema.
* Transacciones para operaciones críticas.
* Tests para reglas de negocio.
* Nombres descriptivos.
* Manejo consistente de errores.
* Migraciones versionadas.
* Documentación de decisiones arquitectónicas importantes.

---

# 26. Principio arquitectónico principal

La arquitectura debe responder a esta regla:

> **El negocio debe ser independiente de los detalles técnicos.**

PostgreSQL puede cambiar.

Prisma puede cambiar.

JWT puede cambiar.

El proveedor de correo puede cambiar.

El mecanismo de almacenamiento puede cambiar.

Pero las reglas principales del negocio de dra.charlincaro no deberían depender directamente de esas tecnologías.

---

# 27. Objetivo a largo plazo

El objetivo no es crear únicamente una API que funcione.

El objetivo es construir una plataforma que pueda crecer durante años sin convertirse en un monolito desorganizado.

Cada nueva funcionalidad debe responder:

1. ¿A qué módulo pertenece?
2. ¿Cuál es su caso de uso?
3. ¿Qué regla de negocio implementa?
4. ¿Qué dependencia necesita?
5. ¿Qué parte pertenece al dominio?
6. ¿Qué parte pertenece a infraestructura?
7. ¿Necesita realmente una nueva abstracción?

La evolución tecnológica futura no debe obligarnos a cambiar constantemente la arquitectura.

La arquitectura debe ser estable; las implementaciones pueden evolucionar.

---

# 28. Estado actual

## Completado

* Diseño inicial de PostgreSQL.
* Schema `auth`.
* Schema `inventory`.
* Schema `audit`.
* RBAC.
* Refresh tokens.
* Password reset tokens.
* Auditoría.
* Inventario por lotes.
* Historial de movimientos.

## Siguiente paso

Construcción del backend NestJS siguiendo la arquitectura definida en este documento.

Orden recomendado:

```text
1. Bootstrap NestJS
2. Configuración
3. Prisma
4. Estructura modular
5. Shared infrastructure mínima
6. Auth
7. JWT
8. Refresh tokens
9. RBAC
10. Audit
11. Inventory
12. Tests
13. Swagger
```

---

## Principio final

> **Simple cuando puede ser simple.**
>
> **Abstraído cuando existe una razón.**
>
> **Modular desde el principio.**
>
> **Preparado para crecer sin sobreingeniería.**
