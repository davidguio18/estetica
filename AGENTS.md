## 1. Contexto del proyecto

Estás trabajando en el backend de **dra.charlincaro**.

Es una API REST para una estética que inicialmente gestionará:

* Autenticación.
* Usuarios.
* Roles.
* Permisos.
* Auditoría.
* Inventario.
* Productos.
* Proveedores.
* Lotes.
* Movimientos de inventario.

El sistema crecerá posteriormente para incorporar:

* Pacientes.
* Citas.
* Tratamientos.
* Historia clínica.
* Compras.
* Facturación.
* Reportes.
* Notificaciones.

El proyecto debe construirse pensando en crecimiento a largo plazo.

---

# 2. Stack obligatorio

Utilizar:

* Node.js.
* TypeScript.
* NestJS.
* Prisma ORM.
* PostgreSQL.
* JWT.
* Argon2id.
* REST API.
* Swagger/OpenAPI.

No cambiar el stack tecnológico sin una justificación técnica y autorización explícita.

---

# 3. Arquitectura obligatoria

Utilizar:

> **Arquitectura Modular + Clean Architecture pragmática.**

No mezclar innecesariamente arquitecturas.

No implementar simultáneamente:

* MVC como arquitectura principal.
* Hexagonal como arquitectura independiente.
* CQRS.
* Event Sourcing.
* Microservicios.
* DDD extremo.

Se pueden utilizar conceptos compatibles con estas arquitecturas cuando resuelvan una necesidad real, pero no introducir patrones solamente por seguir tendencias.

---

# 4. Arquitectura modular

El sistema debe organizarse por dominios de negocio.

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

Los futuros módulos serán independientes:

```text
patients
appointments
treatments
clinical-history
purchases
billing
reports
notifications
```

No crear estos módulos hasta que sean necesarios.

---

# 5. Estructura interna de los módulos

Cuando un módulo necesite las capas completas:

```text
module/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

## Domain

Contiene:

* Entidades.
* Value Objects cuando sean necesarios.
* Reglas de negocio.
* Contratos que deban abstraer infraestructura.

El domain NO debe depender de:

* NestJS.
* Prisma.
* PostgreSQL.
* HTTP.
* JWT.
* Frameworks externos.

---

## Application

Contiene los casos de uso.

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

Los casos de uso deben coordinar el comportamiento de la aplicación.

No colocar código HTTP directamente aquí.

---

## Infrastructure

Contiene implementaciones técnicas.

Ejemplos:

```text
Prisma repositories
JWT service
Argon2 password hasher
Email provider
Database implementation
External services
```

Esta capa puede depender de frameworks y librerías externas.

---

## Presentation

Contiene:

* Controllers.
* HTTP DTOs.
* Guards.
* Pipes relacionados con entrada HTTP.
* Respuestas HTTP.

Los controllers deben ser delgados.

No colocar lógica de negocio compleja en controllers.

---

# 6. SOLID

Aplicar SOLID de forma pragmática.

No crear interfaces innecesarias.

No crear abstracciones por obligación.

Una abstracción debe existir si aporta:

* Desacoplamiento.
* Testabilidad.
* Sustituibilidad.
* Aislamiento tecnológico.
* Una necesidad real del dominio.

Evitar sobreingeniería.

---

# 7. Shared

`shared` debe ser pequeño.

No utilizarlo como un directorio genérico para cualquier código.

Solo colocar allí componentes realmente transversales.

No colocar en `shared` algo que pertenezca exclusivamente a:

```text
auth
inventory
audit
```

---

# 8. Base de datos

La base de datos PostgreSQL ya fue diseñada.

La estructura inicial es:

```text
auth
├── users
├── roles
├── permissions
├── user_roles
├── role_permissions
├── refresh_tokens
└── password_reset_tokens

audit
└── audit_logs

