import { Router } from 'express'
import {
  generateTestCases,
  saveTestCase,
  savePdfTestCase,
  downloadTestCase,
  exportPdfDownload,
  listTestCases,
} from '../controllers/testcase.controller'

const router = Router()

router.post('/generate', generateTestCases)
router.post('/save', saveTestCase)
router.post('/save-pdf', savePdfTestCase)
router.post('/pdf-download', exportPdfDownload)
router.get('/list', listTestCases)
router.get('/download/:filename', downloadTestCase)

export default router
