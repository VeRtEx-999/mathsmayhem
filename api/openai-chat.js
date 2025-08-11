import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { question, context, difficulty = 'medium' } = req.body;

        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        // Create system prompt for math tutoring
        const systemPrompt = `You are an expert AI math tutor for children aged 6-16. Your role is to:

1. Explain math concepts in simple, age-appropriate language
2. Break down problems into clear, step-by-step solutions
3. Use fun examples, emojis, and encouraging language
4. Adapt explanations based on difficulty level: ${difficulty}
5. Always be patient, positive, and supportive
6. Include visual examples when helpful (using text symbols)
7. Ask follow-up questions to check understanding
8. Provide practice problems when appropriate

Context: ${context || 'General math tutoring session'}

Remember to:
- Use simple vocabulary for younger students
- Include emojis and fun elements to keep it engaging
- Break complex problems into smaller steps
- Always explain WHY something works, not just HOW
- Encourage students and celebrate their progress`;

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user", 
                    content: question
                }
            ],
            max_tokens: 800,
            temperature: 0.7,
            presence_penalty: 0.1,
            frequency_penalty: 0.1
        });

        const response = completion.choices[0].message.content;

        // Generate a follow-up practice problem based on the topic
        const practicePrompt = `Based on the question "${question}", create one simple practice problem for a ${difficulty} level student. Just return the problem, no explanation.`;
        
        const practiceCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: practicePrompt }],
            max_tokens: 100,
            temperature: 0.8
        });

        const practiceProblem = practiceCompletion.choices[0].message.content;

        return res.status(200).json({
            success: true,
            response: response,
            practiceProblem: practiceProblem,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('OpenAI API Error:', error);
        
        // Fallback response if API fails
        const fallbackResponse = generateFallbackResponse(req.body.question);
        
        return res.status(200).json({
            success: true,
            response: fallbackResponse,
            practiceProblem: "Try solving: 2 + 3 × 4 = ?",
            fallback: true,
            timestamp: new Date().toISOString()
        });
    }
}

function generateFallbackResponse(question) {
    const keyword = question.toLowerCase();
    
    if (keyword.includes('fraction')) {
        return `🍕 Great question about fractions! Let me help you understand:

📚 **What are fractions?**
A fraction shows parts of a whole thing!

🔢 **Parts of a fraction:**
• Top number (numerator) = parts you have
• Bottom number (denominator) = total parts

✨ **Example:** 3/4 means you have 3 out of 4 equal parts!

🎯 **Think of it like pizza:**
If you eat 3 slices out of 4 total slices, you ate 3/4 of the pizza!

📝 **Practice tip:** Always think "part out of total" and fractions become much easier! 🌟`;
    }
    
    if (keyword.includes('algebra') || keyword.includes('solve') || keyword.includes('equation')) {
        return `🔢 Algebra is like being a math detective! Here's how to solve equations:

🎯 **The Golden Rule:**
Whatever you do to one side, do to the other side too!

📚 **Step-by-step process:**
1️⃣ Look at the equation
2️⃣ Get all the x's on one side
3️⃣ Get all the numbers on the other side
4️⃣ Solve for x

✨ **Example:** 2x + 5 = 13
• Subtract 5 from both sides: 2x = 8
• Divide both sides by 2: x = 4
• Check: 2(4) + 5 = 13 ✓

🎉 You're solving puzzles with numbers! Keep practicing! 🌟`;
    }
    
    if (keyword.includes('geometry') || keyword.includes('area') || keyword.includes('shape')) {
        return `📐 Geometry is all about shapes and space! Let's explore:

🎯 **Key shapes to remember:**
• 🔺 Triangle: 3 sides, angles add to 180°
• ⭕ Circle: Area = π × r², Circumference = 2 × π × r
• 🔲 Rectangle: Area = length × width
• 🔳 Square: Area = side × side

✨ **Pro tips:**
• Always draw the shape if you can!
• Look for patterns in similar shapes
• Break complex shapes into simple ones

🎨 **Remember:** Geometry is everywhere - in art, buildings, nature!

📝 Keep practicing and shapes will become your friends! 🌟`;
    }
    
    // General response
    return `🤔 That's a great math question! Let me help you think through this step by step:

🎯 **Problem-solving approach:**
1️⃣ **Understand:** What is the question asking?
2️⃣ **Plan:** What math operation or concept do we need?
3️⃣ **Solve:** Work through it step by step
4️⃣ **Check:** Does our answer make sense?

💡 **Remember:** Every math problem is like a puzzle waiting to be solved!

✨ **Tips for success:**
• Take your time and read carefully
• Show your work step by step  
• Don't be afraid to ask questions
• Practice makes perfect!

🎉 Keep up the great work! You've got this! 🌟

Would you like me to help you with a specific part of this problem?`;
}
