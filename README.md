# 📅 Working Days API
API REST en **NestJS + TypeScript** que calcula fechas hábiles en Colombia, teniendo en cuenta fines de semana, festivos nacionales y jornada laboral (08:00–12:00 y 13:00–17:00). Siempre responde en **UTC ISO 8601 (Z)**.

## 🚀 Instalación, uso, estructura, despliegue y tests
```bash
git clone https://github.com/tapascod315/workingdays-api.git
cd workingdays-api
npm install
npm run start:dev
```
Endpoint local: `http://localhost:3000/api/working-date`

Ejemplo de uso:
```bash
curl "http://localhost:3000/api/working-date?days=1&hours=3&date=2025-08-05T20:00:00Z"
```
Respuesta esperada:
```json
{ "date": "2025-08-07T15:00:00Z" }
```

Casos clave:
- Viernes 5:00 p.m. + 1h → Lunes 9:00 a.m. COL → `2025-08-04T14:00:00Z`
- Domingo 6:00 p.m. + 1d → Lunes 5:00 p.m. COL → `2025-08-04T22:00:00Z`
- Martes 3:00 p.m. + 1d + 3h → Jueves 10:00 a.m. COL → `2025-08-07T15:00:00Z`
- Abril 10 2025 3:00 p.m. UTC + 5d + 4h (Semana Santa) → Abril 21 3:30 p.m. COL → `2025-04-21T20:00:00Z`

Estructura del proyecto:
```
src/
├─ main.ts / app.module.ts
└─ dates/
   ├─ dates.controller.ts     # Endpoint REST
   ├─ services/               # Lógica de negocio
   └─ dtos/                   # Validación de entrada
```

Despliegue en **Vercel con CI/CD**: cada push en la rama `main` activa un workflow de GitHub Actions que construye y publica automáticamente en Vercel.
```