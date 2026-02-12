from flask import Flask, request, jsonify
import google.generativeai as genai
import os
import time

app = Flask(__name__)

# Basic CORS headers for all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.0-flash"

def get_gemini_response(prompt):
    if not GEMINI_API_KEY:
        return "Error: GEMINI_API_KEY not configured."
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error connecting to Gemini: {str(e)}"

@app.route('/', methods=['GET'])
def health_check():
    return "Even Realities G2 Bridge (Vercel) is Active", 200

# Handle OPTIONS requests for preflight checks
@app.route('/v1/chat/completions', methods=['POST', 'OPTIONS'])
def chat_completions():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    try:
        data = request.json
        if not data:
             return jsonify({"error": "Invalid JSON"}), 400
             
        messages = data.get('messages', [])
        
        last_user_message = "Hello"
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                last_user_message = msg.get('content')
                break
        
        response_text = get_gemini_response(last_user_message)
        
        current_time = int(time.time())
        return jsonify({
            "id": f"chatcmpl-{current_time}",
            "object": "chat.completion",
            "created": current_time,
            "model": MODEL_NAME,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": response_text
                },
                "finish_reason": "stop"
            }]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