inventory
├── categories
├── suppliers
├── products
├── product_batches
└── inventory_movements
```

No modificar esta estructura sin necesidad.

Si se necesita modificar el esquema:

* Crear una nueva migration.
* Nunca modificar una migration que ya haya sido aplicada.
* Documentar cambios importantes.
* Mantener compatibilidad cuando sea razonablemente posible.

---

# 9. PostgreSQL

PostgreSQL es principalmente una capa de persistencia e integridad.

Utilizar PostgreSQL para:

* Constraints.
* Foreign keys.
* Unique constraints.
* Check constraints.
* Índices.
* Transacciones.
* Persistencia.

NO trasladar reglas de negocio complejas a PostgreSQL.

No crear:

* Stored procedures para reglas de negocio.
* Stored functions para casos de uso.
* Triggers de lógica de negocio.

No crear funciones o triggers únicamente para evitar código en el backend.

Si existe una necesidad excepcional, documentar primero la razón técnica.

---

# 10. Prisma

Prisma será utilizado como adapter de persistencia.

Los detalles de Prisma no deben contaminar el dominio.

Evitar:

```text
Domain -> Prisma
```

Preferir:

```text
Application
    ↓
Repository contract
    ↓
Prisma implementation
    ↓
PostgreSQL
```

---

# 11. Auth

Implementar autenticación utilizando:

```text
JWT access token
+
Refresh token
```

El access token:

* Será de corta duración.
* No se almacenará en PostgreSQL.

El refresh token:

* Será seguro y aleatorio.
* No se almacenará en texto plano.
* Solo se almacenará su hash.
* Tendrá expiración.
* Podrá ser revocado.
* Utilizará rotation.

---

# 12. Refresh Token Rotation

Implementar:

```text
Refresh Token A
       ↓
validar
       ↓
revocar A
       ↓
crear B
       ↓
Access Token nuevo
+
Refresh Token B
```

Utilizar:

```text
replaced_by_token_id
```

para registrar la relación entre tokens.

Debe contemplarse la detección de reutilización de un refresh token ya revocado.

Si se detecta reutilización, aplicar una estrategia segura de revocación de la cadena de tokens asociada según el diseño de Auth.

---

# 13. Passwords

Nunca almacenar passwords en texto plano.

Utilizar:

```text
Argon2id
```

Nunca implementar hashing criptográfico manual.

No registrar passwords en:

* Logs.
* Errores.
* Auditoría.
* Respuestas HTTP.
* Base de datos.

---

# 14. Password reset

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
* Deben marcarse como usados después del reset exitoso.

Nunca almacenar el token original.

---

# 15. Sesiones

NO implementar `sessions` en esta etapa.

No crear:

```text
auth.sessions
```

hasta que exista un requerimiento real.

---

# 16. RBAC

La autorización utilizará:

```text
Users
   ↓
Roles
   ↓
Permissions
```

Roles iniciales:

```text
ADMIN
AUXILIAR
MEDICO
```

Los permisos serán granulares.

Ejemplos:

```text
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

users.read
users.create
users.update
users.delete

audit.read
```

La autorización debe realizarse mediante Guards/decorators o una solución equivalente bien encapsulada.

No llenar controllers con verificaciones manuales repetitivas.

---

# 17. Inventory

El inventario utiliza:

```text
products
product_batches
inventory_movements
```

Un producto NO representa un lote.

Un producto puede tener múltiples lotes.

Ejemplo:

```text
Product
 ├── Batch A
 ├── Batch B
 └── Batch C
```

Los lotes manejan:

* Número de lote.
* Fecha de fabricación.
* Fecha de vencimiento.
* Proveedor.
* Precio de compra.
* Cantidad inicial.
* Cantidad actual.

---

# 18. Movimientos de inventario

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

Los movimientos representan historial.

No borrar movimientos históricos.

No modificar movimientos históricos salvo que exista un caso de negocio explícito y auditado.

Preferir movimientos correctivos sobre modificar el historial.

---

# 19. Stock

El stock actual está representado por:

```text
product_batches.current_quantity
```

Los movimientos representan la trazabilidad.

Las operaciones de stock deben ejecutarse desde el backend utilizando transacciones.

No realizar:

```text
UPDATE current_quantity
```

de forma aislada sin garantizar consistencia con el movimiento correspondiente.

---

# 20. Concurrencia

Las operaciones de inventario deben considerar concurrencia.

Para una salida:

```text
BEGIN
    obtener lote de forma segura
    validar stock
    actualizar stock
    crear movimiento
