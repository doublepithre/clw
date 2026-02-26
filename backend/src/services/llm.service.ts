import { env } from '../config/env.js';
import type { CandidateExtractedData, ParsedSearchIntent } from '../types/index.js';

const VERTEX_AI_BASE = `https://${env.VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/locations/${env.VERTEX_AI_LOCATION}/publishers/google/models`;

async function callGemini(prompt: string, systemPrompt?: string): Promise<string> {
  const contents = [];
  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await fetch(`${VERTEX_AI_BASE}/${env.GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${error}`);
  }

  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function extractResumeData(resumeText: string): Promise<CandidateExtractedData> {
  const systemPrompt = `You are an expert resume parser. Extract structured candidate data from the provided resume text. Return valid JSON only.`;

  const prompt = `Extract the following from this resume and return JSON:
{
  "name": "full name",
  "email": "email address",
  "phone": "phone number",
  "location": { "city": "", "state": "", "country": "" },
  "currentTitle": "current job title",
  "currentCompany": "current company",
  "totalExperienceYears": number,
  "seniorityLevel": "intern|junior|mid|senior|lead|principal|executive",
  "summary": "2-3 sentence professional summary",
  "workExperience": [
    {
      "company": "",
      "title": "",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null if current",
      "description": "",
      "highlights": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    { "institution": "", "degree": "", "field": "", "year": number }
  ],
  "skills": [
    { "name": "", "category": "frontend|backend|database|devops|mobile|data|design|soft_skill|other", "years": number_or_null, "proficiency": "beginner|intermediate|advanced|expert" }
  ],
  "certifications": ["cert1"],
  "languages": ["English", "Hindi"],
  "resumeSummaryForEmbedding": "Dense 100-word summary of candidate's key qualifications, skills, experience, and strengths, optimized for semantic search embedding."
}

RESUME TEXT:
${resumeText}`;

  const result = await callGemini(prompt, systemPrompt);
  return JSON.parse(result);
}

export async function parseSearchQuery(queryText: string): Promise<ParsedSearchIntent> {
  const systemPrompt = `You are a search query parser for a recruitment platform. Parse the recruiter's natural language query into structured search intent. Return valid JSON only.`;

  const prompt = `Parse this recruiter search query into structured intent:

Query: "${queryText}"

Return JSON:
{
  "semanticQuery": "optimized semantic search string (expand abbreviations, add synonyms)",
  "filters": {
    "minExperienceYears": number or null,
    "maxExperienceYears": number or null,
    "locationCity": "city or null",
    "locationState": "state or null",
    "requiredSkills": ["skill1"],
    "preferredSkills": ["skill2"],
    "seniority": "senior|mid|junior|lead|principal or null"
  },
  "rankingSignals": {
    "mustHave": ["critical requirement 1"],
    "preferred": ["preferred qualification"],
    "niceToHave": ["bonus qualifications"]
  }
}`;

  const result = await callGemini(prompt, systemPrompt);
  return JSON.parse(result);
}

export async function rerankCandidates(
  query: string,
  parsedIntent: ParsedSearchIntent,
  candidateSummaries: { id: string; summary: string }[]
): Promise<{
  id: string;
  matchScore: number;
  reasoning: string;
  strengths: string[];
  gaps: string[];
  evidence: string[];
}[]> {
  const systemPrompt = `You are an expert recruiter AI. Evaluate candidates against the given job requirements and provide detailed scoring and reasoning. Return valid JSON array only.`;

  const candidatesText = candidateSummaries
    .map((c, i) => `--- Candidate ${i + 1} (ID: ${c.id}) ---\n${c.summary}`)
    .join('\n\n');

  const prompt = `Evaluate these candidates for the following search:

QUERY: "${query}"
REQUIREMENTS: ${JSON.stringify(parsedIntent.rankingSignals)}

CANDIDATES:
${candidatesText}

For each candidate, return a JSON array:
[
  {
    "id": "candidate_id",
    "matchScore": 0-100,
    "reasoning": "1-2 sentence explanation of overall fit",
    "strengths": ["strength 1", "strength 2"],
    "gaps": ["gap 1"],
    "evidence": ["specific evidence from resume"]
  }
]

Score strictly: 90+ exceptional fit, 70-89 good fit, 50-69 partial fit, <50 weak fit.`;

  const result = await callGemini(prompt, systemPrompt);
  return JSON.parse(result);
}
