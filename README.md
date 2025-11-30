# 🌱 EcoMind: Intelligent AI Model Router

**Team beszketnyky** | **BHL Hackathon 2025**

> Smart AI model selection that saves costs and reduces carbon emissions by right-sizing LLMs to task complexity.

---

## 💡 The Problem

Modern AI applications waste significant resources by using overpowered models for simple tasks:

- **💰 Unnecessary Costs**: Using GPT-4 for "Hello World" code costs 300x more than needed
- **🌍 Carbon Footprint**: Larger models consume exponentially more energy
- **⏱️ Slower Responses**: Overengineered models take longer for simple queries
- **🔄 Repeated Queries**: Same questions call expensive APIs multiple times

**Example**: A simple greeting processed with Claude Opus costs **$0.025** and emits **0.8g CO₂**. The same task with GPT-5-nano costs **$0.0001** and emits **0.02g CO₂** — that's **250x cost reduction** and **40x carbon reduction**.

---

## 🚀 Our Solution: EcoMind

EcoMind is an **intelligent model routing system** that automatically matches AI tasks to the most efficient model, combining:

1. **🧠 Complexity-Based Routing**: ML-powered analysis classifies queries (1-10 complexity scale)
2. **⚡ Smart Caching (RAG)**: Vector database stores answers to avoid redundant API calls
3. **💡 Proactive Suggestions**: Warns users when they've selected an oversized model
4. **📊 Real-Time Savings Tracking**: Shows actual cost and CO₂ saved per interaction


**Three-Layer Optimization:**

1. **Layer 1 - RAG Cache**: Check vector database for similar queries (similarity > 90%)
   - ✅ If found: Return cached answer instantly (zero cost, zero CO₂)
   - ❌ If not: Proceed to Layer 2

2. **Layer 2 - Complexity Analysis**: Analyze query with lightweight model (GPT-4o-mini)
   - Classifies task complexity (1-10) based on reasoning requirements
   - Considers: code complexity, domain expertise needed, multi-step reasoning

3. **Layer 3 - Model Selection**: Route to optimal model for complexity level
   - **Complexity 1-2**: Ultra-efficient models (GPT-5-nano, Groq Llama-8B)
   - **Complexity 3-4**: Lightweight models (GPT-3.5-turbo, Claude-3-Haiku)
   - **Complexity 5-6**: Balanced models (GPT-4o-mini, Claude-Haiku-4.5)
   - **Complexity 7-8**: Advanced models (GPT-4o, Claude-Sonnet-4)
   - **Complexity 9-10**: Premium models (Claude-Opus-4.5, GPT-o1)

---

## 💼 Business Value

### For Enterprise Organizations

| Benefit | Impact | Example |
|---------|--------|---------|
| **Cost Reduction** | 60-90% savings on AI spend | $10K/month → $2K/month for typical chatbot |
| **Carbon Neutrality** | 70-95% CO₂ reduction | Meet ESG sustainability goals |
| **Faster Responses** | 2-5x speed improvement | Better user experience for simple tasks |
| **Scalability** | Handle 10x more queries | Same budget, more capability |

### Real-World Scenarios

**Customer Support Chatbot** (1M queries/month)
- **Before**: All queries → GPT-4 ($30K/month, 2400g CO₂/month)
- **After**: Smart routing → Mix of models ($6K/month, 240g CO₂/month)
- **Savings**: $24K/month, 2160g CO₂/month (**80% reduction**)

**Developer Assistant** (500K queries/month)
- Trivial queries (40%): "What is CI/CD?" → GPT-5-nano
- Code reviews (30%): "Review this function" → Claude-Haiku
- Architecture (20%): "Design microservices" → Claude-Sonnet
- Complex algorithms (10%): "Optimize sorting for 1B records" → Claude-Opus


### Technology Stack

**Backend**
- **Framework**: FastAPI (Python 3.10+)
- **LLM Integration**: LangChain (Anthropic, OpenAI, Groq)
- **Vector Database**: ChromaDB with HuggingFace embeddings
- **Model Database**: PostgreSQL
- **Embeddings**: sentence-transformers/all-MiniLM-L6-v2

**Frontend**
- **Framework**: Next.js 14+ (React 18+, TypeScript)
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **UI Components**: shadcn/ui

**ML/AI**
- **Complexity Analysis**: GPT-4o-mini (low-cost classifier)
- **Semantic Search**: Cosine similarity (threshold: 0.8)
- **Multi-Provider Support**: 22 models across 3 providers