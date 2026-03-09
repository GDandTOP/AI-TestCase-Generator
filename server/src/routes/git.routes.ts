import { Router } from 'express'
import { validateRepo, getBranches, getDiff, cloneRepo, openFolderDialog, getProjectContext } from '../controllers/git.controller'

const router = Router()

router.post('/validate', validateRepo)
router.post('/branches', getBranches)
router.post('/project-context', getProjectContext)
router.post('/diff', getDiff)
// GitHub URL로부터 저장소를 클론하는 엔드포인트
router.post('/clone', cloneRepo)
// macOS 네이티브 폴더 선택 다이얼로그를 열고 선택된 경로를 반환
router.get('/open-folder', openFolderDialog)

export default router
