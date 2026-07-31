/**
 * due-dates plugin — extracts due dates from card descriptions.
 *
 * Supports two formats:
 *   due:YYYY-MM-DD  (keyword)
 *   📅 YYYY-MM-DD    (emoji, with optional whitespace)
 *
 * Stores as card.dueDate (ISO string). The UI renders overdue/soon
 * indicators based on this field.
 */
module.exports = {
  name: 'due-dates',

  parseCard(card) {
    if (!card.description) return card;
    // Match both due:YYYY-MM-DD and 📅 YYYY-MM-DD (with optional space after emoji)
    const match = card.description.match(/(?:due:|📅\s*)(\d{4}-\d{2}-\d{2})/i);
    if (match) {
      card.dueDate = match[1];
      // Don't strip from description — rawLine already contains it and
      // stripping would cause cardHasChanged to rewrite the line without it.
    }
    return card;
  },

  /** No-op — due: / 📅 is already embedded in rawLine/description. */
  serializeCard(card, line) {
    return line;
  },
};
