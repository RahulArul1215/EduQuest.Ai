from fastapi import FastAPI, Depends, Request, UploadFile, File, HTTPException

import os
import sys
from DatabaseModels import Users
from DatabaseModels import Chats
from DatabaseModels import Messages
from DatabaseModels import Documents
from DatabaseModels import DocChunks
from DatabaseModels import QuizSessions
from DatabaseModels import QuizAttempts

import json
import re
import faiss
from DatabaseConnection import session, engine
import DatabaseModels
import requests
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import bcrypt
from sentence_transformers import SentenceTransformer
import pdfplumber
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_engine.rag import (
    extract_text,
    chunk_text,
    build_faiss_index,
    ask_question
)




app = FastAPI()


embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DatabaseModels.Base.metadata.create_all(bind=engine)

def get_db():
    db = session()
    try:
        yield db
    finally:
        db.close()


# handling Doc Uploads
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------------------------
# Password Helpers
# ---------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


@app.get("/")
def greet():
    return "hello from backend"


# ---------------------------
# Signup: Add User
# ---------------------------
@app.post("/adduser")
async def addNewUser(request: Request, db: Session = Depends(get_db)):
    data = await request.json()

    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")

    # Check if already exists
    existing_user = db.query(Users).filter(Users.email == email).first()
    if existing_user:
        return {"message": "User already exists"}

    # Hash password before saving
    hashed_pw = hash_password(password)

    new_user = Users(
        email=email,
        password_hash=hashed_pw,
        full_name=full_name
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created successfully", "user_id": new_user.id}


# ---------------------------
# Login Authentication
# ---------------------------
@app.post("/login")
async def loginUser(request: Request, db: Session = Depends(get_db)):
    data = await request.json()

    email = data.get("email")
    password = data.get("password")

    # Check user exists
    user = db.query(Users).filter(Users.email == email).first()

    if not user:
        return {"message": "User not found", "status": False}

    # Verify password
    if not verify_password(password, user.password_hash):
        return {"message": "Incorrect password", "status": False}

    return {
        "message": "Login successful",
        "status": True,
        "user_id": user.id,
        "full_name": user.full_name
    }

@app.post("/create_chat")
async def createChat(request: Request, db: Session = Depends(get_db)):

    data = await request.json()
    user_id = data.get("user_id")
    document_id = data.get("document_id")

    if not user_id:
        return {"message": "user_id is required", "status": False}

    if not document_id:
        return {"message": "document_id is required", "status": False}

    # Get document info
    doc = db.query(Documents).filter(Documents.id == document_id).first()
    if not doc:
        return {"message": "Document not found", "status": False}

    # Auto-generate title from filename
    base_title = os.path.splitext(doc.filename)[0]   # Remove .pdf extension
    title = f"{base_title} Study Session"

    # Create chat
    new_chat = Chats(
        user_id=user_id,
        document_id=document_id,
        title=title
    )

    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)

    return {
        "message": "Chat created",
        "chat_id": new_chat.id,
        "title": title,
        "status": True
    }




#to get chathistorys
@app.get("/get_chats/{user_id}")
def getChats(user_id: int, db: Session = Depends(get_db)):

    chats = db.query(Chats).filter(Chats.user_id == user_id).order_by(Chats.created_at.desc()).all()

    chat_list = []
    for chat in chats:
        chat_list.append({
            "chat_id": chat.id,
            "title": chat.title,
            "created_at": chat.created_at
        })

    return {"chats": chat_list}



#Message table endpoints
@app.post("/send_message")
async def sendMessage(request: Request, db: Session = Depends(get_db)):

    data = await request.json()

    chat_id = data.get("chat_id")
    user_id = data.get("user_id")
    content = data.get("content")

    if not chat_id or not user_id or not content:
        return {"message": "chat_id, user_id, and content are required", "status": False}

    # Save user message
    user_msg = Messages(
        chat_id=chat_id,
        user_id=user_id,
        role="user",
        content=content
    )

    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    return {
        "message": "Message sent",
        "status": True,
        "user_message_id": user_msg.id
    }

