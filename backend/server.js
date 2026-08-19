import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();

// CORS Configuration — restrict in production via CORS_ORIGIN env var
const corsOptions = process.env.CORS_ORIGIN
    ? { origin: process.env.CORS_ORIGIN.split(','), credentials: true }
    : {};
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoints for deployment platforms
app.get('/', (req, res) => res.json({ status: 'ok', service: 'WeCare.ai Backend' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/analyze', async (req, res) => {
    try {
        const { age, history, symptoms } = req.body;

        const prompt = `You are a medical AI assistant for triage and safety for a hackathon project. 
        Analyze the following patient data to detect potential health issues or safety hazards. 
        This is for educational purposes and not real medical advice.
        
        Age: ${age}
        Medical History: ${history.length > 0 ? history : "None provided"}
        Current Symptoms: ${symptoms}
        
        Provide your response in JSON format exactly like this, with NO markdown formatting around it:
        {
          "urgencyLevel": "Normal" | "Warning" | "Critical",
          "analysis": "A brief paragraph explaining the potential issues.",
          "recommendations": ["Step 1", "Step 2", "Step 3"],
          "safetyHazard": "Yes/No with brief explanation"
        }`;

        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();

        // Strip out markdown if Gemini returns it
        const cleanJson = textResponse.replace(/```json\n?|```/g, '').trim();
        const jsonResult = JSON.parse(cleanJson);

        res.json(jsonResult);
    } catch (error) {
        console.error("Error analyzing symptoms:", error);
        res.status(500).json({
            error: error.message ? `AI Error: ${error.message}` : "Failed to analyze symptoms. Ensure GEMINI_API_KEY is set in backend/.env"
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
