# AGENTS.md

## Proyecto

Estás trabajando en el backend de **dra.charlincaro**.

El proyecto será una API REST construida con:

* Node.js
* TypeScript
* NestJS
* Prisma
* PostgreSQL
* JWT
* Argon2id
* pnpm

El sistema debe ser seguro, modular, mantenible y preparado para crecer considerablemente.

---

# 1. Regla principal

La arquitectura oficial del proyecto es:

> **Arquitectura Modular + Clean Architecture pragmática**

No mezclar arquitecturas innecesariamente.

No implementar simultáneamente MVC, Hexagonal, CQRS, Event Sourcing, DDD extremo, Microservices, etc.

Se pueden utilizar conceptos puntuales cuando exista una necesidad real, pero la arquitectura principal debe permanecer simple y consistente.

---

# 2. Gestor de paquetes

Utilizar exclusivamente:

> **pnpm**

No utilizar:

```text
npm
yarn
bun
```

El proyecto debe contener:

```text
pnpm-lock.yaml
```

Todos los comandos de instalación y ejecución de dependencias deben utilizar `pnpm`.

Ejemplos:

```bash
pnpm install
pnpm add <package>
pnpm add -D <package>
pnpm remove <package>
pnpm dev
pnpm test
```

No modificar manualmente `pnpm-lock.yaml`.

---

# 3. Stack

Utilizar inicialmente:

```text
Node.js
TypeScript
NestJS
Prisma
PostgreSQL
JWT
Argon2id
Swagger/OpenAPI
```

No agregar dependencias adicionales sin una razón técnica concreta.

Antes de instalar una librería, evaluar si:

1. El framework ya resuelve el problema.
2. El problema realmente existe.
3. La dependencia está mantenida.
4. Tiene impacto sobre seguridad o arquitectura.
5. Aporta suficiente valor para justificarla.

---

# 4. Arquitectura

La aplicación se organizará por módulos de negocio.

Estructura inicial:

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

Cada módulo debe mantener sus responsabilidades aisladas.

No crear módulos futuros hasta que sean necesarios.

---

# 5. Estructura de cada módulo

Cuando un módulo requiera las capas completas:

```text
module/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

## domain

Contiene:

* Entidades.
* Value Objects cuando sean necesarios.
* Reglas de negocio.
* Contratos necesarios para invertir dependencias.

No debe depender de:

```text
NestJS
Prisma
PostgreSQL
HTTP
JWT
```

---

## application

Contiene casos de uso.

Ejemplos:

```text
Login
RefreshAccessToken
Logout
ForgotPassword
ResetPassword

CreateProduct
UpdateProduct
CreateBatch
RegisterInventoryEntry
RegisterInventoryExit
AdjustInventory
```

Los casos de uso coordinan la lógica de aplicación.

No deben depender directamente de detalles HTTP.

---

## infrastructure

Contiene implementaciones técnicas.

Ejemplos:

```text
Prisma repositories
JWT implementation
Argon2 implementation
Email provider
Database adapters
External services
```

---

## presentation

Contiene:

```text
Controllers
HTTP DTOs
Guards
Pipes
HTTP-specific concerns
```

Los controllers deben ser delgados.

No colocar lógica de negocio compleja en controllers.

---

# 6. SOLID

Aplicar SOLID de forma pragmática.

Especialmente:

* Single Responsibility.
* Open/Closed.
* Liskov Substitution.
* Interface Segregation.
* Dependency Inversion.

No crear interfaces innecesarias.

No crear una interfaz únicamente porque una clase existe.

Una abstracción debe aportar un beneficio real.

---

# 7. Regla de dependencias

La dirección de dependencia debe mantenerse:

```text
Presentation
      ↓
Application
      ↓
Domain
      ↑
Infrastructure
```

Infrastructure puede implementar contratos definidos por capas internas.

El dominio nunca debe importar infraestructura.

Ejemplo correcto:

```text
UserRepository
       ↑
       │
PrismaUserRepository
```

Ejemplo incorrecto:

```text
Domain
  ↓
