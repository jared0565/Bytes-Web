const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: [{ role: 'user', parts: [{ text: 'hi' }] }]
        });
        const res = await chat.sendMessage({ message: 'hi' });
        console.log(res);
    } catch (e) {
        console.error(e);
    }
}
run();
