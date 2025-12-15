import pdfplumber
from PIL import Image
import pytesseract
import os
import requests
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer
import numpy as np
import faiss
import json

# ------------------------------
# Load SentenceTransformer Model Once
# ------------------------------
model = SentenceTransformer("all-MiniLM-L6-v2")

# ------------------------------
# Conversation Memory (temporary)
# ------------------------------
memory = []   # list of {"role": "user"/"assistant", "content": "text"}


# ------------------------------------------------------
# 1. TEXT EXTRACTION (PDF / Image / Website)
# ------------------------------------------------------
def extract_text(source):
    extracted_text = ""

    # Case 1: URL
    if source.startswith("http"):
        try:
            response = requests.get(source, headers={"User-Agent": "rag-bot"})
            soup = BeautifulSoup(response.text, "html.parser")
            for tag in soup(["script", "style", "noscript"]):
                tag.decompose()
            return "\n".join([p.get_text(strip=True) for p in soup.find_all("p")])
        except:
            return ""

    # Case 2: File Extensions
    ext = os.path.splitext(source)[1].lower()

    # PDF
    if ext == ".pdf":
        try:
            with pdfplumber.open(source) as pdf:
                for page in pdf.pages:
                    extracted_text += (page.extract_text() or "") + "\n"
        except:
            pass

    # Image
    elif ext in [".png", ".jpg", ".jpeg"]:
        try:
            img = Image.open(source)
            extracted_text = pytesseract.image_to_string(img)
        except:
            pass

    else:
        return "Unsupported file format"

    return extracted_text


# ------------------------------------------------------
# 2. CHUNKING
# ------------------------------------------------------
def chunk_text(text, chunk_size=200):
    words = text.split()
    return [" ".join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size)]


# ------------------------------------------------------
# 3. BUILD FAISS INDEX (for retrieval)
# ------------------------------------------------------
def build_faiss_index(chunks):
    embeddings = model.encode(chunks)
    dim = len(embeddings[0])

    index = faiss.IndexFlatL2(dim)
    index.add(np.array(embeddings, dtype="float32"))

    mapping = {i: chunks[i] for i in range(len(chunks))}

    return index, mapping


# ------------------------------------------------------
# 4. ASK QUESTION (RAG + Memory + Groq LLM)
# ------------------------------------------------------
def ask_question(user_question, index, mapping, top_k=3):
    # 1. Embed the question
    q_emb = model.encode([user_question])
    q_emb = np.array(q_emb, dtype="float32")

    # 2. Retrieve top chunks
    distances, idxs = index.search(q_emb, top_k)
    relevant_text = "\n".join(mapping[i] for i in idxs[0])

    # 3. Build conversation memory (last 3 messages)
    history = ""
    for msg in memory[-6:]:
        history += f"{msg['role']}: {msg['content']}\n"

    # 4. Send to Groq API
    api_url = "https://api.groq.com/openai/v1/chat/completions"
    api_key = ""

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are a helpful RAG assistant."},
            {
                "role": "user",
                "content": f"Conversation history:\n{history}\n\n"
                           f"PDF context:\n{relevant_text}\n\n"
                           f"User question: {user_question}"
            }
        ],
        "max_tokens": 300,
        "temperature": 0.7,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    response = requests.post(api_url, json=payload, headers=headers).json()
    answer = response["choices"][0]["message"]["content"]

    # 5. Update memory
    memory.append({"role": "user", "content": user_question})
    memory.append({"role": "assistant", "content": answer})

    return answer
