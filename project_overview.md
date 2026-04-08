# Project Overview: AgamV2

This project is a web application with a Django backend and a React (Vite) frontend. Given the file names (e.g., `TherapistDashboard.jsx`, `ClientJournal.jsx`, `Cognitive-Distortions.pdf`) and the backend technologies employed, it appears to be a mental health or therapy-oriented application that provides features for both clients and therapists, heavily integrated with AI functionality (such as Langchain and Langgraph).

## Libraries and Versions

### Backend Dependencies (`backend/requirements.txt`)
- **Web Framework:** Django `6.0.3`, djangorestframework `3.17.1`, django-cors-headers `4.9.0`
- **Asynchronous Server:** uvicorn `0.42.0`, anyio `4.13.0`
- **AI & LLM Integration:** langchain `1.2.13`, langgraph `1.1.3`, langchain-groq `1.1.2`, groq `0.37.1`, huggingface_hub `1.8.0`
- **Database & Data Handling:** SQLAlchemy `2.0.48`, pydantic `2.12.5`, numpy `2.4.4`
- **PDF & Document Processing:** PyPDF2 `3.0.1`, pdfminer.six `20260107`
- **Other utilities:** requests `2.33.0`, python-dotenv `1.2.2`

### Frontend Dependencies (`frontend/package.json`)
- **Core Framework:** react `18.2.0`, react-dom `18.2.0`, react-router-dom `6.14.1`
- **Build Tool:** vite `5.0.0`
- **UI Components:** @mui/material `5.14.0`, @mui/icons-material `5.14.0`
- **Styling:** tailwindcss `^3.4.7`, @emotion/react `^11.11.0`, @emotion/styled `^11.11.0`
- **Data Visualization:** recharts `3.8.0`
- **PDF Rendering:** pdfjs-dist `3.9.179`

---

## Folder Structure and File Descriptions

### Root Directory
- `/backend/` - Contains the Django server, REST API, and AI processing layer.
- `/frontend/` - Contains the Vite + React client application.
- `/scripts/` - Contains helper scripts.
  - `append_reframe.py`: A script likely used to process or reframe journal entries, a common technique in Cognitive Behavioral Therapy (CBT).
- `Cognitive-Distortions.pdf` & `cognitive-model-example-practice.pdf`: Static reference documents possibly used as context for prompt engineering in the codebase or to be served for user consumption.

### Frontend (`/frontend/`)
- `package.json` / `package-lock.json`: Defines Node.js dependencies, versions, and build scripts.
- `tailwind.config.cjs` & `postcss.config.cjs`: Configuration files for Tailwind CSS and PostCSS ensuring custom styles are built.
- `index.html`: Base entry point HTML provided by Vite.
- `/src/`:
  - `main.jsx`: Main entry point for the React application, rendering the root element.
  - `App.jsx`: Root React component containing application routing map and global providers.
  - `index.css`: Global styles, which usually import Tailwind definitions.
  - `config.js`: Global configuration (like backend API endpoints or feature flags).
  - `/components/`:
    - `GroundingToolkit.jsx`: A reusable UI component that provides grounding exercises or tools for clients experiencing anxiety or distress.
  - `/pages/`:
    - `Landing.jsx`: The homepage/landing page.
    - `Client.jsx` / `Therapist.jsx`: Hub/Dashboard base pages for the distinct user experiences.
    - `ClientChat.jsx`: Interface for clients to chat (either with an AI agent or a therapist).
    - `ClientJournal.jsx`: Interface for clients to log their thoughts and journal entries.
    - `TherapistDashboard.jsx`: Analytics, client-overview, and management dashboard for therapists.

### Backend (`/backend/`)
- `manage.py`: Django's command-line utility primarily used for bootstrapping tasks and running servers.
- `requirements.txt`: Master list of pip-installable python packages and their locked versions.
- `db.sqlite3`: The local SQLite database containing development data.
- `/agam_backend/`: The main Django project configuration namespace.
  - `settings.py`: Contains core settings (apps installed, middleware, database config).
  - `urls.py`: URL mapping from base routes to App-specific paths.
  - `wsgi.py` / `asgi.py`: Entry points for WSGI and ASGI compatible application servers.
- `/api/`: Main Django app serving the core endpoints.
  - `models.py`: Database schema definitions (e.g., Users, Journals, Chats).
  - `views.py`: Request handlers containing the backend endpoint logic.
  - `serializers.py`: Classes responsible for converting complex data like querysets to Python data types that can be rendered into JSON.
  - `urls.py`: Route configurations mapping URLs to specific `views`.
- `/app/`: Custom application module that encapsulates non-standard logic, including AI functionalities.
  - `/ai_layer/`: Encapsulates AI operations driven by Langchain/Langgraph.
    - `architect.py`: Responsible for structuring the macro system prompts or orchestrating processing states.
    - `graph.py`: Defines the LangGraph state machine nodes and edges, usually for multi-turn or multi-agent conversational capabilities.
    - `llm_agents.py`: Implementations of separate AI agents (e.g., an agent to extract cognitive distortions, an agent to write empathetic responses).
    - `semantic_router.py`: Logic to route user queries into distinct LangGraph or programmatic paths based on semantic intent.
- `/scripts/`: Backend-specific testing scripts.
  - `test_full_pipeline.py`: Code to trigger and assert behavior of the comprehensive AI/backend pipeline locally.
  - `test_pdf_extraction.py`: Isolated logic to test parsing of PDFs using PyPDF2 or pdfminer.
  - `print_routes.py`: A utility to neatly output all configured Django URL endpoints to the console for easy reference.
