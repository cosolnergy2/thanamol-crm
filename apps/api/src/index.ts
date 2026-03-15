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
import { taskStatusesRoutes } from './routes/task-statuses'
import { automationRulesRoutes } from './routes/automation-rules'
import { ticketsRoutes } from './routes/tickets'

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
  .use(taskStatusesRoutes)
  .use(automationRulesRoutes)
  .use(ticketsRoutes)
  .listen(API_PORT)

console.log(`API running at http://localhost:${API_PORT}`)