#get messages based on chatid
@app.get("/get_messages/{chat_id}")
def getMessages(chat_id: int, db: Session = Depends(get_db)):

    msgs = db.query(Messages).filter(Messages.chat_id == chat_id).order_by(Messages.created_at.asc()).all()

    result = []

    for m in msgs:
        result.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at
        })

    return {"messages": result}


#Documents table
#Upload pdf and store
@app.post("/upload_document")
async def uploadDocument(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    # Validate user exists
    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        return {"message": "User not found", "status": False}

    # Save file to disk
    file_location = os.path.join(UPLOAD_DIR, f"user_{user_id}_{file.filename}")
    
    with open(file_location, "wb") as f:
        f.write(await file.read())

    # Insert metadata into DB
    new_doc = Documents(
        user_id=user_id,
        filename=file.filename,
        storage_path=file_location,
        num_chunks=0
    )

    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return {
        "message": "Document uploaded",
        "document_id": new_doc.id,
        "storage_path": file_location,
        "status": True
    }


#to list all documents of user
@app.get("/get_documents/{user_id}")
def getDocuments(user_id: int, db: Session = Depends(get_db)):
    
    docs = db.query(Documents).filter(Documents.user_id == user_id).all()

    result = []
    for d in docs:
        result.append({
            "document_id": d.id,
            "filename": d.filename,
            "uploaded_at": d.uploaded_at,
            "num_chunks": d.num_chunks
        })

    return {"documents": result}



# ---------------------------
# Process uploaded document (extract → chunk → embed → store)
# ---------------------------
@app.post("/process_document/{document_id}")
def processDocument(document_id: int, db: Session = Depends(get_db)):

    doc = db.query(Documents).filter(Documents.id == document_id).first()
    if not doc:
        return {"message": "Document not found", "status": False}

    file_path = doc.storage_path

    # Extract text
    text = extract_text(file_path)

    if not text.strip():
        return {"message": "No text extracted", "status": False}

    # Create chunks
    chunks = chunk_text(text, chunk_size=200)

    # Embed chunks
    embeddings = embedding_model.encode(chunks)
    embeddings = embeddings.astype(float)  # convert numpy.float32 → float

    # Store chunks + embeddings
    for i, chunk in enumerate(chunks):
        new_c = DocChunks(
            document_id=document_id,
            chunk_index=i,
            text=chunk,
            embedding=embeddings[i].tolist()  # JSON array
        )
        db.add(new_c)

    doc.num_chunks = len(chunks)
    db.commit()

    return {
        "message": "Document processed Successfully",
        "chunks_created": len(chunks),
        "status": True
    }



# ---------------------------
# GENERAL AI CHAT (No PDF Mode)
# ---------------------------
def general_ai_chat(question, chat_id, user_id, db):

    # Load last messages for memory
    past_msgs = db.query(Messages).filter(Messages.chat_id == chat_id) \
                   .order_by(Messages.created_at.asc()).all()

    memory_text = "\n".join([f"{m.role}: {m.content}" for m in past_msgs[-6:]])

    groq_api_url = "https://api.groq.com/openai/v1/chat/completions"
    api_key = ""

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {
                "role": "system",
                "content":
                (
                    "You are a friendly AI tutor. "
                    "IMPORTANT: ALWAYS reply in CLEAN HTML format. "
                    "Use ONLY <h1>, <h2>, <p>, <strong>, <ul>, <li>, <ol>. "
                    "Never output markdown, backticks, or code fences.\n\n"
                    "Example Format:\n"
                    "<h1><strong>Heading</strong></h1>\n"
                    "<p>Paragraph text...</p>\n"
                    "<ul><li>Point 1</li><li>Point 2</li></ul>"
                )
            },
            {
                "role": "user",
                "content":
                f"{memory_text}\n\nUser question (reply in HTML): {question}"
            }
        ]
    }

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    response = requests.post(groq_api_url, json=payload, headers=headers)
    result = response.json()

    answer = result["choices"][0]["message"]["content"]

    # Save messages
    db.add(Messages(chat_id=chat_id, user_id=user_id, role="user", content=question))
    db.add(Messages(chat_id=chat_id, user_id=None, role="assistant", content=answer))
    db.commit()

    return {"status": True, "answer": answer}



