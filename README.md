# Recipe Assistant Chatbot

A conversational AI-powered chatbot that recommends cooking recipes based on user queries. This project uses a Retrieval-Augmented Generation (RAG) architecture to provide accurate and context-aware answers. It fetches relevant recipes from a MongoDB database and uses a locally-run Ollama language model to generate helpful, human-like responses.

## Features

-   **Conversational Recipe Search:** Ask for recipes in natural language.
-   **Live Streaming Responses:** The chatbot's answers are streamed token-by-token for a real-time, interactive feel.
-   **Retrieval-Augmented Generation (RAG):** Ensures that the AI's answers are grounded in the actual recipe data from the database, preventing hallucinations and providing accurate information.
-   **Interactive UI:** A clean and simple chat interface with a typing indicator, suggestion buttons, and a clear chat history option.

## Tech Stack

-   **Backend:** Python, Flask
-   **Database:** MongoDB (using MongoDB Atlas for cloud hosting)
-   **AI Model:** [Ollama](https://ollama.com/) (running models like Llama3, Mistral, etc., locally)
-   **Frontend:** HTML, CSS, JavaScript
-   **Python Libraries:** PyMongo, Requests, Pandas, python-dotenv

## Project Structure

```
hemantmoree/recipe-assistant/Recipe-Assistant-main/
├── app.py              # Main Flask application with API endpoints
├── load_data.py        # Script to load and process data into MongoDB
├── requirements.txt    # Python dependencies
├── .env                # Environment variables (create this file)
├── templates/
│   └── index.html      # Frontend HTML structure
└── static/
    ├── css/
    │   └── style.css   # Styles for the frontend
    └── js/
        └── script.js   # Frontend logic for chat and streaming
```

## Setup and Installation Guide

Follow these steps to set up and run the project on your local system.

### 1. Prerequisites

Make sure you have the following installed on your system:
-   [Python 3.8+](https://www.python.org/downloads/)
-   [Ollama](https://ollama.com/)
-   [CSV](https://recipenlg.cs.put.poznan.pl/)
#### Dataset Source
- This project uses a dataset sourced from Hugging Face Datasets — originally created and shared by [Michal Bien](https://huggingface.co/mbien).
- I sincerely thank the author for making this dataset publicly available for research and educational purposes.

### 2. Clone the Repository

Clone this repository to your local machine:
```bash
git clone [https://github.com/hemantmoree/recipe-assistant.git](https://github.com/hemantmoree/recipe-assistant.git)
cd Recipe-Assistant-main
```

### 3. Set Up a Python Virtual Environment

It is highly recommended to use a virtual environment to manage project dependencies.

```bash
# Create the virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 4. Install Dependencies

Install all the required Python libraries using the `requirements.txt` file.
```bash
pip install -r requirements.txt
```

### 5. Set Up Ollama

Once Ollama is installed and running, pull a language model for the chatbot to use. We recommend Llama3.
```bash
ollama pull llama3
```

### 6. Set Up MongoDB Atlas

1.  **Create a Free Account:** Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2.  **Create a Free Cluster:** Follow the instructions to create a free-tier cluster (e.g., `M0`).
3.  **Create a Database and Collection:** In your new cluster, create a database (e.g., `recipe_db`) and a collection (e.g., `recipes`).
4.  **Get Your Connection String:** Navigate to your cluster's "Connect" tab and get your connection string (URI). Make sure to replace `<password>` with your database user's password.

### 7. Load the Recipe Data

1.  **Place Your Dataset:** Place your recipe dataset (in CSV format) in the root of the project directory.
2.  **Run the `load_data.py` script:** This script will read the CSV, process it in chunks, and upload it directly to your MongoDB Atlas collection.
    ```bash
    # Before running, make sure your MONGO_URI is set in a .env file (see next step)
    python load_data.py
    ```

### 8. Create the MongoDB Search Index

For the chatbot to find recipes efficiently, you must create a Search Index in MongoDB Atlas.

1.  Navigate to your `recipes` collection in the Atlas dashboard.
2.  Click on the **Search** tab.
3.  Click **Create Search Index** and choose the **JSON Editor**.
4.  Give the index a name (e.g., `custom_search`).
5.  Paste the following JSON configuration into the editor and save it:

    ```json
    {
      "mappings": {
        "dynamic": false,
        "fields": {
          "NER": {
            "type": "string"
          },
          "ingredients": {
            "type": "string"
          },
          "title": {
            "type": "string"
          }
        }
      }
    }
    ```
    *Note: It may take a few minutes for the index to build and become active.*

### 9. Configure Environment Variables

Create a file named `.env` in the root of the project directory. This file will store your secret keys and configuration.

```bash
# .env file

# MongoDB Configuration
MONGO_URI="mongodb+srv://<username>:<password>@<your-cluster-url>/<your-db-name>?retryWrites=true&w=majority"
DB_NAME="recipe_db"
COLLECTION_NAME="recipes"

# Ollama Configuration
OLLAMA_API_URL="http://localhost:11434/api/generate"
OLLAMA_MODEL="llama3" # The model you pulled with 'ollama pull'

CSV_PATH = 'path//to//full_dataset.csv'  # <--- UPDATE THIS PATH TO YOUR CSV FILE
CHUNK_SIZE = 10000 # <--- SET YOUR CHUNK SIZE HERE
MAX_ROWS_TO_LOAD = 400000  # <--- SET YOUR LIMIT HERE
```
**Important:** Replace the `MONGO_URI` with your own connection string.

## How to Run the Application

1.  **Ensure Ollama is running:** Make sure the Ollama application is running in the background.
2.  **Run the Flask App:** Start the Flask development server from the root directory.
    ```bash
    flask run
    ```
3.  **Open Your Browser:** Navigate to `http://127.0.0.1:5000`.

You can now start chatting with your Recipe Assistant!
