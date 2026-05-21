const axios = require('axios');

async function testBot() {
  try {
    const res = await axios.post('http://localhost:3000/ask', {
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'Hello! How are you today?' },
        { role: 'user', content: 'take me to the dashboard' }
      ],
      user_profile: {}
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

testBot();
