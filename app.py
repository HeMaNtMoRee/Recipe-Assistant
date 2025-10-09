from flask import Flask, render_template, request, Response, stream_with_context
from pymongo import MongoClient
import requests
import json
import os
from dotenv import load_dotenv

app = Flask(__name__)
load_dotenv()

# --- Configuration ---
MONGO_URI = os.environ.get('MONGO_URI')
DB_NAME = os.environ.get('DB_NAME')
COLLECTION_NAME = os.environ.get('COLLECTION_NAME')
OLLAMA_API_URL = os.environ.get('OLLAMA_API_URL')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL')

# --- Database Connection ---
try:
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    recipes_collection = db[COLLECTION_NAME]
    client.server_info() 
    print("Successfully connected to MongoDB.")
except Exception as e:
    print(f"Error: Could not connect to MongoDB. \nDetails: {e}")
    exit()

def find_recipes_from_db(query, max_results=5):
    """Searches MongoDB for recipes using a search index."""
    print(f"Searching for recipes matching: '{query}'")
    try:
        pipeline = [
            {'$search': {'index': 'custom_search', 'text': {'query': query, 'path': ['title', 'ingredients', 'NER'], 'fuzzy': {}}}},
            {'$limit': max_results},
            {'$project': {'_id': 0, 'title': 1, 'ingredients': 1, 'directions': 1}}
        ]
        results = list(recipes_collection.aggregate(pipeline))
        print(f"Found {len(results)} recipes.")
        
        # Debug: Print first recipe if found
        if results:
            print(f"First recipe found: {results[0].get('title', 'No title')}")
        
        return results
    except Exception as e:
        print(f"Error during database search: {e}")
        return []

def get_ollama_response_stream(user_message, context_recipes):
    """
    Yields the response from Ollama token by token using a generator.
    """
    # Create a more detailed prompt based on whether recipes were found
    if context_recipes:
        recipes_text = "\n\n".join([
            f"Recipe: {recipe.get('title', 'Untitled')}\n"
            f"Ingredients: {', '.join(recipe.get('ingredients', []))}\n"
            f"Directions: {recipe.get('directions', 'No directions available')}"
            for recipe in context_recipes[:3]  # Limit to top 3 to avoid token limits
        ])
        
        prompt = f"""You are a friendly recipe recommendation chatbot.

User's question: "{user_message}"

I found these recipes that might help:

{recipes_text}

Please provide a helpful, conversational response. If a recipe matches their request, recommend it and give a brief summary of how to make it. Be friendly and encouraging!"""
    else:
        prompt = f"""You are a friendly recipe recommendation chatbot.

User's question: "{user_message}"

Unfortunately, I couldn't find any recipes in my database that match this request. Please:
1. Suggest they try searching with different ingredients or dish names
2. Offer to help with general cooking questions
3. Be friendly and helpful

Keep your response concise and encouraging."""
    
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": True
    }
    
    print(f"Sending request to Ollama with {len(context_recipes)} recipes in context")
    
    try:
        # Use stream=True to get a streaming response
        response = requests.post(OLLAMA_API_URL, json=payload, stream=True, timeout=60)
        response.raise_for_status()
        
        # Iterate over the response line by line
        token_count = 0
        for line in response.iter_lines():
            if line:
                token_count += 1
                # Each line is a JSON object; decode and re-encode to ensure proper format
                try:
                    decoded = json.loads(line.decode('utf-8'))
                    # Add newline to separate JSON objects for easier parsing on client
                    yield (json.dumps(decoded) + '\n').encode('utf-8')
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON from Ollama: {e}")
                    continue
        
        print(f"Stream complete. Sent {token_count} tokens.")
                
    except requests.exceptions.Timeout:
        print("Ollama API timeout")
        error_message = {"error": "The request timed out. Please try again."}
        yield (json.dumps(error_message) + '\n').encode('utf-8')
    except requests.exceptions.RequestException as e:
        print(f"Error contacting Ollama API: {e}")
        error_message = {"error": "Sorry, I'm having trouble connecting to the AI service. Please try again."}
        yield (json.dumps(error_message) + '\n').encode('utf-8')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get("message")
    if not user_message:
        return Response("No message provided.", status=400)
    
    print(f"\n--- New chat request ---")
    print(f"User message: {user_message}")
    
    context_recipes = find_recipes_from_db(user_message)
    
    # We return a streaming response.
    # The 'stream_with_context' ensures the request context is available in the generator.
    return Response(
        stream_with_context(get_ollama_response_stream(user_message, context_recipes)), 
        mimetype='application/x-ndjson',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

if __name__ == '__main__':
    app.run(debug=True)