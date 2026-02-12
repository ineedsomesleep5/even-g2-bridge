from flask import Flask, request, jsonify
import google.generativeai as genai
import os
import time

app = Flask(__name__)

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.0-flash"

def get_gemini_response(prompt):
    if not GEMINI_API_KEY:
        return "Error: GEMINI_API_KEY not configured in Vercel Settings."
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

@app.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    try:
        data = request.json
        messages = data.get('messages', [])
        
        last_user_message = "Hello"
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                last_user_message = msg.get('content')
                break
        
        response_text = get_gemini_response(last_user_message)
        
        return jsonify({
            "id": f"chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
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

# Vercel requires the app to be available as a variable
# It automatically handles the execution, no need for app.run()

