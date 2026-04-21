const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const rawToken = (process.env.OPENROUTER_API_KEY || '').trim();
const token = rawToken && rawToken.startsWith('sk-or-v1-') ? rawToken : (rawToken ? `sk-or-v1-${rawToken}` : '');
const endpoint = "https://openrouter.ai/api/v1";
const modelName = "openrouter/free";
const visionModelName = process.env.VISION_MODEL || "meta-llama/llama-3.2-11b-vision-instruct:free";

if (!token) {
  console.error('Missing OPENROUTER_API_KEY in backend .env');
}

app.use(cors());
app.use(express.json());
let conversationHistory = [
  { role: "system", content: "You are a helpful mental health assistant. Provide empathetic and supportive responses to users seeking mental health support." }
];
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const client = new OpenAI({ baseURL: endpoint, apiKey: token });

function logAIError(context, error) {
  console.error(`${context}:`, {
    message: error?.message,
    status: error?.status || error?.response?.status,
    details: error?.response?.data || error?.error || null
  });
}

function extractResponseText(response) {
  const choice = response?.choices?.[0];
  const message = choice?.message;

  if (typeof message?.content === 'string' && message.content.trim()) {
    return message.content.trim();
  }

  if (Array.isArray(message?.content)) {
    const joined = message.content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .join('\n')
      .trim();
    if (joined) return joined;
  }

  if (typeof choice?.text === 'string' && choice.text.trim()) {
    return choice.text.trim();
  }

  return '';
}

function extractFirstJsonObject(text) {
  const cleaned = (text || '').replace(/```json\s?|\s?```/g, '').trim();
  const start = cleaned.indexOf('{');
  if (start === -1) return cleaned;

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = start; i < cleaned.length; i += 1) {
    const char = cleaned[i];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;

    if (depth === 0) {
      return cleaned.slice(start, i + 1);
    }
  }

  return cleaned.slice(start);
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function healthPlanToText(healthPlan) {
  const diet = healthPlan?.diet_plan || {};
  const sleep = healthPlan?.sleep_routine || {};
  const lines = [];

  lines.push('Personalized Health Plan');
  lines.push('========================');
  lines.push('');
  lines.push('Diet Plan');
  lines.push('---------');
  lines.push(`Caloric Intake: ${diet.caloric_intake || diet.daily_calories || 'Not specified'}`);

  const macros = diet.macronutrients || diet.macronutrient_ratio;
  if (macros) {
    lines.push('Macronutrients:');
    lines.push(`- Carbohydrates: ${macros.carbohydrates ?? 'N/A'}`);
    lines.push(`- Proteins: ${macros.proteins ?? macros.protein ?? 'N/A'}`);
    lines.push(`- Fats: ${macros.fats ?? 'N/A'}`);
  }

  lines.push('');
  lines.push('Sleep Routine');
  lines.push('-------------');
  lines.push(`Bedtime: ${sleep.bedtime || 'Not specified'}`);
  lines.push(`Wake Time: ${sleep.wake_time || sleep.wake_up_time || 'Not specified'}`);
  lines.push('Tips/Activities:');

  const activities = sleep.pre_sleep_activities || sleep.sleep_quality_tips || sleep.tips || [];
  if (Array.isArray(activities) && activities.length > 0) {
    activities.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push('- Not specified');
  }

  lines.push('');
  lines.push('Raw JSON');
  lines.push('--------');
  lines.push(JSON.stringify(healthPlan, null, 2));
  return lines.join('\n');
}

function buildFallbackHealthPlan(input) {
  const weight = Number(input?.weight) || 70;
  const activityLevel = String(input?.activityLevel || 'moderate').toLowerCase();
  const caloriesByActivity = {
    sedentary: 1900,
    'lightly active': 2200,
    'moderately active': 2500,
    'very active': 2800,
    'extra active': 3000
  };
  const baseCalories = caloriesByActivity[activityLevel] || 2300;
  const adjustedCalories = Math.round(baseCalories + (weight - 70) * 8);

  return {
    diet_plan: {
      caloric_intake: adjustedCalories,
      macronutrients: {
        carbohydrates: '50%',
        proteins: '25%',
        fats: '25%'
      },
      meal_plan: {
        breakfast: {
          time: '7:30 AM',
          items: ['Oats with fruit', 'Boiled eggs or tofu', 'Unsweetened tea']
        },
        lunch: {
          time: '1:00 PM',
          items: ['Lean protein', 'Brown rice or millet', 'Mixed vegetables']
        },
        dinner: {
          time: '7:30 PM',
          items: ['Soup or salad', 'Grilled protein', 'Steamed vegetables']
        },
        snacks: {
          time: '4:30 PM',
          items: ['Nuts or seeds', 'Seasonal fruit']
        }
      }
    },
    sleep_routine: {
      bedtime: '10:30 PM',
      wake_time: '6:30 AM',
      pre_sleep_activities: [
        'Avoid screens for 30 minutes before bed',
        'Do 5-10 minutes of breathing exercises',
        'Keep the room dark and cool'
      ]
    }
  };
}

