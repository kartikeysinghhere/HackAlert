const bannedWords = ['fuck', 'shit', 'ass', 'bastard', 'bitch', 'damn', 'crap'];

const censorMessage = (text) => {
  if (!text) return text;
  let censoredText = text;
  bannedWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    censoredText = censoredText.replace(regex, '*'.repeat(word.length));
  });
  return censoredText;
};

module.exports = {
  censorMessage
};
