# EduQuest.AI – Smart Study Assistant

## Project Overview
EduQuest.AI is a Smart Study Assistant built to help students study more effectively
using their own academic materials such as syllabus PDFs, notes, images, and web content.

The application uses Generative AI and a Retrieval-Augmented Generation (RAG) approach
to provide accurate, syllabus-based answers through a chat interface.
It supports document uploads, OCR-based text extraction, web content processing,
and contextual follow-up conversations using stored conceptual knowledge.

---

## Key Features
- User authentication and profile management
- Upload syllabus PDFs and text documents
- Image upload with OCR-based text extraction
- URL input with web scraping and content processing
- Natural language chat interface
- Syllabus-aware question answering using RAG
- Context-aware follow-up questions using conceptual memory
- Modern and responsive user interface

---

## System Architecture

### Frontend
- ReactJS
- Modern and responsive UI
- Chat-based interaction model

### Backend
- FastAPI (Python)
- REST APIs for document processing and chat handling
- Uvicorn Server

### Databases
- PostgreSQL  
  - Stores user profiles, chat history, document metadata  
  - Stores text embeddings using vector extensions (pgvector)

### AI & Retrieval
- Sentence Transformers for embedding generation
- PostgreSQL vector similarity search for semantic retrieval
- Large Language Model (LLM) for answer generation
- Wikipedia used as a trusted external knowledge source when needed

---

## Libraries and Tools Used

### Document and Content Processing
- PDF Processing: pdfplumber  
- Image OCR: pytesseract, Pillow  
- Web Scraping: BeautifulSoup4, requests  

### AI and NLP
- Embedding Model: sentence-transformers (all-MiniLM-L6-v2)
- Vector Storage and Search: PostgreSQL with vector support
- Token Handling: tiktoken
- LLM Integration: OpenAI API

### Backend Utilities
- python-multipart (file uploads)

---

## How the System Works

1. Users log in to the application
2. Users can upload:
   - PDF documents
   - Images (text extracted using OCR)
   - URLs (web content is scraped and processed)
   - Plain text
3. The backend extracts and cleans the text
4. The text is split into smaller semantic chunks
5. Each chunk is converted into embeddings using the
   all-MiniLM-L6-v2 sentence transformer model
6. The embeddings are stored directly in PostgreSQL
7. When a user asks a question:
   - Relevant chunks are retrieved using vector similarity search
   - Additional trusted external context (such as Wikipedia) is added if required
   - The retrieved context and user query are sent to the LLM
8. The LLM generates an accurate, syllabus-focused response

---

## Conceptual Memory
EduQuest.AI stores important concepts extracted from documents and conversations
as embedded knowledge units inside the database.

This allows the system to:
- Maintain context across conversations
- Answer follow-up questions more accurately
- Avoid repeating explanations unnecessarily

Conceptual memory improves the overall learning experience by making interactions
feel continuous and coherent rather than isolated.

---

## OCR Dependency (Tesseract)

This project uses Tesseract OCR for extracting text from images.

### Windows Installation Steps
1. Download Tesseract from:
   https://github.com/UB-Mannheim/tesseract/wiki
2. Install and add Tesseract to the system PATH
3. Verify installation:
   ```bash
   tesseract --version

### Run Frontend & Backend 

```bash
#Frontend
cd frontend
npm install
npm start

#Backend
cd backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload


