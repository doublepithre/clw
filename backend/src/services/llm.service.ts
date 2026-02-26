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

/**
 * Extract structured candidate data from resume content.
 *
 * The input `resumeContent` is structured Markdown from Docling (not flat text).
 * This means it has:
 * - Headings (##) marking sections like "Work Experience", "Education", "Skills"
 * - Formatted tables for skills grids
 * - Proper reading order even for multi-column layouts
 *
 * This dramatically improves extraction accuracy because the LLM can rely on
 * document structure rather than guessing section boundaries from flat text.
 */
export async function extractResumeData(resumeContent: string): Promise<CandidateExtractedData> {
  const systemPrompt = `You are an expert resume parser. You will receive a resume in structured Markdown format (produced by an AI document parser). The markdown preserves the original document structure with headings, sections, and tables. Use this structure to accurately extract candidate data. Return valid JSON only.`;

  const prompt = `Extract structured candidate data from this resume. The input is structured Markdown where headings (##) indicate sections, tables use pipe syntax, and reading order is preserved.

IMPORTANT extraction rules:
- Infer totalExperienceYears by calculating from work history dates if not explicitly stated.
- For skills, extract BOTH explicitly listed skills AND skills mentioned in work experience descriptions.
- Estimate proficiency from context: if someone "led" or "architected" with a skill → expert; "worked with" → intermediate.
- For seniorityLevel, infer from title hierarchy and years of experience.
- The resumeSummaryForEmbedding should be a dense, keyword-rich 100-150 word summary optimized for vector search. Include: role titles, key skills, industries, notable companies, achievements, and certifications.

Return this exact JSON structure:
{
  "name": "full name",
  "email": "email address or null",
  "phone": "phone number or null",
  "location": { "city": "city or null", "state": "state or null", "country": "country or null" },
  "currentTitle": "most recent job title",
  "currentCompany": "most recent company",
  "totalExperienceYears": number,
  "seniorityLevel": "intern|junior|mid|senior|lead|principal|executive",
  "summary": "2-3 sentence professional summary capturing the candidate's core value proposition",
  "workExperience": [
    {
      "company": "company name",
      "title": "job title",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or null if current",
      "description": "1-2 sentence role description",
      "highlights": ["quantified achievement 1", "quantified achievement 2"]
    }
  ],
  "education": [
    { "institution": "school name", "degree": "degree type", "field": "field of study", "year": graduation_year_number_or_null }
  ],
  "skills": [
    { "name": "skill name", "category": "frontend|backend|database|devops|cloud|mobile|data|ml|design|pm|soft_skill|other", "years": years_number_or_null, "proficiency": "beginner|intermediate|advanced|expert" }
  ],
  "certifications": ["certification name with issuer"],
  "languages": ["language (proficiency level)"],
  "resumeSummaryForEmbedding": "Dense 100-150 word summary: [Name] is a [seniority] [role] with [X] years of experience in [domains]. Expert in [top skills]. Previously at [notable companies]. Key achievements include [top 2-3 quantified achievements]. Holds [degree] from [school]. Certified in [certs]. Based in [location]."
}

RESUME (Structured Markdown):
${resumeContent}`;

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