# ---------------------------
# /ask ENDPOINT — Unified RAG + General Chat (HTML replies)
# ---------------------------
@app.post("/ask")
async def askQuestion(request: Request, db: Session = Depends(get_db)):

    data = await request.json()

    chat_id = data.get("chat_id")
    user_id = data.get("user_id")
    question = data.get("question")

    if not chat_id or not user_id or not question:
        return {"message": "chat_id, user_id, and question are required", "status": False}

    # Validate chat
    chat = db.query(Chats).filter(Chats.id == chat_id).first()
    if not chat:
        return {"message": "Chat not found", "status": False}

    document_id = chat.document_id

    # No document → General chat mode
    if document_id is None:
        return general_ai_chat(question, chat_id, user_id, db)

    # Load PDF chunks
    chunk_rows = db.query(DocChunks).filter(DocChunks.document_id == document_id).all()

    if not chunk_rows:
        return general_ai_chat(question, chat_id, user_id, db)

    chunk_texts = [c.text for c in chunk_rows]
    chunk_embeddings = np.array([c.embedding for c in chunk_rows], dtype="float32")

    # Build FAISS Index
    dimension = len(chunk_embeddings[0])
    index = faiss.IndexFlatL2(dimension)
    index.add(chunk_embeddings)

    # Embed question
    q_embed = embedding_model.encode([question])
    q_embed = np.array(q_embed, dtype="float32")

    distances, idxs = index.search(q_embed, k=3)
    relevant_context = "\n".join([chunk_texts[i] for i in idxs[0]])

    # Last few messages for memory
    past_msgs = db.query(Messages).filter(Messages.chat_id == chat_id) \
                       .order_by(Messages.created_at.asc()).all()

    memory_text = "\n".join([f"{m.role}: {m.content}" for m in past_msgs[-6:]])

    # --- GROQ CALL FOR DETAILED RESPONSE ---
    groq_api_url = "https://api.groq.com/openai/v1/chat/completions"
    api_key = ""

    payload = {
        "model": "llama-3.3-70b-versatile",
        "max_tokens": 3000,  # ⬅ LONG ANSWERS
        "temperature": 0.7,
        "top_p": 1.0,
        "frequency_penalty": 0.2,
        "presence_penalty": 0.2,

        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an AI tutor who must always provide COMPLETE, "
                 "fully expanded, detailed explanations.\n\n"
                 "❗ NEVER stop mid-sentence.\n"
                 "❗ ALWAYS finish lists, paragraphs, and concepts.\n"
                 "❗ If the topic has multiple parts, explain each one fully.\n"
                 "❗ Always output clean HTML (<h1>, <h2>, <p>, <ul>, <li>), never markdown.\n"
                 "❗ After the main conclusion dont give Relevant Extracted PDF Context just finish it.\n"
                )
            },
            {
                "role": "user",
                "content": (
                    f"<strong>Conversation Memory:</strong>\n{memory_text}\n\n"
                    f"<strong>Relevant Extracted PDF Context:</strong>\n{relevant_context}\n\n"
                    f"<strong>User Question:</strong> {question}\n\n"
                    "Provide a deeply detailed HTML explanation."
                )
            }
        ]
    }

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    response = requests.post(groq_api_url, json=payload, headers=headers)
    result = response.json()

    answer = result["choices"][0]["message"]["content"]

    # Store messages
    db.add(Messages(chat_id=chat_id, user_id=user_id, role="user", content=question))
    db.add(Messages(chat_id=chat_id, user_id=None, role="assistant", content=answer))
    db.commit()

    return {"status": True, "answer": answer}