async function convertPdfToImage(pdfPath) {
  const pdf2img = require('pdf-img-convert');
  const outputImages = await pdf2img.convert(pdfPath);
  const imagePath = `uploads/${Date.now()}.png`;
  fs.writeFileSync(imagePath, outputImages[0]);
  return imagePath;
}

function getImageDataUrl(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');
  const imageFormat = path.extname(imagePath).slice(1);
  return `data:image/${imageFormat};base64,${imageBase64}`;
}

async function analyzeImageWithAI(imagePath) {
  const imageDataUrl = getImageDataUrl(imagePath);
  const response = await client.chat.completions.create({
    messages: [
      { role: "system", content: "You are an expert radiologist analyzing X-ray images. Provide a detailed diagnosis, confidence level, additional findings, and recommended actions." },
      { role: "user", content: [
        { type: "text", text: "Analyze this X-ray image and provide a detailed diagnosis."},
        { type: "image_url", image_url: {
          url: imageDataUrl,
          details: "high"
        }}
      ]}
    ],
    model: visionModelName
  });

  const text = extractResponseText(response);
  if (!text) {
    throw new Error('Vision model returned empty content');
  }
  return text;
}

function parseAIResponse(aiResponse) {
  const lines = aiResponse.split('\n');
  return {
    primaryDiagnosis: lines.find(line => line.toLowerCase().includes('diagnosis'))?.split(':')[1]?.trim() || 'Unspecified',
    confidenceLevel: parseInt(lines.find(line => line.toLowerCase().includes('confidence'))?.match(/\d+/)?.[0] || '0'),
    additionalFindings: lines.find(line => line.toLowerCase().includes('additional findings'))?.split(':')[1]?.split(',').map(s => s.trim()) || [],
    recommendedActions: lines.find(line => line.toLowerCase().includes('recommended actions'))?.split(':')[1]?.trim() || 'Consult with a specialist for further evaluation.'
  };
}
app.get('/api/test', async (req, res) => {
  try {
    const client = new OpenAI({ baseURL: endpoint, apiKey: token });

    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "What is the capital of France?" }
      ],
      model: modelName,
      temperature: 0.3,
      max_tokens: 1000,
      top_p: 1.0
    });

    const aiResponse = response.choices[0].message.content;

    res.json({ 
      message: 'Backend is working!',
      aiResponse: aiResponse
    });
  } catch (error) {
    logAIError('Error in test route', error);
    res.status(500).json({ error: 'An error occurred while processing the request' });
  }
});

app.post('/api/HealthPlans', async (req, res) => {
  try {
    // Extracting parameters from request body
    const client = new OpenAI({ baseURL: endpoint, apiKey: token });
    const { age, weight, height, activityLevel, dietaryRestrictions, sleepIssues } = req.body;

    console.log("Received body parameters:", { age, weight, height, activityLevel, dietaryRestrictions, sleepIssues });

    // Sample data in case body parameters are missing
    const sampleData = {
      age: age || 30,
      weight: weight || 70,
      height: height || 170,
      activityLevel: activityLevel || "moderate",
      dietaryRestrictions: dietaryRestrictions || "none",
      sleepIssues: sleepIssues || "insomnia"
    };

    console.log("Using data for health plan generation:", sampleData);

    const prompt = `Generate a personalized health plan for a ${sampleData.age}-year-old individual weighing ${sampleData.weight} kg and ${sampleData.height} cm tall. Their activity level is ${sampleData.activityLevel}, and they have the following dietary restrictions: ${sampleData.dietaryRestrictions}. They also report the following sleep issues: ${sampleData.sleepIssues}. Return only valid JSON (no markdown/code fences/explanations) with this shape: {"diet_plan":{"caloric_intake":number,"macronutrients":{"carbohydrates":string,"proteins":string,"fats":string},"meal_plan":{"breakfast":{"time":string,"items":string[]},"lunch":{"time":string,"items":string[]},"dinner":{"time":string,"items":string[]},"snacks":{"time":string,"items":string[]}}},"sleep_routine":{"bedtime":string,"wake_time":string,"pre_sleep_activities":string[]}}`;

    console.log("Sending prompt to OpenAI:", prompt);

    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant specialized in creating personalized health plans." },
        { role: "user", content: prompt }
      ],
      model: modelName,
      temperature: 0.3,
      max_tokens: 1800,
      top_p: 1.0
    });

    console.log("Raw API response:", JSON.stringify(response, null, 2));

    if (!response.choices || response.choices.length === 0 || !response.choices[0].message) {
      throw new Error('Unexpected API response structure');
    }

    const responseText = extractResponseText(response);
    if (!responseText) {
      throw new Error('Model returned empty content. Try another model/provider.');
    }

    const cleanedContent = extractFirstJsonObject(responseText);

    console.log("Cleaned content:", cleanedContent);

    try {
      const healthPlan = tryParseJson(cleanedContent);
      if (!healthPlan) {
        return res.json({
          message: 'Health plan generated as text format.',
          healthPlanText: cleanedContent
        });
      }
      console.log("Generated health plan:", healthPlan);
      
      res.json({
        message: 'Health plan generated successfully!',
        healthPlan: healthPlan
      });
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      console.log('Raw content:', cleanedContent);
      res.json({
        message: 'Health plan generated as text format.',
        healthPlanText: cleanedContent
      });
    }
  } catch (error) {
    logAIError('Error generating health plan', error);
    const { age, weight, height, activityLevel, dietaryRestrictions, sleepIssues } = req.body || {};
    const fallbackPlan = buildFallbackHealthPlan({ age, weight, height, activityLevel, dietaryRestrictions, sleepIssues });
    res.json({
      message: 'AI generation unavailable. Returned a fallback health plan.',
      healthPlan: fallbackPlan
    });
  }
});

app.post('/api/HealthPlans/export-text', (req, res) => {
  try {
    const { healthPlan } = req.body || {};
    if (!healthPlan || typeof healthPlan !== 'object') {
      return res.status(400).json({ error: 'healthPlan object is required in request body' });
    }

    const content = healthPlanToText(healthPlan);
    const filename = `health-plan-${Date.now()}.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(content);
  } catch (error) {
    logAIError('Error exporting health plan text', error);
    return res.status(500).json({ error: 'An error occurred while exporting the health plan' });
  }
});

app.post('/api/mental-health-chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    
    // Add user message to conversation history
    conversationHistory.push({ role: "user", content: userMessage });

    const response = await client.chat.completions.create({
      messages: conversationHistory,
      model: modelName
    });

    const assistantReply = response.choices[0].message.content;

    // Add assistant's reply to conversation history
    conversationHistory.push({ role: "assistant", content: assistantReply });

    // Keep only the last 10 messages to manage conversation length
    if (conversationHistory.length > 11) {
      conversationHistory = [
        conversationHistory[0],
        ...conversationHistory.slice(-10)
      ];
    }

    res.json({ response: assistantReply });
  } catch (error) {
    logAIError('Error in chat API', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});
app.post('/api/analyze-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let imagePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    if (fileExtension === '.pdf') {
      imagePath = await convertPdfToImage(imagePath);
      // Delete the original PDF file
      fs.unlinkSync(req.file.path);
    } else if (!['.png', '.jpg', '.jpeg'].includes(fileExtension)) {
      return res.status(400).json({ error: 'Unsupported file format. Please upload a PDF or image file.' });
    }

    const aiAnalysis = await analyzeImageWithAI(imagePath);
    const diagnosisResult = parseAIResponse(aiAnalysis);

    // Clean up the uploaded file
    fs.unlinkSync(imagePath);

    res.json({
      ...diagnosisResult,
      aiAnalysis // Include the full AI analysis for detailed display
    });
  } catch (error) {
    logAIError('Error analyzing image', error);
    res.status(500).json({ error: 'An error occurred while analyzing the image' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});