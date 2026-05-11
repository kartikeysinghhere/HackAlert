const bannedWords = ['fuck', 'shit', 'ass', 'bastard', 'bitch', 'damn', 'crap', 'nigger', 'faggot', 'retard'];

/**
 * Profanity Moderation Architecture
 * Centralized way to check and censor messages.
 */
const profanityModerator = {
  hasProfanity: (text) => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return bannedWords.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        return regex.test(lowerText);
    });
  },

  censor: (text) => {
    if (!text) return text;
    let censoredText = text;
    bannedWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      censoredText = censoredText.replace(regex, '*'.repeat(word.length));
    });
    return censoredText;
  },

  middleware: (req, res, next) => {
    const { message, messages } = req.body;

    if (message) {
      req.body.message = profanityModerator.censor(message);
    }

    if (messages && Array.isArray(messages)) {
      req.body.messages = messages.map(msg => ({
        ...msg,
        content: profanityModerator.censor(msg.content)
      }));
    }

    next();
  }
};

module.exports = profanityModerator;