Prisma
```

---

# 8. Prisma

Prisma será el ORM utilizado para PostgreSQL.

Prisma pertenece a Infrastructure.

No exponer Prisma directamente desde:

```text
Controllers
Domain
Application
```

Los casos de uso deben depender de abstracciones cuando exista una razón para desacoplar la persistencia.

---

# 9. Base de datos existente

La base PostgreSQL ya fue diseñada.

Schemas:

```text
auth
audit
inventory
```

Tablas de `auth`:

```text
auth.users
auth.roles
auth.permissions
auth.user_roles
auth.role_permissions
auth.refresh_tokens
auth.password_reset_tokens
```

Tablas de `inventory`:

```text
inventory.categories
inventory.suppliers
inventory.products
inventory.product_batches
inventory.inventory_movements
```

Auditoría:

```text
audit.audit_logs
```

No recrear la base de datos innecesariamente.

No eliminar tablas existentes.

No cambiar nombres de tablas o columnas sin justificación.

---

# 10. Migraciones

Las modificaciones de base de datos deben realizarse mediante migrations.

Nunca modificar una migration que ya haya sido aplicada.

Antes de crear una nueva migration:

1. Revisar el esquema actual.
2. Determinar si el cambio realmente es necesario.
3. Crear migration.
4. Ejecutar Prisma correctamente.
5. Verificar que la aplicación continúe funcionando.

No crear funciones almacenadas ni triggers para lógica de negocio.

---

# 11. PostgreSQL

PostgreSQL será responsable principalmente de:

* Persistencia.
* Integridad referencial.
* Foreign Keys.
* Unique constraints.
* Check constraints.
* Índices.
* Transacciones.

No trasladar lógica de negocio compleja a PostgreSQL.

No crear:

```text
Stored Procedures
Stored Functions
Business Triggers
```

para reemplazar lógica que pertenece al backend.

---

# 12. Auth

Implementar autenticación utilizando:

```text
JWT Access Token
+
Refresh Token
```

El access token:

* Tendrá una vida corta.
* No será almacenado en PostgreSQL.

El refresh token:

* Será generado criptográficamente de forma segura.
* Se almacenará únicamente mediante hash.
* Tendrá expiración.
* Será revocable.
* Utilizará rotation.

---

# 13. Refresh Token Rotation

Implementar el siguiente flujo:

```text
Refresh Token A
       ↓
Validar
       ↓
Revocar A
       ↓
Crear Refresh Token B
       ↓
Crear nuevo Access Token
       ↓
Responder Acess Token + Refresh Token B
```

Utilizar:

```text
replaced_by_token_id
```

para representar la rotación.

Debe existir protección frente a reutilización de refresh tokens revocados.

No almacenar nunca el refresh token original en la base de datos.

---

# 14. Password hashing

Utilizar:

> Argon2id

Nunca almacenar passwords en texto plano.

Nunca implementar un algoritmo criptográfico propio.

Nunca registrar passwords en logs, auditoría o respuestas.

---

# 15. Password reset

Implementar:

```text
Forgot Password
Reset Password
```

Los tokens:

* Deben ser aleatorios.
* Deben expirar.
* Deben almacenarse como hash.
* Deben ser de un solo uso.
* Deben marcarse como utilizados.

Nunca almacenar el token original.

---

# 16. Sessions

No implementar sesiones en esta etapa.

No crear:

```text
auth.sessions
```

hasta que exista un requerimiento explícito.

---

# 17. RBAC

La autorización seguirá:

```text
User
 ↓
Role
 ↓
Permission
```

Roles iniciales:

```text
ADMIN
AUXILIAR
MEDICO
```

Los permisos deben ser granulares.

Ejemplos:

```text
users.read
users.create
users.update
users.delete

inventory.read
inventory.create
inventory.update
inventory.adjust

products.read
products.create
products.update

suppliers.read
suppliers.create
suppliers.update

treatments.read
treatments.create
treatments.update

audit.read
```

Utilizar Guards/decorators de NestJS o una solución equivalente bien encapsulada.

No duplicar comprobaciones de permisos manualmente en cada controller.

---

# 18. Inventory

El módulo inicial de negocio es Inventory.

Entidades principales:

```text
Category
Supplier
Product
ProductBatch
InventoryMovement
```

Un Product puede tener múltiples ProductBatch.

Ejemplo:

```text
Product
├── Batch A
├── Batch B
└── Batch C
```

Los lotes deben manejar:

* Número de lote.
* Fecha de fabricación.
* Fecha de vencimiento.
* Proveedor.
* Precio de compra.
* Cantidad inicial.
* Cantidad actual.

---

# 19. Inventory movements

Tipos existentes:

```text
PURCHASE
TREATMENT
ADJUSTMENT_IN
ADJUSTMENT_OUT
RETURN
EXPIRED
DAMAGED
```

Los movimientos son históricos.

No eliminar movimientos históricos.

No modificar movimientos históricos arbitrariamente.

Cuando sea necesario corregir una operación, preferir un movimiento correctivo.

---

# 20. Stock

El stock actual está representado por:

```text
inventory.product_batches.current_quantity
```

Los movimientos proporcionan trazabilidad.

Una modificación de stock y su movimiento correspondiente deben ejecutarse dentro de una misma transacción.

Ejemplo:

```text
BEGIN
    validar lote
    validar stock
    actualizar cantidad
    crear movimiento
COMMIT
```

Utilizar las transacciones de Prisma.

No utilizar stored procedures o triggers para implementar esta lógica.

---

# 21. Concurrencia

Las operaciones de inventario deben considerar condiciones de carrera.

Una salida de inventario no puede permitir stock negativo por una condición de concurrencia.

Utilizar transacciones y mecanismos apropiados de bloqueo/aislamiento mediante Prisma/PostgreSQL.

No asumir que dos solicitudes concurrentes leerán el mismo estado de forma segura.

---

# 22. FEFO

No implementar FEFO automáticamente durante el bootstrap inicial.

Cuando sea necesario, implementar:

```text
First Expired, First Out
```

como lógica de aplicación.

No implementar FEFO mediante funciones SQL o triggers.

---

# 23. Audit

La auditoría es independiente de Auth.

Utilizar:

```text
audit.audit_logs
```

Puede registrar acciones provenientes de cualquier módulo.

Ejemplos:

```text
LOGIN
PASSWORD_CHANGED
PASSWORD_RESET

PRODUCT_CREATED
PRODUCT_UPDATED

INVENTORY_ENTRY
INVENTORY_EXIT
INVENTORY_ADJUSTMENT
```

Nunca registrar:

```text
password
access_token
refresh_token
password_reset_token
secrets
credentials
```

---

# 24. DTOs

Los DTOs representan datos externos.

Utilizar validación de NestJS.

Validar:

* Tipos.
* Formatos.
* Campos requeridos.
* Campos opcionales.
* Rangos.
* Valores permitidos.

No utilizar DTOs como entidades de dominio.

---

# 25. Controllers

Controllers delgados.

Responsabilidades:

* Recibir request.
* Validar entrada.
* Delegar al caso de uso.
* Transformar respuesta HTTP.

No deben contener reglas de negocio.

No deben utilizar Prisma directamente.

---

# 26. Errores

Implementar manejo consistente de errores.

No exponer en producción:

```text
Stack traces
SQL
Prisma internals
Secrets
Tokens
Información sensible
```

Los errores de dominio/aplicación deben poder mapearse correctamente a respuestas HTTP.

---

# 27. Configuración

Utilizar variables de entorno.

Ejemplos:

```text
DATABASE_URL

JWT_ACCESS_SECRET
JWT_REFRESH_SECRET

JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN
```

No colocar secretos en código fuente.

Validar las variables necesarias al iniciar la aplicación.

Centralizar la configuración.

---

# 28. Seguridad

Implementar inicialmente:

* Helmet.
* CORS configurado explícitamente.
* Rate limiting cuando corresponda.
* Validación global.
* Argon2id.
* JWT.
* Refresh token rotation.
* Manejo seguro de errores.
* Secrets mediante environment variables.

No agregar sistemas de seguridad innecesariamente complejos sin necesidad.

---

# 29. Swagger

Configurar Swagger/OpenAPI.

Documentar:

* Endpoints.
* DTOs.
* Responses.
* Errores relevantes.
* Bearer authentication.

---

# 30. Logging

Utilizar logging estructurado.

Nunca registrar información sensible.

Especialmente nunca registrar:

```text
Passwords
JWTs
Refresh tokens
Reset tokens
Secrets
Database credentials
```

---

# 31. Testing

Priorizar tests para:

```text
Auth
Refresh token rotation
Password reset
RBAC
Inventory movements
Stock
Concurrent inventory operations
Audit
```

Utilizar:

* Unit tests.
* Integration tests.
* E2E tests.

Los casos de uso importantes deben poder probarse sin depender obligatoriamente de infraestructura real.

---

# 32. Dependencias

No agregar librerías innecesarias.

Antes de instalar una dependencia:

```text
1. Identificar el problema.
2. Verificar si NestJS/Node lo resuelve.
3. Evaluar mantenimiento.
4. Evaluar seguridad.
5. Evaluar complejidad.
6. Instalar únicamente si aporta valor.
```

Mantener el proyecto liviano.

---

# 33. Tecnologías NO requeridas inicialmente

No instalar ni configurar sin una necesidad real:

```text
Redis
Kafka
RabbitMQ
GraphQL
CQRS
Event Sourcing
Microservices
Kubernetes
```

Podrán evaluarse posteriormente si el crecimiento del sistema lo justifica.

---

# 34. Bootstrap inicial

La primera tarea de implementación debe ser preparar correctamente el proyecto.

Orden:

```text
1. Crear proyecto NestJS.
2. Configurar pnpm.
3. Configurar TypeScript.
4. Configurar ESLint.
5. Configurar Prettier.
6. Configurar environment variables.
7. Configurar Prisma.
8. Conectar PostgreSQL existente.
9. Configurar estructura modular.
10. Configurar validación global.
11. Configurar manejo global de errores.
12. Configurar logging.
13. Configurar Swagger.
14. Verificar build.
15. Verificar tests.
```

No implementar todo Auth o Inventory durante el bootstrap.

Primero garantizar que la infraestructura del proyecto funciona correctamente.

---

# 35. Orden de implementación posterior

Después del bootstrap:

```text
AUTH
│
├── Users
├── Roles
├── Permissions
├── Password hashing
├── Login
├── JWT
├── Refresh tokens
├── Refresh token rotation
├── Logout
├── Forgot password
├── Reset password
└── RBAC

