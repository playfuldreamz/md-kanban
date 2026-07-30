/**
 * due-dates plugin — extracts due:YYYY-MM-DD from card descriptions.
 *
 * Stores as card.dueDate (ISO string). The UI renders overdue/soon
 * indicators based on this field.
 */
module.exports = {
  name: 'due-dates',

  parseCard(card) {
    if (!card.description) return card;
    const match = card.description.match(/due:(\d{4}-\d{2}-\d{2})/i);
    if (match) {
      card.dueDate = match[1];
      // Don't strip from description — rawLine already contains it and
      // stripping would cause cardHasChanged to rewrite the line without it.
    }
    return card;
  },

  /** No-op — due: is already embedded in rawLine/description. */
  serializeCard(card, line) {
    return line;
  },
};
