# Troubleshooting Guide: Loading State Issues Fixed

## ✅ What Was Fixed

### **Problem 1: Knowledge Base Loading Spinner (Forever)**
- **Cause**: Database session not properly flushing after queries
- **Fix**: Added explicit `await db.flush()` after batch operations in upload/delete endpoints

### **Problem 2: Upload Document Button Spinning Forever**
- **Cause**: Document row written to PostgreSQL but not returning response; chunks not flushing to database
- **Fix**: 
  - Changed document status to "Indexed" immediately on successful chunking
  - Added explicit flush after writing chunk rows
  - Set document status before returning response

### **Problem 3: Send Message Button Spinning After Response Sent**
- **Cause**: Frontend timeout not detecting if response was too slow
- **Fix**: Added RxJS timeout operators with 120s timeout for chat queries

### **Problem 4: No Persistent Storage of Documents**
- **Cause**: Missing transaction commit/flush operations
- **Fix**: 
  - PostgreSQL: Documents + chunks stored with explicit flush operations
  - ChromaDB: Vectors written before database flush (consistent state)
  - Proper error handling with rollback on failure

## 🚀 Quick Start

### **1. Database Setup (Required)**

```bash
# Windows - using Docker (if installed):
docker run -d `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=root `
  -e POSTGRES_DB=cognidoc `
  -p 5432:5432 `
  --name cognidoc-postgres `
  postgres:16

# Or if you have PostgreSQL installed locally, ensure:
# - Host: localhost
# - Port: 5432
# - User: postgres
# - Password: root
# - Database: cognidoc
```

### **2. Verify PostgreSQL Connection**

```bash
# Windows (using psql if available):
psql -h localhost -U postgres -d cognidoc -c "SELECT 1;"

# Or test via Python:
python -c "
import asyncio
from backend.shared.db.postgres import engine, create_tables

async def test():
    await create_tables()
    print('✓ Database connected and tables created')

asyncio.run(test())
"
```

### **3. Start Backend Services**

```bash
cd backend

# Install dependencies (first time only):
pip install -r requirements.txt

# Start all microservices:
python run_all.py

# You should see all services starting:
# ✓ API Gateway: http://localhost:8000
# ✓ Document Service: http://localhost:8001
# ✓ RAG Service: http://localhost:8002
# ✓ Judge Service: http://localhost:8003
# ✓ Metrics Service: http://localhost:8004
```

### **4. Start Frontend**

```bash
cd frontend

# Install dependencies (first time only):
npm install

# Start dev server:
ng serve

# Navigate to: http://localhost:4200
```

### **5. Test the Fixes**

#### **Test Loading States**

1. **Dashboard - Knowledge Base Loading**
   - Go to Dashboard page
   - Should load immediately with empty list (or existing documents)
   - No spinning loader

2. **Upload Document**
   - Click "Upload New Document"
   - Select a small PDF or text file
   - Click "Upload Document"
   - Should complete within 5 seconds
   - Should show success notification
   - Document should appear in the table

3. **Send Message**
   - Go to Home page
   - Type a test query: "What is in the knowledge base?"
   - Click Send
   - Should show AI response within 10-30 seconds
   - Send button should not keep spinning

## 🔧 Configuration

### **Environment Variables** (backend/.env)

```ini
# ── Database ──
DATABASE_URL=postgresql+asyncpg://postgres:root@localhost:5432/cognidoc

# ── Vector Store ──
CHROMA_PERSIST_PATH=./chroma_data  # Persistent disk storage

# ── API Keys ──
GEMINI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here

# ── Service URLs ──
DOCUMENT_SERVICE_URL=http://localhost:8001
RAG_SERVICE_URL=http://localhost:8002
JUDGE_SERVICE_URL=http://localhost:8003
METRICS_SERVICE_URL=http://localhost:8004
```

## 🔍 Debugging

### **Check if Backend is Running**

```bash
# Test each service:
curl http://localhost:8000/health  # Gateway
curl http://localhost:8001/health  # Document Service
curl http://localhost:8002/health  # RAG Service
curl http://localhost:8003/health  # Judge Service
curl http://localhost:8004/health  # Metrics Service

# All should return: {"status": "ok", "service": "..."}
```

### **Check Database Connection**

```bash
# View PostgreSQL logs in Docker:
docker logs cognidoc-postgres

# Or check database directly:
psql -h localhost -U postgres -d cognidoc -c "SELECT COUNT(*) FROM documents;"
```

### **Check Vector Store (ChromaDB)**

```bash
# ChromaDB data is stored on disk at: backend/chroma_data/

# Verify directory exists:
ls -la backend/chroma_data/

# Should contain:
# - chroma.sqlite3
# - index/
# - metadata/
```

### **Browser Console Errors**

If still seeing spinner issues:

1. Open DevTools (F12)
2. Go to Network tab
3. Perform action (e.g., upload)
4. Look for failed requests
5. Check Console tab for JavaScript errors

### **Backend Logs**

Terminal output shows:
```
[INFO] Indexed 'document.pdf': 45 chunks
[DEBUG] ChromaDB update: 45 vectors added
[DEBUG] PostgreSQL commit: document + 45 chunks
```

## 📊 Request Timeouts

The system now has configurable timeouts:

| Operation | Timeout | Location |
|-----------|---------|----------|
| Document List | 60s | `document.service.ts` |
| Upload Document | 300s (5min) | `document.service.ts` |
| Send Chat Query | 120s (2min) | `rag.service.ts` |
| Delete Document | 60s | `document.service.ts` |

If requests timeout, check:
1. Backend service is running
2. Network connectivity
3. Database is responsive
4. API keys are valid (Gemini/Groq)

## 🐛 Common Issues

### **"Cannot find module" errors**

```bash
# Backend:
cd backend
pip install -r requirements.txt

# Frontend:
cd frontend
npm install
```

### **Port already in use**

```bash
# Find and kill process on port:
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or change port in run_all.py
```

### **Database connection refused**

```bash
# Ensure PostgreSQL is running and accepting connections:
# Option 1: Start Docker container
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=root postgres:16

# Option 2: Check local PostgreSQL service
# Windows: Services → PostgreSQL → Start/Restart
```

### **Embeddings timeout**

If uploads take longer than 5 minutes:
- Gemini API may be rate-limited
- Check `backend/.env` for valid `GEMINI_API_KEY`
- Consider using smaller documents initially

### **ChromaDB errors**

```bash
# Clear and reset ChromaDB:
rm -rf backend/chroma_data/

# Restart backend services - will recreate fresh
python run_all.py
```

## ✨ Verification Checklist

- [ ] PostgreSQL running and accessible
- [ ] Backend services started (run_all.py)
- [ ] Frontend dev server started (ng serve)
- [ ] Can navigate to http://localhost:4200
- [ ] Dashboard loads without spinner
- [ ] Can upload a small test file
- [ ] File appears in document list
- [ ] Can send a chat query
- [ ] Receive response without infinite spinner
- [ ] Check backend/chroma_data/ exists with data
- [ ] Check PostgreSQL has documents table with data

## 📞 Still Having Issues?

1. **Check all health endpoints** return 200 OK
2. **Verify .env file** has valid API keys
3. **Review terminal output** for Python/JavaScript errors
4. **Clear cache**: `Ctrl+Shift+Delete` in browser
5. **Restart all services**: Stop all, then run run_all.py again
6. **Check database is writable**: `touch backend/uploads/test.txt`

---

**All fixes committed to** `test` **branch**