AUDIT
│
└── Audit logging

INVENTORY
│
├── Categories
├── Suppliers
├── Products
├── Product batches
├── Inventory entries
├── Inventory exits
├── Adjustments
├── Stock
└── Inventory history
```

---

# 36. Regla de desarrollo incremental

No implementar funcionalidades futuras anticipadamente.

No crear:

```text
patients/
appointments/
treatments/
billing/
```

hasta que sean necesarias.

La arquitectura debe estar preparada para crecer, pero el código debe representar únicamente las funcionalidades actuales.

---

# 37. Git

Mantener commits pequeños y coherentes.

No mezclar en un mismo commit:

```text
Refactor
+
Nueva funcionalidad
+
Cambio de base de datos
+
Cambio de configuración
```

si pueden separarse razonablemente.

No realizar commits destructivos.

No incluir:

```text
.env
secrets
credentials
tokens
```

---

# 38. Calidad

Antes de considerar una tarea terminada ejecutar, cuando corresponda:

```bash
pnpm lint
pnpm format
pnpm test
pnpm build
```

Las funcionalidades críticas deben tener tests.

No ignorar errores de TypeScript.

No utilizar `any` salvo que exista una razón explícita y documentada.

Preferir tipos explícitos y seguros.

---

# 39. Antes de modificar arquitectura

Si una funcionalidad requiere introducir una nueva tecnología o patrón arquitectónico:

1. Identificar el problema.
2. Explicar por qué la arquitectura actual no es suficiente.
3. Evaluar la alternativa más simple.
4. Implementar únicamente si existe una necesidad real.

No introducir patrones por tendencia tecnológica.

---

# 40. Objetivo arquitectónico

El backend debe poder evolucionar durante años sin convertirse en un sistema difícil de mantener.

Prioridades:

```text
1. Seguridad
2. Correctitud
3. Mantenibilidad
4. Testabilidad
5. Claridad
6. Bajo acoplamiento
7. Evolución futura
```

La arquitectura debe permanecer estable mientras las implementaciones pueden evolucionar.

---

# 41. Instrucción de inicio para Codex

Comienza únicamente con el **bootstrap del backend**.

Primero:

* Inspecciona el repositorio existente.
* Lee `README.md`.
* Lee este `AGENTS.md`.
* Determina si el repositorio está vacío o contiene código.
* No sobrescribas código existente sin analizarlo.
* Crea el proyecto NestJS utilizando `pnpm`.
* Configura TypeScript, ESLint y Prettier.
* Configura Prisma.
* Configura la conexión a PostgreSQL.
* Respeta los schemas existentes: `auth`, `audit`, `inventory`.
* Configura la estructura modular.
* Configura configuración mediante environment variables.
* Configura validación global.
* Configura manejo global de errores.
* Configura logging.
* Configura Swagger.
* Configura una base mínima de testing.
* Ejecuta lint, tests y build.

Al finalizar el bootstrap:

1. La aplicación debe iniciar correctamente.
2. La conexión a PostgreSQL debe estar correctamente configurada.
3. Prisma debe reconocer la estructura existente sin destruirla.
4. `pnpm lint` debe funcionar.
5. `pnpm test` debe funcionar.
6. `pnpm build` debe funcionar.

**No implementes todavía Login, JWT, Inventory ni otras funcionalidades de negocio.**

Primero deja una base técnica limpia y funcional.

Después de completar y verificar el bootstrap, continúa con Auth en una etapa independiente.
