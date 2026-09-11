import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;
const FASTAPI_URL = (process.env.FASTAPI_URL || process.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * Forward request directly to FastAPI backend.
 * Never invents mock compliance records.
 */
async function forwardToFastAPI(req: Request, res: Response, targetPath: string, method: string = 'GET') {
  try {
    const url = `${FASTAPI_URL}${targetPath}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {})
      }
    };

    if (method !== 'GET' && method !== 'HEAD' && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const text = await response.text();
      return res.status(response.status).send(text);
    }
  } catch (err: any) {
    console.error(`[PROXY_ERROR] Failed forwarding ${method} ${targetPath} to FastAPI (${FASTAPI_URL}):`, err.message);
    return res.status(503).json({
      error: 'FastAPI compliance backend unreachable',
      detail: `Ensure the Python FastAPI backend is running at ${FASTAPI_URL}. Real OCR and database persistence require FastAPI.`,
      systemStatus: 'UNAVAILABLE'
    });
  }
}

/**
 * GET /api/health - Backend Health Check
 */
app.get('/api/health', (req: Request, res: Response) => {
  forwardToFastAPI(req, res, '/api/health', 'GET');
});

/**
 * GET /api/dashboard/stats - Real Dashboard Metrics from FastAPI
 */
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  forwardToFastAPI(req, res, '/api/v1/dashboard/stats', 'GET');
});

/**
 * GET /api/products - Real Inspected Products Repository from PostgreSQL
 */
app.get('/api/products', (req: Request, res: Response) => {
  const queryStr = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  forwardToFastAPI(req, res, `/api/v1/products${queryStr}`, 'GET');
});

/**
 * GET /api/products/:id - Single Persistent Inspection Record from PostgreSQL
 */
app.get('/api/products/:id', (req: Request, res: Response) => {
  forwardToFastAPI(req, res, `/api/v1/products/${req.params.id}`, 'GET');
});

/**
 * GET /inspections - Root Inspections Endpoint
 */
app.get('/inspections', (req: Request, res: Response) => {
  const queryStr = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  forwardToFastAPI(req, res, `/inspections${queryStr}`, 'GET');
});

/**
 * GET /inspections/:id - Root Inspection by ID
 */
app.get('/inspections/:id', (req: Request, res: Response) => {
  forwardToFastAPI(req, res, `/inspections/${req.params.id}`, 'GET');
});

/**
 * POST /api/scan - Real Automated Packaging Label OCR Analysis & Legal Metrology Verification
 */
app.post('/api/scan', (req: Request, res: Response) => {
  forwardToFastAPI(req, res, '/api/v1/scan', 'POST');
});

/**
 * POST /api/products/:id/notice - Issue Statutory Legal Notice (Sec 36 / 48)
 */
app.post('/api/products/:id/notice', (req: Request, res: Response) => {
  forwardToFastAPI(req, res, `/api/v1/products/${req.params.id}/notice`, 'POST');
});

/**
 * GET /api/rules - Legal Metrology Rules Matrix
 */
app.get('/api/rules', (req: Request, res: Response) => {
  forwardToFastAPI(req, res, '/api/v1/rules', 'GET');
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Disha Legal Metrology Compliance API Proxy`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Target FastAPI Backend: ${FASTAPI_URL}`);
  console.log(`  Mock and static data generation: STRICTLY DISABLED`);
  console.log(`=======================================================`);
});
