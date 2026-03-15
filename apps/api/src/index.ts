import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { authRoutes } from './routes/auth'
import { rolesRoutes, userRoleRoutes } from './routes/roles'
import { customersRoutes } from './routes/customers'
import { contactsRoutes } from './routes/contacts'
import { companiesRoutes } from './routes/companies'
import { projectsRoutes } from './routes/projects'
import { projectTemplatesRoutes } from './routes/project-templates'
import { unitsRoutes } from './routes/units'
import { leadsRoutes } from './routes/leads'
import { dealsRoutes } from './routes/deals'
import { quotationsRoutes } from './routes/quotations'
import { commercialQuotationsRoutes } from './routes/commercial-quotations'
import { contractsRoutes } from './routes/contracts'
import { leaseAgreementsRoutes } from './routes/lease-agreements'
import { preHandoverInspectionsRoutes } from './routes/pre-handover-inspections'

const API_PORT = Number(process.env.PORT ?? 3000)

const app = new Elysia()
  .use(cors())
  .get('/api/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .use(authRoutes)
  .use(rolesRoutes)
  .use(userRoleRoutes)
  .use(customersRoutes)
  .use(contactsRoutes)
  .use(companiesRoutes)
  .use(projectsRoutes)
  .use(projectTemplatesRoutes)
  .use(unitsRoutes)
  .use(leadsRoutes)
  .use(dealsRoutes)
  .use(quotationsRoutes)
  .use(commercialQuotationsRoutes)
  .use(contractsRoutes)
  .use(leaseAgreementsRoutes)
  .use(preHandoverInspectionsRoutes)
  .listen(API_PORT)

console.log(`API running at http://localhost:${API_PORT}`)
