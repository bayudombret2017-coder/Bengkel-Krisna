
import { GoogleGenAI } from "@google/genai";
import { Product } from "../types.ts";

export const getGeminiResponse = async (userPrompt: string, products: Product[]) => {
  // Gunakan API key dari process.env jika ada
  const apiKey = (window as any).process?.env?.API_KEY || "";
  
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  const productContext = products.map(p => 
    `- Merk: ${p.brand}, Kode/Model: ${p.code}, Ukuran: ${p.size}, Ring: R${p.ring}, Stok: ${p.stock > 0 ? p.stock + ' Unit' : 'KOSONG'}`
  ).join('\n');

  const systemPrompt = `
    Anda adalah "Asisten Ahli Ban Karya Makmur". 
    Anda bertugas membantu pelanggan menemukan ban yang tepat di gudang Karya Makmur.
    
    ATURAN:
    1. Selalu ramah, profesional, dan gunakan Bahasa Indonesia.
    2. Fokus pada data gudang yang diberikan.
    3. Lokasi: Lampung Timur.

    DATA GUDANG:
    ${productContext}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    return response.text || "Database sedang sibuk.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Maaf, fitur asisten AI memerlukan konfigurasi API Key.";
  }
};
