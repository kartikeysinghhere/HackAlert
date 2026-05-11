const client = require('../config/ai');
const { ApiError } = require('../utils/errorHandler');

const generateIdeas = async ({ theme, problem, level, duration, skills }) => {
  const prompt = `You are an expert hackathon mentor. Generate exactly 5 unique project ideas for a hackathon.

Hackathon Theme: ${theme}
Problem Statement: ${problem || 'Not specified'}
Difficulty Level: ${level}
Duration: ${duration} hours
Team Skills: ${skills || 'General programming'}

Return ONLY a valid JSON array in this exact format, no markdown, no explanation:
[
  {
    "title": "Project Name",
    "tagline": "One line description",
    "description": "2-3 sentence description of what it does",
    "tech_stack": ["Tech1", "Tech2", "Tech3"],
    "winning_potential": 85,
    "innovation_score": 90,
    "feasibility_score": 75,
    "wow_factor": "What makes judges love this",
    "mvp_features": ["Feature 1", "Feature 2", "Feature 3"]
  }
]`;

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.8
    });

    const raw = response.choices[0].message.content.trim();
    const clean = raw.replace(/\`\`\`json|\`\`\`/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    throw new ApiError(500, 'Failed to generate ideas: ' + err.message);
  }
};

const analyzeDifficulty = async ({ name, details, skills }) => {
  const prompt = `You are an expert hackathon analyst. Analyze this hackathon and provide a detailed difficulty assessment.

Hackathon Name: ${name || 'Unknown'}
Details/Description: ${details}
User's Skills: ${skills || 'Not specified'}

Return ONLY a valid JSON object, no markdown, no explanation:
{
  "overall_difficulty": "Easy/Medium/Hard/Expert",
  "difficulty_score": 75,
  "required_skills": ["Skill 1", "Skill 2", "Skill 3"],
  "skill_match_percentage": 60,
  "preparation_time_days": 7,
  "winning_chances": "Low/Medium/High/Very High",
  "winning_percentage": 35,
  "key_challenges": ["Challenge 1", "Challenge 2"],
  "advantages": ["Advantage 1", "Advantage 2"],
  "recommended_stack": ["Tech 1", "Tech 2"],
  "preparation_plan": ["Day 1-2: ...", "Day 3-4: ...", "Day 5-7: ..."],
  "verdict": "2-3 sentence overall verdict and recommendation"
}`;

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.3
    });

    const raw = response.choices[0].message.content.trim();
    const clean = raw.replace(/\`\`\`json|\`\`\`/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    throw new ApiError(500, 'Failed to analyze: ' + err.message);
  }
};

module.exports = {
  generateIdeas,
  analyzeDifficulty
};