#Retrieveing full user data
@app.get("/user_full_data/{user_id}")
def getUserFullData(user_id: int, db: Session = Depends(get_db)):

    #fetch User
    user = db.query(Users).filter(Users.id == user_id).first()
    if not user:
        return {"status": False, "message": "User not found"}

    user_data = {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "created_at": user.created_at
    }

    #fetch documents
    docs = db.query(Documents).filter(Documents.user_id == user_id).all()

    document_list = []
    for d in docs:
        document_list.append({
            "document_id": d.id,
            "filename": d.filename,
            "uploaded_at": d.uploaded_at,
            "num_chunks": d.num_chunks,
            "storage_path": d.storage_path
        })
    #fetch chats
    chats = db.query(Chats).filter(Chats.user_id == user_id).all()

    chat_list = []

    for c in chats:
        # Fetch Messages for each chat
        msgs = db.query(Messages).filter(Messages.chat_id == c.id) \
                .order_by(Messages.created_at.asc()).all()

        message_list = []
        for m in msgs:
            message_list.append({
                "message_id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at
            })

        chat_list.append({
            "chat_id": c.id,
            "title": c.title,
            "document_id": c.document_id,
            "created_at": c.created_at,
            "messages": message_list
        })

    #build Final Response JSON
    return {
        "status": True,
        "user": user_data,
        "documents": document_list,
        "chats": chat_list
    }

  
@app.post("/remove_chat_document")
async def removeChatDocument(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    chat_id = data.get("chat_id")

    if not chat_id:
        return {"status": False, "message": "chat_id required"}

    chat = db.query(Chats).filter(Chats.id == chat_id).first()
    if not chat:
        return {"status": False, "message": "Chat not found"}

    # 1️⃣ Delete all messages inside this chat
    db.query(Messages).filter(Messages.chat_id == chat_id).delete()

    # 2️⃣ Delete the chat itself
    db.delete(chat)

    db.commit()

    return {
        "status": True,
        "message": "Chat deleted because document was removed"
    }


#search history

@app.get("/search_chats/{user_id}")
def search_chats(user_id: int, q: str, db: Session = Depends(get_db)):
    q = q.lower()

    chats = db.query(Chats).filter(Chats.user_id == user_id).all()
    messages = db.query(Messages).join(Chats, Messages.chat_id == Chats.id)\
                                 .filter(Chats.user_id == user_id).all()

    results = {}

    # 🔍 Search in chat titles
    for chat in chats:
        if q in chat.title.lower():
            results[chat.id] = {"chat_id": chat.id, "title": chat.title}

    # 🔍 Search in ALL messages (user + assistant)
    for msg in messages:
        if msg.content and q in msg.content.lower():
            chat = db.query(Chats).filter(Chats.id == msg.chat_id).first()
            if chat:
                results[chat.id] = {"chat_id": chat.id, "title": chat.title}

    return {"status": True, "results": list(results.values())}


# quiz generation endpoints
@app.post("/generate_quiz")
async def generate_quiz(request: Request, db: Session = Depends(get_db)):

    print("\n🚀 STEP 1: Received /generate_quiz request")

    data = await request.json()

    user_id = data.get("user_id")
    document_id = data.get("document_id")
    num_questions = data.get("num_questions", 5)

    if not user_id or not document_id:
        raise HTTPException(400, "user_id and document_id are required")

    # Load processed chunks
    chunks = db.query(DocChunks).filter(DocChunks.document_id == document_id).all()

    print(f"STEP 2: Loaded {len(chunks)} chunks")

    if not chunks:
        raise HTTPException(400, "Document not processed")

    # LIMIT CONTEXT to avoid LLM overload
    context = "\n\n".join(c.text for c in chunks[:5])
    print("STEP 3: Prepared context")

    # LLM REQUEST 
    groq_api_url = "https://api.groq.com/openai/v1/chat/completions"
    api_key = ""  

    prompt = (
        f"Generate {num_questions} multiple-choice quiz questions "
        f"ONLY in JSON using this EXACT format:\n"
        "{\n"
        '  "questions": [\n'
        "     {\n"
        '       "question": "string",\n'
        '       "options": ["A","B","C","D"],\n'
        '       "answer": "A"\n'
        "     }\n"
        "  ]\n"
        "}\n\n"
        "DO NOT output anything except pure JSON.\n\n"
        f"PDF Content:\n{context}"
    )

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "Respond ONLY with JSON. No markdown, no explanations."},
            {"role": "user", "content": prompt},
        ]
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    print("STEP 4: Calling Groq API...")

    try:
        response = requests.post(
            groq_api_url,
            json=payload,
            headers=headers,
            timeout=40
        )
    except Exception as e:
        print("❌ Groq API FAILED:", e)
        raise HTTPException(500, "Groq API timeout or error")

    print("STEP 5: Groq responded")

    # Extract Groq message
    result = response.json()
    raw_output = result["choices"][0]["message"]["content"]

    print("STEP 6: Raw output received")
    print(raw_output)

    
    #  CLEAN JSON FROM MODEL OUTPUT
    clean = raw_output.replace("```json", "").replace("```", "").strip()

    match = re.search(r"\{[\s\S]*\}", clean)
    if not match:
        print("❌ JSON Extract FAILED:", clean)
        raise HTTPException(500, "Groq returned INVALID JSON")

    json_str = match.group(0)

    try:
        quiz_data = json.loads(json_str)
    except Exception as e:
        print("❌ JSON PARSE FAILED:", e)
        print("BAD JSON:", json_str)
        raise HTTPException(500, "Groq returned INVALID JSON")

    print("STEP 7: JSON is valid, saving to DB...")

    # Save quiz in database
    new_quiz = QuizSessions(
        user_id=user_id,
        document_id=document_id,
        quiz_json=json.dumps(quiz_data),
        num_questions=num_questions
    )

    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)

    print("STEP 8: Quiz session saved")

    return {
        "status": True,
        "quiz_id": new_quiz.id,
        "quiz": quiz_data
    }