COMMIT
```

Utilizar las capacidades transaccionales de Prisma/PostgreSQL.

No implementar esta lógica mediante stored procedures o triggers.

---

# 21. FEFO

No implementar FEFO automáticamente en la primera versión si no es necesario.

Cuando se implemente:

```text
First Expired, First Out
```

debe estar en el backend como regla de negocio.

Ejemplo:

```text
Lote A → vence primero
Lote B → vence después

Salida:
usar primero Lote A
```

---

# 22. Audit

La auditoría está separada del módulo de autenticación.

Schema:

```text
audit
└── audit_logs
```

Debe poder registrar acciones de cualquier módulo.

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

La auditoría debe registrar cuando corresponda:

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

No almacenar información sensible innecesaria.

Nunca registrar:

* Passwords.
* Access tokens.
* Refresh tokens.
* Password reset tokens.
* Secretos.
* Credenciales.

---

# 23. DTOs

Los DTOs se utilizarán para validar entradas externas.

Utilizar las herramientas oficiales de NestJS para validación.

Los DTOs HTTP no deben convertirse automáticamente en entidades de dominio.

Validar:

* Tipos.
* Formatos.
* Rangos.
* Campos obligatorios.
* Campos opcionales.

La validación de negocio debe permanecer en application/domain.

---

# 24. Controllers

Controllers pequeños.

Ejemplo conceptual:

```text
POST /auth/login
        ↓
AuthController
        ↓
LoginUseCase
```

No:

```text
AuthController
 ├── validar password
 ├── consultar Prisma
 ├── generar JWT
 ├── guardar refresh token
 └── ...
```

El controller solamente coordina la entrada/salida HTTP.

---

# 25. Manejo de errores

Implementar manejo consistente de errores.

No devolver stack traces en producción.

Los errores internos no deben revelar:

* SQL.
* Prisma internals.
* Password information.
* Tokens.
* Secrets.
* Información sensible.

Usar excepciones de aplicación/dominio cuando corresponda y mapearlas apropiadamente a HTTP.

---

# 26. Configuración

Nunca colocar secretos directamente en código.

Utilizar variables de entorno.

Ejemplos conceptuales:

```text
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN
```

Los nombres definitivos deben quedar centralizados en configuración.

Validar las variables de entorno al iniciar la aplicación.

La aplicación debe fallar rápidamente si falta una configuración crítica.

---

# 27. Seguridad

Aplicar como mínimo:

* Helmet.
* CORS configurado explícitamente.
* Rate limiting donde corresponda.
* Validación de entrada.
* Password hashing seguro.
* JWT seguro.
* Refresh token rotation.
* Sanitización de errores.
* Secrets mediante environment variables.
* No exposición de información sensible.

No almacenar secretos en Git.

---

# 28. Logging

Implementar logging estructurado.

Los logs deben ser útiles para diagnosticar problemas.

Nunca registrar:

```text
password
access_token
refresh_token
reset_token
jwt_secret
database_password
```

Los datos sensibles deben ser excluidos o anonimizados.

---

# 29. Testing

Todo caso de uso importante debe ser testeable de forma aislada.

Prioridad:

1. Auth.
2. Refresh tokens.
3. Password reset.
4. RBAC.
5. Inventory movements.
6. Stock.
7. Concurrencia.
8. Audit.

No depender siempre de PostgreSQL para unit tests.

Usar mocks/fakes cuando corresponda.

Los integration tests sí deben validar la interacción real con PostgreSQL cuando sea necesario.

---

# 30. Swagger

La API debe estar documentada mediante Swagger/OpenAPI.

Documentar:

* Endpoints.
* DTOs.
* Responses.
* Errores.
* Autenticación Bearer.
* Permisos cuando sea útil.

No dejar endpoints importantes sin documentación.

---

# 31. Código limpio

Preferir:

```text
nombres claros
funciones pequeñas
clases cohesivas
dependencias explícitas
errores explícitos
```

Evitar:

```text
God classes
God services
God controllers
Utils genéricos
Helpers ambiguos
Métodos de cientos de líneas
Abstracciones innecesarias
```

---

# 32. Regla sobre archivos

No crear estructuras gigantes desde el primer día.

No crear carpetas vacías para todos los módulos futuros.

Crear únicamente lo necesario para la funcionalidad actual.

La arquitectura debe poder crecer, pero no debemos simular que ya existe todo el sistema.

---

# 33. Regla sobre nuevas tecnologías

No introducir una tecnología simplemente porque sea popular.

Antes de agregar una dependencia importante evaluar:

1. Qué problema resuelve.
2. Si NestJS/Node/TypeScript ya lo resuelve.
3. Complejidad adicional.
4. Mantenimiento.
5. Seguridad.
6. Impacto arquitectónico.
7. Necesidad actual.

Ejemplos que NO deben agregarse inicialmente sin necesidad:

```text
Redis
Kafka
RabbitMQ
CQRS
Event sourcing
Microservices
Kubernetes
```

---

# 34. Roadmap inicial

Implementar en este orden:

## Paso 1

Crear proyecto NestJS.

## Paso 2

Configurar:

* TypeScript.
* ESLint.
* Prettier.
* Environment configuration.
* Global validation.
* Global exception handling.
* Logging.
* Swagger.

## Paso 3

Configurar Prisma.

Conectar con la base PostgreSQL existente.

No recrear la base de datos desde cero si ya existe.

Verificar correctamente los schemas:

```text
auth
audit
inventory
```

## Paso 4

Crear estructura modular.

## Paso 5

Implementar Auth.

Orden:

```text
Users
Roles
Permissions
Password hashing
Login
JWT
Refresh tokens
Rotation
Logout
Forgot password
Reset password
RBAC
```

## Paso 6

Implementar Audit.

## Paso 7

Implementar Inventory.

Orden:

```text
Categories
Suppliers
Products
Batches
Inventory entries
Inventory exits
Adjustments
Stock
Inventory history
```

## Paso 8

Tests.

## Paso 9

Swagger y documentación.

---

# 35. Primera implementación

Antes de escribir código de negocio:

1. Revisar el repositorio.
2. Revisar `README.md`.
3. Revisar `AGENTS.md`.
4. Revisar `package.json` si existe.
5. Revisar configuración existente.
6. Revisar Prisma si existe.
7. Revisar variables de entorno.
8. No sobrescribir código existente sin analizarlo.

Si el repositorio está vacío, crear la estructura desde cero.

---

# 36. Regla de migraciones

Las migrations de Prisma deben mantenerse versionadas.

No modificar migrations ya aplicadas.

No hacer cambios manuales en producción que no estén representados en migrations.

La base de datos PostgreSQL ya tiene una migration inicial equivalente a:

```text
V001__create_auth_audit_inventory.sql
```

El backend debe respetar el esquema existente.

Si Prisma requiere una migration adicional:

```text
prisma migrate
```

debe utilizarse correctamente y documentarse.

---

# 37. Criterio de finalización

Una funcionalidad no se considera terminada simplemente porque compile.

Debe cumplir:

* Arquitectura correcta.
* Validaciones.
* Manejo de errores.
* Seguridad.
* Tests apropiados.
* Documentación.
* Integración con autorización.
* Auditoría cuando corresponda.
* No introducir acoplamiento innecesario.

---

# 38. Principio fundamental

Mantener siempre esta regla:

> **La infraestructura es un detalle. El negocio es el centro.**

El código debe poder evolucionar tecnológicamente sin obligarnos a reescribir las reglas de negocio.

---

# 39. Instrucción final para Codex

Procede a construir el backend de **dra.charlincaro** siguiendo estrictamente las decisiones arquitectónicas de este documento.

No agregues funcionalidades que no hayan sido solicitadas.

No implementes sesiones.

No agregues funciones ni triggers de negocio a PostgreSQL.

No introduzcas CQRS, microservicios, event sourcing, Redis, brokers o tecnologías adicionales sin una necesidad concreta.

No sobreingenierices.

Prioriza:

```text
claridad
+
mantenibilidad
+
seguridad
+
testabilidad
+
bajo acoplamiento
+
crecimiento futuro
```

Antes de implementar una decisión arquitectónica importante, verifica que sea consistente con este documento y con `README.md`.

Si encuentras una contradicción entre una implementación solicitada y estas reglas, prioriza la arquitectura establecida y explica la contradicción antes de realizar un cambio estructural.
