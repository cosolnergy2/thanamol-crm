import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
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
import { reportsRoutes } from './routes/reports'
import { invoicesRoutes } from './routes/invoices'
import { paymentsRoutes } from './routes/payments'
import { contractsRoutes } from './routes/contracts'
import { activityLogsRoutes } from './routes/activity-logs'
import { automationRulesRoutes } from './routes/automation-rules'
import { clientPortalRoutes } from './routes/client-portal'
import { commentsRoutes } from './routes/comments'
import { depositsRoutes } from './routes/deposits'
import { handoverPhotosRoutes } from './routes/handover-photos'
import { handoversRoutes } from './routes/handovers'
import { leaseAgreementsRoutes } from './routes/lease-agreements'
import { meterRecordsRoutes } from './routes/meter-records'
import { notificationsRoutes, notificationPreferencesRoutes } from './routes/notifications'
import { preHandoverInspectionsRoutes } from './routes/pre-handover-inspections'
import { saleJobsRoutes } from './routes/sale-jobs'
import { taskConfigRoutes } from './routes/task-config'
import { taskStatusesRoutes } from './routes/task-statuses'
import { tasksRoutes } from './routes/tasks'
import { ticketsRoutes } from './routes/tickets'
import { warehouseRequirementsRoutes } from './routes/warehouse-requirements'
import { meetingsRoutes } from './routes/meetings'
import { meetingTemplatesRoutes } from './routes/meeting-templates'
import { documentsRoutes } from './routes/documents'
import { isoDocumentsRoutes } from './routes/iso-documents'
import { pdfTemplatesRoutes } from './routes/pdf-templates'
import { uploadsRoutes } from './routes/uploads'
import { fmsZonesRoutes } from './routes/fms/zones'
import { fmsAssetCategoriesRoutes } from './routes/fms/asset-categories'
import { fmsAssetsRoutes } from './routes/fms/assets'
import { fmsWorkOrdersRoutes } from './routes/fms/work-orders'
import { fmsPMRoutes } from './routes/fms/preventive-maintenance'
import { fmsCalibrationsRoutes } from './routes/fms/calibrations'
import { fmsSecurityPatrolsRoutes } from './routes/fms/security-patrols'
import { fmsCleaningChecklistsRoutes } from './routes/fms/cleaning-checklists'
import { fmsVisitorsRoutes } from './routes/fms/visitors'
import { fmsKeyRecordsRoutes } from './routes/fms/key-records'
import { fmsParkingSlotsRoutes } from './routes/fms/parking-slots'
import { fmsServiceLogsRoutes } from './routes/fms/service-logs'
import { fmsPettyCashRoutes } from './routes/fms/petty-cash'
import { fmsInventoryCategoriesRoutes } from './routes/fms/inventory-categories'
import { fmsInventoryRoutes } from './routes/fms/inventory'
import { fmsStockMovementsRoutes } from './routes/fms/stock-movements'
import { fmsStockIssuesRoutes } from './routes/fms/stock-issues'
import { fmsGRNRoutes } from './routes/fms/grn'
import { fmsPurchaseRequestsRoutes } from './routes/fms/purchase-requests'
import { fmsPurchaseOrdersRoutes } from './routes/fms/purchase-orders'
import { fmsVendorQuotationsRoutes } from './routes/fms/vendor-quotations'

const API_PORT = Number(process.env.PORT ?? 3000)

const app = new Elysia()
  .use(cors())
  .use(staticPlugin({ assets: 'uploads', prefix: '/uploads' }))
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
  .use(reportsRoutes)
  .use(invoicesRoutes)
  .use(paymentsRoutes)
  .use(contractsRoutes)
  .use(activityLogsRoutes)
  .use(automationRulesRoutes)
  .use(clientPortalRoutes)
  .use(commentsRoutes)
  .use(depositsRoutes)
  .use(handoverPhotosRoutes)
  .use(handoversRoutes)
  .use(leaseAgreementsRoutes)
  .use(meterRecordsRoutes)
  .use(notificationsRoutes)
  .use(notificationPreferencesRoutes)
  .use(preHandoverInspectionsRoutes)
  .use(saleJobsRoutes)
  .use(taskConfigRoutes)
  .use(taskStatusesRoutes)
  .use(tasksRoutes)
  .use(ticketsRoutes)
  .use(warehouseRequirementsRoutes)
  .use(meetingsRoutes)
  .use(meetingTemplatesRoutes)
  .use(documentsRoutes)
  .use(isoDocumentsRoutes)
  .use(pdfTemplatesRoutes)
  .use(uploadsRoutes)
  .use(fmsZonesRoutes)
  .use(fmsAssetCategoriesRoutes)
  .use(fmsAssetsRoutes)
  .use(fmsWorkOrdersRoutes)
  .use(fmsPMRoutes)
  .use(fmsCalibrationsRoutes)
  .use(fmsSecurityPatrolsRoutes)
  .use(fmsCleaningChecklistsRoutes)
  .use(fmsVisitorsRoutes)
  .use(fmsKeyRecordsRoutes)
  .use(fmsParkingSlotsRoutes)
  .use(fmsServiceLogsRoutes)
  .use(fmsPettyCashRoutes)
  .use(fmsInventoryCategoriesRoutes)
  .use(fmsInventoryRoutes)
  .use(fmsStockMovementsRoutes)
  .use(fmsStockIssuesRoutes)
  .use(fmsGRNRoutes)
  .use(fmsPurchaseRequestsRoutes)
  .use(fmsPurchaseOrdersRoutes)
  .use(fmsVendorQuotationsRoutes)
  .listen(API_PORT)

console.log(`API running at http://localhost:${API_PORT}`)