# Validate Quiz Answers
@app.post("/validate_quiz")
async def validate_quiz(request: Request, db: Session = Depends(get_db)):
    data = await request.json()

    quiz_id = data.get("quiz_id")
    user_id = data.get("user_id")
    user_answers = data.get("answers")

    if not quiz_id or not user_id or not user_answers:
        raise HTTPException(400, "quiz_id, user_id, and answers are required")

    # Fetch quiz
    quiz = db.query(QuizSessions).filter(QuizSessions.id == quiz_id).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")

    # quiz_json is stored as TEXT → convert to dict
    try:
        quiz_data = json.loads(quiz.quiz_json)
    except:
        raise HTTPException(500, "Stored quiz JSON is corrupted")

    questions = quiz_data.get("questions", [])

    score = 0
    total = len(questions)

    results = []

    for idx, q in enumerate(questions, start=1):
        correct_answer = q["answer"]
        user_answer = user_answers.get(str(idx))

        if user_answer == correct_answer:
            score += 1

        results.append({
            "question_no": idx,
            "question": q["question"],
            "correct_answer": correct_answer,
            "your_answer": user_answer
        })

    # Save this quiz attempt
    new_attempt = QuizAttempts(
        quiz_id=quiz_id,
        user_id=user_id,
        user_answers=json.dumps(user_answers),  # store as JSON string
        score=score,
        total_questions=total
    )

    db.add(new_attempt)
    db.commit()

    return {
        "status": True,
        "score": score,
        "total": total,
        "correct": score,
        "wrong": total - score,
        "details": results
    }
# Quiz History Endpoint
@app.get("/quiz_history/{user_id}")
def quiz_history(user_id: int, db: Session = Depends(get_db)):
    
    sessions = db.query(QuizSessions).filter(QuizSessions.user_id == user_id).all()
    attempts = db.query(QuizAttempts).filter(QuizAttempts.user_id == user_id).all()

    output = []

    for s in sessions:
        quiz_attempts = [a for a in attempts if a.quiz_id == s.id]

        latest_attempt = None
        if quiz_attempts:
            latest_attempt = max(quiz_attempts, key=lambda x: x.attempted_at)

        output.append({
            "quiz_id": s.id,
            "document_id": s.document_id,
            "num_questions": s.num_questions,
            "created_at": s.created_at,
            "last_score": latest_attempt.score if latest_attempt else None,
            "total_questions": latest_attempt.total_questions if latest_attempt else None,
            "attempted_at": latest_attempt.attempted_at if latest_attempt else None
        })

    return {"status": True, "history": output}
