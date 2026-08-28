const axios = require('axios');

const FALLBACK_TASKS = [
  {
    title: 'Nghiên cứu và lập kế hoạch',
    description: 'Tìm hiểu yêu cầu, phân tích đề tài và lập kế hoạch chi tiết',
    priority: 'HIGH',
  },
  {
    title: 'Thiết kế và xây dựng',
    description: 'Thiết kế kiến trúc và triển khai các chức năng chính',
    priority: 'MEDIUM',
  },
  {
    title: 'Kiểm thử và hoàn thiện',
    description: 'Kiểm thử, sửa lỗi và hoàn thiện sản phẩm cuối cùng',
    priority: 'LOW',
  },
];

const PROMPT =
  'Hãy chia nhỏ đề tài sau thành 3-5 task con ngắn gọn. Trả về JSON array mỗi phần tử có title, description, priority (LOW/MEDIUM/HIGH). Chỉ trả về JSON, không thêm giải thích.';

function extractJsonArray(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  try {
    const parsed = JSON.parse(cleaned.trim());
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
  }
  const fallbackMatch = text.match(/\[[\s\S]*\]/);
  if (fallbackMatch) {
    try {
      const parsed = JSON.parse(fallbackMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
  }
  return null;
}

function normalizeTasks(parsed) {
  return parsed.map((item) => ({
    title: item.title || 'Untitled Task',
    description: item.description || '',
    priority: ['LOW', 'MEDIUM', 'HIGH'].includes(item.priority) ? item.priority : 'MEDIUM',
  }));
}

async function callClaude(topic, apiKey) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: PROMPT + "\n\nĐề tài: " + topic }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      timeout: 15000,
    }
  );
  let aiText = '';
  if (response.data && Array.isArray(response.data.content)) {
    aiText = response.data.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  } else if (typeof response.data?.content === 'string') {
    aiText = response.data.content;
  }
  const parsed = extractJsonArray(aiText);
  if (parsed && Array.isArray(parsed) && parsed.length > 0) return normalizeTasks(parsed);
  throw new Error('Claude: parse JSON thất bại');
}

async function callGemini(topic, apiKey, model) {
  // ⚡ Dùng gemini-2.0-flash (Model chuẩn, chạy cực nhanh, ổn định 100%)
  const geminiModel = model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: PROMPT + "\n\nĐề tài: " + topic }] }],
    generationConfig: { 
      maxOutputTokens: 2048, // ⚡ Tăng dung lượng output để không bị cắt đứt chuỗi JSON
      temperature: 0.2,      // ⚡ Giảm temp để AI tập trung xuất JSON, không nói nhảm làm chậm
      responseMimeType: "application/json" // ⚡ Ép trả về JSON thuần 100%
    },
  };

  // Hàm gọi API kèm cơ chế Thử lại (Retry) nếu Google quá tải
  const executeRequest = async (retries = 2) => {
    try {
      return await axios.post(url, payload, {
        headers: { 'content-type': 'application/json' },
        timeout: 30000 // ⚡ Timeout 30 giây
      });
    } catch (err) {
      if ((err.response?.status === 503 || err.response?.status === 429) && retries > 0) {
        console.log('Gemini bận, đang tự thử lại sau 2s...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return executeRequest(retries - 1);
      }
      throw err;
    }
  };

  const response = await executeRequest();

  let aiText = '';
  try {
    const candidates = response.data?.candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const parts = candidates[0]?.content?.parts;
      if (Array.isArray(parts)) aiText = parts.map((p) => p.text || '').join('\n');
    }
    if (!aiText && typeof response.data?.text === 'string') aiText = response.data.text;
  } catch (_) { aiText = ''; }

  const parsed = extractJsonArray(aiText);
  if (parsed && Array.isArray(parsed) && parsed.length > 0) return normalizeTasks(parsed);

  throw new Error(`Gemini: parse JSON thất bại. Text nhận được: ${aiText}`);
}
const breakdown = async (req, res) => {
  try {
    const { topic, provider: rawProvider, model } = req.body;
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ message: 'topic là bắt buộc' });
    }
    let provider = (rawProvider || 'auto').toString().trim().toLowerCase();
    if (provider === 'google') provider = 'gemini';
    if (provider === 'anthropic') provider = 'claude';
    if (!['claude', 'gemini', 'auto'].includes(provider)) provider = 'auto';
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const tryProvider = async (p) => {
      if (p === 'gemini' && geminiKey) return await callGemini(topic.trim(), geminiKey, model);
      if (p === 'claude' && claudeKey) return await callClaude(topic.trim(), claudeKey);
      return null;
    };
    if (provider === 'gemini' || provider === 'claude') {
      const keyExists = provider === 'gemini' ? !!geminiKey : !!claudeKey;
      if (!keyExists) return res.json(FALLBACK_TASKS);
      try {
        const result = await tryProvider(provider);
        if (result) return res.json(result);
      } catch (apiError) {
        console.error(provider + ' API error:', apiError.response?.data || apiError.message);
        const fallbackProvider = provider === 'gemini' ? 'claude' : 'gemini';
        const fallbackKey = fallbackProvider === 'gemini' ? geminiKey : claudeKey;
        if (fallbackKey) {
          try {
            const fallbackResult = await tryProvider(fallbackProvider);
            if (fallbackResult) return res.json(fallbackResult);
          } catch (e2) {
            console.error(fallbackProvider + ' fallback error:', e2.response?.data || e2.message);
          }
        }
        return res.json(FALLBACK_TASKS);
      }
      return res.json(FALLBACK_TASKS);
    }
    if (!geminiKey && !claudeKey) return res.json(FALLBACK_TASKS);
    if (geminiKey) {
      try {
        const result = await callGemini(topic.trim(), geminiKey, model);
        return res.json(result);
      } catch (e) {
        console.error('Gemini auto error:', e.response?.data || e.message);
        if (claudeKey) {
          try {
            const claudeResult = await callClaude(topic.trim(), claudeKey);
            return res.json(claudeResult);
          } catch (e2) {
            console.error('Claude fallback error:', e2.response?.data || e2.message);
          }
        }
        return res.json(FALLBACK_TASKS);
      }
    }
    if (claudeKey) {
      try {
        const result = await callClaude(topic.trim(), claudeKey);
        return res.json(result);
      } catch (e) {
        console.error('Claude auto error:', e.response?.data || e.message);
        return res.json(FALLBACK_TASKS);
      }
    }
    return res.json(FALLBACK_TASKS);
  } catch (error) {
    console.error('Breakdown error:', error);
    return res.json(FALLBACK_TASKS);
  }
};

module.exports = { breakdown, FALLBACK_TASKS, extractJsonArray, callClaude, callGemini };
